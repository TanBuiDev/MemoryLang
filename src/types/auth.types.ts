import type { LanguageCode } from '@/types/language.types'
import type { StudyMode } from '@/types/study.types'

export type UiLanguageCode = 'vi' | 'en'

export interface Profile {
  id: string
  display_name: string | null
  native_language: LanguageCode
  current_target_language: LanguageCode
  ui_language: UiLanguageCode
  onboarding_completed: boolean
  password_set: boolean
  daily_goal?: number
  default_study_mode?: StudyMode
  created_at: string
  updated_at: string
}
