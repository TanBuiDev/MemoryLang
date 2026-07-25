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

interface CandidateKey {
  id?: string
  key_name: string
  encrypted_value: string
  model_name: string
  priority_order?: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageBase64, customApiKey, customModel } = await req.json()

    if (!imageBase64) {
      return new Response(JSON.stringify({ ok: false, error: 'Vui lòng cung cấp dữ liệu hình ảnh (imageBase64)' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // 1. Fetch Multi-Key Candidates from DB Vault Pool (Purpose: 'ai_vision')
    let candidates: CandidateKey[] = []
    try {
      const { data: dbPoolKeys } = await supabaseAdmin.rpc('get_active_keys_for_service', {
        p_purpose_tag: 'ai_vision',
      })

      if (dbPoolKeys && Array.isArray(dbPoolKeys) && dbPoolKeys.length > 0) {
        candidates = dbPoolKeys.map((k: any) => ({
          id: k.id,
          key_name: k.key_name,
          encrypted_value: k.encrypted_value,
          model_name: customModel || k.model_name || 'gemini-2.0-flash',
        }))
      }
    } catch (poolErr) {
      console.warn('Could not fetch candidate keys from Pool RPC:', poolErr)
    }

    // Fallback if no keys in pool
    if (candidates.length === 0) {
      const fallbackKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('VITE_GEMINI_API_KEY') || customApiKey
      if (fallbackKey) {
        candidates.push({
          key_name: 'Environment / Client Key',
          encrypted_value: fallbackKey,
          model_name: customModel || Deno.env.get('GEMINI_MODEL') || 'gemini-2.0-flash',
        })
      }
    }

    if (candidates.length === 0) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Chưa có Gemini API Key nào sẵn sàng trong Key Pool Vault. Vui lòng vào trang Quản lý Key (/app/admin/secrets) để thêm API Key mới.',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // 2. Clean base64 and determine MIME type
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

    let lastErrorMsg = ''
    let lastStatusCode = 500

    // 3. MULTI-KEY FAILOVER ENGINE LOOP
    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i]
      const callStart = Date.now()
      const apiKey = candidate.encrypted_value
      const rawModel = candidate.model_name || 'gemini-2.0-flash'
      const model = rawModel.trim().replace(/^models\//i, '')

      try {
        console.log(`[Failover Engine] Attempting Key ${i + 1}/${candidates.length}: ${candidate.key_name} (${model})`)

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

        const callDuration = Date.now() - callStart

        if (!geminiResponse.ok) {
          const errJson = await geminiResponse.json().catch(() => ({}))
          lastStatusCode = geminiResponse.status
          lastErrorMsg = errJson?.error?.message || `Google API Error (${geminiResponse.status})`

          console.warn(`[Failover Engine] Key ${candidate.key_name} failed with HTTP ${lastStatusCode}: ${lastErrorMsg}`)

          // Record execution failure outcome in DB (Auto status management: rate_limited / disabled)
          if (candidate.id) {
            void supabaseAdmin.rpc('record_key_execution_outcome', {
              p_key_id: candidate.id,
              p_status_code: lastStatusCode,
              p_response_time_ms: callDuration,
              p_error_msg: lastErrorMsg,
            })
          }

          // Log failure analytics
          void supabaseAdmin.from('admin_key_usage_logs').insert({
            key_name: candidate.key_name,
            service_name: 'parse-exam-vision',
            model_used: model,
            status_code: lastStatusCode,
            response_time_ms: callDuration,
            error_message: lastErrorMsg,
          })

          // FAILOVER: Proceed to next key in pool!
          continue
        }

        const jsonRes = await geminiResponse.json()
        const candidateText = jsonRes?.candidates?.[0]?.content?.parts?.[0]?.text

        if (!candidateText) {
          lastStatusCode = 500
          lastErrorMsg = 'Gemini API did not return text response'
          continue
        }

        const cleanedJson = candidateText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
        const questions = JSON.parse(cleanedJson)

        // SUCCESS: Record successful outcome in DB
        if (candidate.id) {
          void supabaseAdmin.rpc('record_key_execution_outcome', {
            p_key_id: candidate.id,
            p_status_code: 200,
            p_response_time_ms: callDuration,
          })
        }

        // Log success analytics
        void supabaseAdmin.from('admin_key_usage_logs').insert({
          key_name: candidate.key_name,
          service_name: 'parse-exam-vision',
          model_used: model,
          status_code: 200,
          response_time_ms: callDuration,
        })

        // Return successful response to Client
        return new Response(
          JSON.stringify({ ok: true, questions }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      } catch (keyErr: any) {
        console.warn(`[Failover Engine] Key ${candidate.key_name} exception:`, keyErr.message)
        lastErrorMsg = keyErr.message
        continue
      }
    }

    // All keys in pool failed: return JSON error payload
    return new Response(
      JSON.stringify({
        ok: false,
        error: `Tất cả ${candidates.length} Key trong Pool đều thất bại. Lỗi từ Google API (${lastStatusCode}): ${lastErrorMsg}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err: any) {
    console.error('parse-exam-vision global error:', err.message)
    return new Response(
      JSON.stringify({ ok: false, error: err.message || 'Internal server error' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
