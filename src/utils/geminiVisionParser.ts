import { supabase } from '@/services/supabase/client'
import type { ParsedExamQuestion } from '@/utils/examQuestionImport'

export const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash'

/**
 * Clean legacy local storage items to enforce zero-leakage security policy
 */
export function cleanupLegacyLocalStorageSecrets(): void {
  try {
    localStorage.removeItem('memorylang_gemini_api_key')
    localStorage.removeItem('memorylang_gemini_model')
  } catch {
    // ignore
  }
}

// Auto-run cleanup on module load
cleanupLegacyLocalStorageSecrets()

/**
 * Tests if a Gemini API Key and Model are valid and active before saving to DB Vault
 */
export async function testGeminiApiKeyAndModel(
  key: string,
  modelName: string = DEFAULT_GEMINI_MODEL
): Promise<{ ok: boolean; message: string }> {
  const apiKey = key.trim()
  const targetModel = modelName.trim().replace(/^models\//i, '') || DEFAULT_GEMINI_MODEL

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

    if (res.status === 429) {
      return {
        ok: true,
        message: `Key & Model '${targetModel}' hợp lệ! (Lưu ý: Key vừa chạm Rate Limit từ Google: ${errorMsg}).`,
      }
    }

    return {
      ok: false,
      message: `Google API từ chối (Lỗi ${res.status}): ${errorMsg}`,
    }
  } catch (err: any) {
    return { ok: false, message: `Không thể kết nối tới Google API: ${err.message || 'Lỗi mạng'}` }
  }
}

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
 */
export async function parseQuestionsWithGeminiVision(
  imageBase64: string,
  customApiKey?: string,
  customModel?: string
): Promise<ParsedExamQuestion[]> {
  const { data, error } = await supabase.functions.invoke<{
    ok: boolean
    questions: any[]
    error?: string
  }>('parse-exam-vision', {
    body: {
      imageBase64,
      customApiKey: customApiKey || undefined,
      customModel: customModel || undefined,
    },
  })

  if (error) {
    let detailedMsg = error.message
    try {
      if (error.context && typeof error.context.json === 'function') {
        const body = await error.context.json()
        if (body?.error) detailedMsg = body.error
      }
    } catch {
      // ignore
    }
    throw new Error(detailedMsg || 'Không thể kết nối dịch vụ bóc tách đề thi AI Vision.')
  }

  if (!data || !data.ok || !Array.isArray(data.questions)) {
    throw new Error(data?.error || 'Dịch vụ AI Vision không trả về dữ liệu câu hỏi hợp lệ.')
  }

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
