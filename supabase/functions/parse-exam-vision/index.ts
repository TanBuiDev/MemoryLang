import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.4'
import { z } from 'https://esm.sh/zod@4.4.3'

const DEFAULT_MODEL = 'gemini-2.0-flash'
const REQUEST_TIMEOUT_MS = 30_000
const requestSchema = z.object({
  imageBase64: z.string().max(7_000_000).regex(/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=\s]+$/),
})

type CandidateKey = {
  id?: string
  key_name: string
  encrypted_value: string
  model_name: string
}

function corsHeaders(req: Request) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

function response(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )
}

function getSupabaseUser(authHeader: string) {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  )
}

function getSessionId(authHeader: string) {
  try {
    const payload = JSON.parse(atob(authHeader.replace(/^Bearer\s+/i, '').split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.session_id === 'string' ? payload.session_id : null
  } catch { return null }
}

const prompt = `You are an expert TOEIC / English exam parsing assistant.
Analyze this exam image. Extract ALL questions and choices (A, B, C, D) visible in the image, even if arranged in 2 columns.
Also determine the CORRECT answer choice (A, B, C, or D) for each question based on English grammar and context.

Return ONLY a valid JSON array of objects with this exact format:
[
  {
    "questionNumber": 101,
    "questionText": "The lecture will take place at 6:00 P.M., ------- which attendees may ask questions.",
    "options": [
      { "key": "A", "text": "across", "is_correct": false },
      { "key": "B", "text": "after", "is_correct": true },
      { "key": "C", "text": "inside", "is_correct": false },
      { "key": "D", "text": "among", "is_correct": false }
    ],
    "explanationHtml": "Giải thích chi tiết bằng Tiếng Việt..."
  }
]`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return response(req, { ok: false, error: 'Only POST is supported.' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return response(req, { ok: false, error: 'Unauthorized.' }, 401)

  const supabaseUser = getSupabaseUser(authHeader)
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
  if (authError || !user) return response(req, { ok: false, error: 'Unauthorized.' }, 401)

  const sessionId = getSessionId(authHeader)
  const [{ data: permitted, error: permissionError }, { data: activeSession, error: sessionError }] = await Promise.all([
    supabaseUser.rpc('has_permission', { p_permission_code: 'exam_import.run' }),
    sessionId ? supabaseUser.rpc('is_admin_session_active', { p_auth_session_id: sessionId }) : Promise.resolve({ data: false, error: null }),
  ])
  if (permissionError || sessionError || !permitted || !activeSession) return response(req, { ok: false, error: 'Forbidden.' }, 403)

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return response(req, { ok: false, error: 'Invalid JSON request body.' }, 400)
  }
  const parsed = requestSchema.safeParse(rawBody)
  if (!parsed.success) return response(req, { ok: false, error: 'Invalid image payload.' }, 400)

  const supabaseAdmin = getSupabaseAdmin()
  const { data: dbPoolKeys, error: keyPoolError } = await supabaseAdmin.rpc('get_active_keys_for_service', {
    p_purpose_tag: 'ai_vision',
  })
  if (keyPoolError || !Array.isArray(dbPoolKeys) || dbPoolKeys.length === 0) {
    console.error('parse-exam-vision key pool unavailable', { userId: user.id, message: keyPoolError?.message })
    return response(req, { ok: false, error: 'AI Vision is not configured.' }, 503)
  }

  const candidates: CandidateKey[] = dbPoolKeys.map((key) => ({
    id: key.id,
    key_name: key.key_name,
    encrypted_value: key.encrypted_value,
    model_name: key.model_name || DEFAULT_MODEL,
  }))
  const cleanBase64 = parsed.data.imageBase64.replace(/^data:image\/\w+;base64,/, '').replace(/\s/g, '')
  const mimeType = parsed.data.imageBase64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg'
  let lastStatusCode = 503

  for (const candidate of candidates) {
    const startedAt = Date.now()
    const model = candidate.model_name.trim().replace(/^models\//i, '') || DEFAULT_MODEL
    try {
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${candidate.encrypted_value}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType, data: cleanBase64 } }] }],
            generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
          }),
        },
      )
      const responseTimeMs = Date.now() - startedAt
      lastStatusCode = geminiResponse.status

      if (!geminiResponse.ok) {
        if (candidate.id) {
          await supabaseAdmin.rpc('record_key_execution_outcome', {
            p_key_id: candidate.id,
            p_status_code: geminiResponse.status,
            p_response_time_ms: responseTimeMs,
            p_error_msg: `Gemini request failed with HTTP ${geminiResponse.status}`,
          })
        }
        await supabaseAdmin.from('admin_key_usage_logs').insert({
          key_name: candidate.key_name,
          service_name: 'parse-exam-vision',
          model_used: model,
          status_code: geminiResponse.status,
          response_time_ms: responseTimeMs,
          error_message: `Gemini request failed with HTTP ${geminiResponse.status}`,
        })
        continue
      }

      const providerResponse = await geminiResponse.json()
      const candidateText = providerResponse?.candidates?.[0]?.content?.parts?.[0]?.text
      if (!candidateText) {
        lastStatusCode = 502
        continue
      }
      const questions = JSON.parse(candidateText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim())
      if (!Array.isArray(questions)) {
        lastStatusCode = 502
        continue
      }

      if (candidate.id) {
        await supabaseAdmin.rpc('record_key_execution_outcome', {
          p_key_id: candidate.id,
          p_status_code: 200,
          p_response_time_ms: responseTimeMs,
        })
      }
      await supabaseAdmin.from('admin_key_usage_logs').insert({
        key_name: candidate.key_name,
        service_name: 'parse-exam-vision',
        model_used: model,
        status_code: 200,
        response_time_ms: responseTimeMs,
      })
      return response(req, { ok: true, questions })
    } catch (error) {
      lastStatusCode = 502
      console.error('parse-exam-vision provider request failed', {
        userId: user.id,
        keyName: candidate.key_name,
        message: error instanceof Error ? error.message : 'unknown',
      })
    }
  }

  return response(req, { ok: false, error: 'AI Vision could not process this image.' }, lastStatusCode)
})
