import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  let statusCode = 200
  let errorMessage: string | null = null
  let usedApiKey = ''
  let usedModel = 'gemini-2.0-flash'

  try {
    const { imageBase64, customApiKey, customModel } = await req.json()

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'Missing imageBase64 parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // 1. Resolve Gemini API Key (Priority: Deno Env > DB Vault > Request Payload)
    let apiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('VITE_GEMINI_API_KEY') || customApiKey

    if (!apiKey) {
      try {
        const { data: dbSecret } = await supabaseAdmin
          .from('admin_system_secrets')
          .select('encrypted_value')
          .eq('key_name', 'GEMINI_API_KEY')
          .maybeSingle()

        if (dbSecret && dbSecret.encrypted_value) {
          apiKey = dbSecret.encrypted_value
        }
      } catch (dbErr) {
        console.warn('Could not fetch secret from DB vault:', dbErr)
      }
    }

    // 2. Resolve Gemini Model (Priority: Request Payload > DB Default Model > Fallback)
    let model = customModel || Deno.env.get('GEMINI_MODEL')

    if (!model) {
      try {
        const { data: defaultModel } = await supabaseAdmin
          .from('ai_model_configs')
          .select('model_name')
          .eq('is_default', true)
          .eq('is_active', true)
          .maybeSingle()

        if (defaultModel && defaultModel.model_name) {
          model = defaultModel.model_name
        }
      } catch (dbErr) {
        console.warn('Could not fetch default model from DB:', dbErr)
      }
    }

    if (!model) model = 'gemini-2.0-flash'

    usedApiKey = apiKey ? 'GEMINI_API_KEY' : 'UNCONFIGURED'
    usedModel = model

    if (!apiKey) {
      statusCode = 400
      errorMessage = 'Chưa cấu hình GEMINI_API_KEY trong Database Vault hoặc Secrets.'
      return new Response(
        JSON.stringify({ error: errorMessage }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // 3. Clean base64 and determine MIME type
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')
    const isPng = imageBase64.startsWith('data:image/png')
    const mimeType = isPng ? 'image/png' : 'image/jpeg'

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

    // 4. Securely invoke Google Gemini Vision API from Backend
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType,
                    data: cleanBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
      }
    )

    if (!geminiResponse.ok) {
      const errJson = await geminiResponse.json().catch(() => ({}))
      statusCode = geminiResponse.status
      errorMessage = errJson?.error?.message || `Google Gemini API Error (${geminiResponse.status})`
      throw new Error(errorMessage || 'Gemini API Error')
    }

    const jsonRes = await geminiResponse.json()
    const candidateText = jsonRes?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!candidateText) {
      statusCode = 500
      errorMessage = 'Gemini API did not return text response'
      throw new Error(errorMessage)
    }

    const cleanedJson = candidateText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    const questions = JSON.parse(cleanedJson)

    // Log key usage analytics silently
    try {
      await supabaseAdmin.from('admin_key_usage_logs').insert({
        key_name: usedApiKey,
        service_name: 'parse-exam-vision',
        model_used: usedModel,
        status_code: 200,
        response_time_ms: Date.now() - startTime,
      })
    } catch {
      // ignore logging errors
    }

    return new Response(
      JSON.stringify({ ok: true, questions }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err: any) {
    console.error('parse-exam-vision error:', err.message)
    const timeMs = Date.now() - startTime
    statusCode = statusCode !== 200 ? statusCode : 500
    errorMessage = err.message || 'Internal server error'

    // Log failure analytics
    try {
      const supabaseAdmin = getSupabaseAdmin()
      await supabaseAdmin.from('admin_key_usage_logs').insert({
        key_name: usedApiKey || 'GEMINI_API_KEY',
        service_name: 'parse-exam-vision',
        model_used: usedModel,
        status_code: statusCode,
        response_time_ms: timeMs,
        error_message: errorMessage,
      })
    } catch {
      // ignore logging errors
    }

    return new Response(
      JSON.stringify({ ok: false, error: errorMessage }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
