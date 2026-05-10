export type LanguageCode = 'vi' | 'en' | 'ko' | 'ja' | 'zh' | 'fr' | 'de' | 'other'

export interface LanguageProfile {
  id: string
  user_id: string
  native_language: LanguageCode
  target_language: LanguageCode
  level: string | null
  goal: string | null
  daily_goal: number
  created_at: string
}
