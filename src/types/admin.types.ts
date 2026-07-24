export interface AppSetting {
  key: string
  value: any
  description: string | null
  updated_at: string
  updated_by: string | null
}

export interface TtsVoiceConfig {
  language_code: string
  voice_name: string
  speaking_rate: number
  pitch: number
  audio_encoding: 'MP3' | 'OGG_OPUS' | 'LINEAR16'
  enabled: boolean
}

export interface FeatureFlag {
  flag: string
  enabled: boolean
  description: string | null
  updated_at?: string
}

export interface AdminAuditLog {
  id: string
  admin_id: string | null
  action: string
  target_type: string | null
  target_id: string | null
  details: Record<string, any>
  created_at: string
  admin_email?: string
}

export interface AdminUserStats {
  totalUsers: number
  newUsers7d: number
  activeUsers30d: number
  totalVocab: number
  globalVocab: number
  totalDecks: number
  studySessionsToday: number
}

export interface GrammarTopic {
  id: string
  title: string
  category: string
  level: string
  explanation: string
  examples: { sentence: string; translation?: string }[]
  is_published: boolean
  view_count?: number
  access_tier?: 'free' | 'pro'
  teaser_config?: { enabled: boolean; type: string }
  created_at: string
}

export interface GrammarExercise {
  id: string
  topic_id: string
  question: string
  options: string[]
  answer: string
  explanation?: string
  created_at: string
}
