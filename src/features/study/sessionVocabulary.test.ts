import { describe, expect, it } from 'vitest'
import type { VocabularyItem } from '@/types/vocabulary.types'
import { prepareSessionVocabulary } from './sessionVocabulary'

const baseItem: VocabularyItem = {
  id: 'base',
  user_id: 'user',
  global_term_id: null,
  source_text: 'base',
  normalized_text: 'base',
  source_language: 'en',
  native_language: 'vi',
  item_type: 'word',
  part_of_speech: null,
  ipa: null,
  pronunciation_text: null,
  audio_url: null,
  image_url: null,
  note: null,
  meanings: [],
  translation: null,
  examples: [],
  tags: [],
  status: 'new',
  view_count: 0,
  correct_count: 0,
  wrong_count: 0,
  audio_play_count: 0,
  srs_repetition: 0,
  srs_interval_days: 0,
  srs_ease_factor: 2.5,
  last_reviewed_at: null,
  next_review_at: null,
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
}

function item(id: string): VocabularyItem {
  return { ...baseItem, id, source_text: id, normalized_text: id }
}

describe('prepareSessionVocabulary', () => {
  it('limits cards without mutating the original list', () => {
    const vocabulary = [item('one'), item('two'), item('three')]

    const result = prepareSessionVocabulary(vocabulary, { limit: 2, shuffle: false })

    expect(result.map((entry) => entry.id)).toEqual(['one', 'two'])
    expect(vocabulary.map((entry) => entry.id)).toEqual(['one', 'two', 'three'])
  })

  it('returns every card when the limit is all', () => {
    const vocabulary = [item('one'), item('two'), item('three')]

    const result = prepareSessionVocabulary(vocabulary, { limit: 'all', shuffle: false })

    expect(result.map((entry) => entry.id)).toEqual(['one', 'two', 'three'])
  })

  it('uses the provided random function when shuffling', () => {
    const vocabulary = [item('one'), item('two'), item('three')]

    const result = prepareSessionVocabulary(vocabulary, { limit: 3, shuffle: true, random: () => 0 })

    expect(result.map((entry) => entry.id)).toEqual(['two', 'three', 'one'])
  })
})
