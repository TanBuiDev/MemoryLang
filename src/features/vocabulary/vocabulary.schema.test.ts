import { describe, expect, it } from 'vitest'
import { vocabularyFormSchema, vocabularyUpdateFormSchema } from '@/features/vocabulary/vocabulary.schema'

describe('vocabularyFormSchema', () => {
  it('accepts a valid editable vocabulary payload', () => {
    const result = vocabularyFormSchema.safeParse({
      source_text: 'apple',
      source_language: 'en',
      native_language: 'vi',
      item_type: 'word',
      part_of_speech: 'noun',
      ipa: '/ˈæp.əl/',
      pronunciation_text: '',
      audio_url: '',
      image_url: '',
      note: '',
      meanings: [{ text: 'quả táo', language: 'vi' }],
      examples: [{ sentence: 'I eat an apple.', translation: 'Tôi ăn một quả táo.' }],
      tags: ['food'],
      deck_ids: [],
    })

    expect(result.success).toBe(true)
  })

  it('requires source_text', () => {
    const result = vocabularyFormSchema.safeParse({
      source_text: '',
      source_language: 'en',
      native_language: 'vi',
      item_type: 'word',
      meanings: [],
      examples: [],
      tags: [],
      deck_ids: [],
    })

    expect(result.success).toBe(false)
  })

  it('allows update payloads to omit deck ids and include status', () => {
    const result = vocabularyUpdateFormSchema.safeParse({
      source_text: 'apple',
      source_language: 'en',
      native_language: 'vi',
      item_type: 'word',
      status: 'learning',
      meanings: [{ text: 'quả táo', language: 'vi' }],
      examples: [],
      tags: [],
    })

    expect(result.success).toBe(true)
  })
})
