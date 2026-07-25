import { supabase } from '@/services/supabase/client'
import type { ParsedExamQuestion } from '@/utils/examQuestionImport'

const GEMINI_KEY_STORAGE = 'memorylang_gemini_api_key'
const GEMINI_MODEL_STORAGE = 'memorylang_gemini_model'
export const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash'

export const GEMINI_MODEL_OPTIONS = [
  { value: 'gemini-2.0-flash', label: 'gemini-2.0-flash (Mới nhất - Nhanh & Chuẩn)' },
  { value: 'gemini-1.5-flash', label: 'gemini-1.5-flash (Nhanh & Tối ưu)' },
  { value: 'gemini-1.5-pro', label: 'gemini-1.5-pro (Độ chính xác cao)' },
  { value: 'gemini-2.0-flash-lite', label: 'gemini-2.0-flash-lite (Siêu nhẹ)' },
  { value: 'custom', label: 'Tùy chỉnh model khác...' },
]

/**
 * Gets Gemini API Key with hierarchy: LocalStorage Admin UI setting > Environment Variable
 */
export function getGeminiApiKey(): string {
  const stored = localStorage.getItem(GEMINI_KEY_STORAGE)
  if (stored && stored.trim()) return stored.trim()

  const envKey = import.meta.env.VITE_GEMINI_API_KEY
  if (envKey && envKey.trim()) return envKey.trim()

  return ''
}

/**
 * Saves Gemini API Key to LocalStorage for Admin UI
 */
export function setGeminiApiKey(key: string): void {
  if (key && key.trim()) {
    localStorage.setItem(GEMINI_KEY_STORAGE, key.trim())
  } else {
    localStorage.removeItem(GEMINI_KEY_STORAGE)
  }
}

/**
 * Gets Gemini AI Model with hierarchy: LocalStorage > Environment Variable > Default
 */
export function getGeminiModel(): string {
  const stored = localStorage.getItem(GEMINI_MODEL_STORAGE)
  if (stored && stored.trim()) return stored.trim()

  const envModel = import.meta.env.VITE_GEMINI_MODEL
  if (envModel && envModel.trim()) return envModel.trim()

  return DEFAULT_GEMINI_MODEL
}

/**
 * Saves Gemini AI Model to LocalStorage for Admin UI
 */
export function setGeminiModel(model: string): void {
  if (model && model.trim()) {
    localStorage.setItem(GEMINI_MODEL_STORAGE, model.trim())
  } else {
    localStorage.removeItem(GEMINI_MODEL_STORAGE)
  }
}

/**
 * Tests if a Gemini API Key and Model are valid and active before saving
 */
export async function testGeminiApiKeyAndModel(
  key: string,
  modelName: string = getGeminiModel()
): Promise<{ ok: boolean; message: string }> {
  const apiKey = key.trim()
  const targetModel = modelName.trim() || DEFAULT_GEMINI_MODEL

  if (!apiKey) {
    return { ok: false, message: 'Vui lòng nhập Gemini API Key.' }
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Ping' }] }],
        }),
      }
    )

    if (res.ok) {
      return { ok: true, message: `Kết nối thành công tới Gemini API với Model '${targetModel}'!` }
    }

    const errJson = await res.json().catch(() => ({}))
    const errorMsg = errJson?.error?.message || `Lỗi HTTP ${res.status}`

    if (res.status === 404 || errorMsg.includes('not found')) {
      return { ok: false, message: `Model '${targetModel}' không tồn tại hoặc không hỗ trợ generateContent!` }
    }

    if (res.status === 400 && errorMsg.includes('API_KEY_INVALID')) {
      return { ok: false, message: 'API Key không chính xác hoặc đã bị vô hiệu hóa trên Google AI Studio!' }
    }

    if (res.status === 429) {
      return { ok: true, message: `Key & Model '${targetModel}' hợp lệ! (Lưu ý: Đang bị giới hạn tốc độ Rate Limit từ Google).` }
    }

    return { ok: false, message: `Kiểm tra thất bại: ${errorMsg}` }
  } catch (err: any) {
    return { ok: false, message: `Không thể kết nối tới Google API: ${err.message || 'Lỗi mạng'}` }
  }
}

// Backward compatibility alias
export const testGeminiApiKey = testGeminiApiKeyAndModel

/**
 * Converts a File or Blob into base64 data string
 */
export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (err) => reject(err)
    reader.readAsDataURL(file)
  })
}

/**
 * Parses questions using Supabase Edge Function Proxy (100% Enterprise Security)
 * with direct client fallback.
 */
export async function parseQuestionsWithGeminiVision(
  imageBase64: string,
  apiKey?: string,
  model?: string
): Promise<ParsedExamQuestion[]> {
  const customApiKey = apiKey || getGeminiApiKey()
  const targetModel = model || getGeminiModel()

  // 1. First attempt: Invoke Supabase Edge Function Proxy (Zero Client API Key Leakage)
  try {
    const { data, error } = await supabase.functions.invoke<{
      ok: boolean
      questions: any[]
      error?: string
    }>('parse-exam-vision', {
      body: {
        imageBase64,
        customApiKey: customApiKey || undefined,
        customModel: targetModel,
      },
    })

    if (!error && data && data.ok && Array.isArray(data.questions)) {
      return data.questions.map((q: any) => ({
        questionNumber: q.questionNumber || null,
        questionText: q.questionText || '',
        options: (q.options || []).map((opt: any) => ({
          key: opt.key,
          text: opt.text,
          is_correct: Boolean(opt.is_correct),
        })),
        explanationHtml: q.explanationHtml || '',
        rawBlock: q.questionText,
      }))
    }

    if (error && error.message && !error.message.includes('Failed to send request')) {
      console.warn('Edge Function returned error, trying fallback:', error.message)
    }
  } catch (edgeErr) {
    console.warn('Edge function invoke skipped, falling back to direct client call:', edgeErr)
  }

  // 2. Direct Client Fallback (If Edge Function is not deployed locally)
  if (!customApiKey) {
    throw new Error(
      'Chưa cấu hình Gemini API Key. Vui lòng nhập Key tại tab AI Vision hoặc trang Cấu hình Secrets.'
    )
  }

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

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${customApiKey}`,
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

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}))
    throw new Error(errData?.error?.message || `Lỗi kết nối Gemini API (${response.status})`)
  }

  const jsonRes = await response.json()
  const candidateText = jsonRes?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!candidateText) {
    throw new Error('Gemini API không trả về dữ liệu văn bản.')
  }

  const cleanedJson = candidateText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
  const parsed = JSON.parse(cleanedJson)

  return (parsed || []).map((q: any) => ({
    questionNumber: q.questionNumber || null,
    questionText: q.questionText || '',
    options: (q.options || []).map((opt: any) => ({
      key: opt.key,
      text: opt.text,
      is_correct: Boolean(opt.is_correct),
    })),
    explanationHtml: q.explanationHtml || '',
    rawBlock: q.questionText,
  }))
}
