import type { LanguageCode } from '@/types/language.types'

export type VocabularyItemType = 'word' | 'phrase' | 'idiom' | 'sentence'
export type VocabularyStatus = 'new' | 'learning' | 'familiar' | 'memorized' | 'difficult' | 'need_review'

export interface Meaning {
  text: string
  language: LanguageCode
  part_of_speech?: string | null
  translation?: string | null
  examples?: ExampleSentence[]
}

export function derivePartOfSpeech(meanings: Meaning[]): string | null {
  const pos = [...new Set(meanings.map((m) => m.part_of_speech).filter(Boolean) as string[])]
  return pos.length > 0 ? pos.join(', ') : null
}

export function deriveTranslation(meanings: Meaning[]): string | null {
  return meanings[0]?.translation ?? null
}

export function deriveExamples(meanings: Meaning[]): ExampleSentence[] {
  return meanings.flatMap((m) => m.examples ?? [])
}

export interface ExampleSentence {
  sentence: string
  translation?: string | null
}

export interface VocabularyItem {
  id: string
  user_id: string
  global_term_id: string | null
  source_text: string
  normalized_text: string
  source_language: LanguageCode
  native_language: LanguageCode
  item_type: VocabularyItemType
  part_of_speech: string | null
  ipa: string | null
  audio_url: string | null
  image_url: string | null
  note: string | null
  meanings: Meaning[]
  translation: string | null
  examples: ExampleSentence[]
  tags: string[]
  status: VocabularyStatus
  view_count: number
  correct_count: number
  wrong_count: number
  audio_play_count: number
  srs_repetition: number
  srs_interval_days: number
  srs_ease_factor: number
  last_reviewed_at: string | null
  next_review_at: string | null
  flagged: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type RelationType = 'synonym' | 'antonym' | 'noun' | 'verb' | 'adjective' | 'adverb'

export interface TermRelationship {
  id: string
  source_id: string
  target_id: string
  relation_type: RelationType
  created_at: string
}

export interface VocabularyCardResponse {
  entry: VocabularyItem | null
  relationships: Record<RelationType, VocabularyItem[]>
}

export interface EnrichedVocabulary {
  sourceText: string
  normalizedText: string
  itemType: VocabularyItemType
  ipa: string | null
  partOfSpeech: string | null
  meanings: Meaning[]
  examples: ExampleSentence[]
  translationText?: string
  audioUrl: string | null
  imageUrl: string | null
  source: 'cache' | 'dictionary' | 'ai' | 'fallback'
}
