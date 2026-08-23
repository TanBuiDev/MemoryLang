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
  is_admin?: boolean
  allow_password_login?: boolean
  email?: string | null
  avatar_url?: string | null
  last_active_at?: string | null
  daily_goal?: number
  default_study_mode?: StudyMode
  email_reminders_enabled?: boolean
  weekly_digest_enabled?: boolean
  last_reminder_sent_at?: string | null
  inactivity_paused?: boolean
  created_at: string
  updated_at: string
}
