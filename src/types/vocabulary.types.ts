import type { LanguageCode } from '@/types/language.types'

export type VocabularyItemType = 'word' | 'phrase' | 'idiom' | 'sentence'
export type VocabularyStatus = 'new' | 'learning' | 'familiar' | 'memorized' | 'difficult' | 'need_review'

export interface Meaning {
  text: string
  language: LanguageCode
}

export interface ExampleSentence {
  sentence: string
  translation?: string
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
  pronunciation_text: string | null
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
  last_reviewed_at: string | null
  next_review_at: string | null
  created_at: string
  updated_at: string
}

export interface EnrichedVocabulary {
  sourceText: string
  normalizedText: string
  itemType: VocabularyItemType
  ipa: string | null
  partOfSpeech: string | null
  pronunciationText: string | null
  meanings: Meaning[]
  examples: ExampleSentence[]
  translationText?: string
  audioUrl: string | null
  imageUrl: string | null
  source: 'cache' | 'dictionary' | 'ai' | 'fallback'
}
