import type { LanguageCode } from '@/types/language.types'

export type DeckVisibility = 'private' | 'public'

export interface Deck {
  id: string
  user_id: string
  name: string
  description: string | null
  source_language: LanguageCode
  native_language: LanguageCode
  color: string | null
  icon: string | null
  visibility: DeckVisibility
  parent_id: string | null
  created_at: string
  updated_at: string
  term_count?: number
  children?: Deck[]
}
