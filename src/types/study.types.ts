export type StudyMode =
  | 'two_side'
  | 'one_side'
  | 'quick_flash'
  | 'audio_only'
  | 'meaning_first'
  | 'ipa_first'
  | 'example_first'

export interface StudySession {
  id: string
  user_id: string
  deck_id: string | null
  mode: StudyMode
  total_cards: number
  viewed_cards: number
  remembered_count: number
  difficult_count: number
  started_at: string
  ended_at: string | null
}
