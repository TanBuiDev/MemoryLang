import type { LanguageCode } from '@/types/language.types'

export const languageOptions: Array<{ code: LanguageCode; label: string }> = [
  { code: 'vi', label: 'Vietnamese' },
  { code: 'en', label: 'English' },
  { code: 'ko', label: 'Korean' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh', label: 'Chinese' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'other', label: 'Other' },
]

export const levels = ['Beginner', 'Elementary', 'Intermediate', 'Upper Intermediate', 'Advanced']
export const goals = ['Daily communication', 'Interview', 'Travel', 'Academic', 'IELTS/TOEIC', 'Business', 'IT vocabulary', 'Custom']

const ttsCodeMap: Record<string, string> = {
  vi: 'vi-VN',
  en: 'en-US',
  ko: 'ko-KR',
  ja: 'ja-JP',
  zh: 'zh-CN',
  fr: 'fr-FR',
  de: 'de-DE',
}

export function languageToTtsCode(lang: LanguageCode): string | null {
  return ttsCodeMap[lang] ?? null
}
