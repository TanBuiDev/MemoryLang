import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Only POST method is supported' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 1. Verify Supabase Auth Session
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Missing authorization header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )

  const {
    data: { user },
    error: authError,
  } = await supabaseUser.auth.getUser()

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Invalid user session' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { imageBase64, customApiKey } = await req.json()

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'Missing imageBase64 parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Resolve Gemini API Key (Priority: Deno Env Secret > Client custom key)
    const apiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('VITE_GEMINI_API_KEY') || customApiKey

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            'Chưa cấu hình GEMINI_API_KEY trên Supabase Edge Function Secrets hoặc Admin Key UI.',
        }),
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
    "explanationHtml": "Giải thích chi tiết bằng tiếng Việt..."
  }
]`

    // 4. Securely invoke Google Gemini Vision API from Backend
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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
      throw new Error(errJson?.error?.message || `Google Gemini API Error (${geminiResponse.status})`)
    }

    const jsonRes = await geminiResponse.json()
    const candidateText = jsonRes?.candidates?.[0]?.content?.parts?.[0]?.text

    if (!candidateText) {
      throw new Error('Gemini API did not return text response')
    }

    const cleanedJson = candidateText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    const questions = JSON.parse(cleanedJson)

    return new Response(JSON.stringify({ ok: true, questions }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('parse-exam-vision error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
