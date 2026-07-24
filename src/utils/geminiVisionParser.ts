import type { ParsedExamQuestion } from '@/utils/examQuestionImport'

const GEMINI_KEY_STORAGE = 'memorylang_gemini_api_key'

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
 * Calls Gemini Vision API to analyze exam image, parse questions, choices, and correct answers
 */
export async function parseQuestionsWithGeminiVision(
  imageBase64: string,
  apiKey?: string
): Promise<ParsedExamQuestion[]> {
  const keyToUse = apiKey || getGeminiApiKey()
  if (!keyToUse) {
    throw new Error('Chưa cấu hình Gemini API Key. Vui lòng nhập Key tại tab AI Vision hoặc trang Cấu hình Secrets.')
  }

  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '')
  const isPng = imageBase64.startsWith('data:image/png')
  const mimeType = isPng ? 'image/png' : 'image/jpeg'

  const prompt = `You are an expert TOEIC / English exam parsing assistant.
Analyze this exam image. Extract ALL questions and choices (A, B, C, D) visible in the image, even if they are arranged in 2 columns.
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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${keyToUse}`,
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
