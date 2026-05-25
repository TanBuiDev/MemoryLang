import { describe, expect, it } from 'vitest'
import {
  splitMultiTermEntry,
  isSplittable,
  getSplitParts,
} from '@/features/vocabulary/multiTermSplit'

describe('isSplittable', () => {
  it('detects entries with slashes in source_text or translation', () => {
    expect(isSplittable({ source_text: 'conduct a survey / a study / an inspection', translation: 'tiến hành một cuộc khảo sát/nghiên cứu/điều tra' })).toBe(true)
  })

  it('detects when only translation has slashes', () => {
    expect(isSplittable({ source_text: 'interest', translation: 'mối quan tâm/ lợi nhuận' })).toBe(true)
  })

  it('returns false for single-term entries', () => {
    expect(isSplittable({ source_text: 'apple', translation: 'quả táo' })).toBe(false)
  })

  it('returns false when slash count does not match between source and translation', () => {
    expect(isSplittable({ source_text: 'a / b / c', translation: 'x / y' })).toBe(false)
  })
})

describe('getSplitParts', () => {
  it('splits a simple slash-separated source text', () => {
    const parts = getSplitParts('khảo sát / nghiên cứu / điều tra')
    expect(parts).toEqual(['khảo sát', 'nghiên cứu', 'điều tra'])
  })

  it('splits a slash-separated phrase with shared prefix in first part', () => {
    const parts = getSplitParts('conduct a survey / a study / an inspection')
    expect(parts).toEqual([
      'conduct a survey',
      'conduct a study',
      'conduct an inspection',
    ])
  })

  it('handles parts that have independent full forms', () => {
    const parts = getSplitParts('offer sb sth / provide sb with sth')
    expect(parts).toEqual(['offer sb sth', 'provide sb with sth'])
  })

  it('trims whitespace around slashes', () => {
    const parts = getSplitParts('a  /  b  /  c')
    expect(parts).toEqual(['a', 'b', 'c'])
  })

  it('returns single element for text without slashes', () => {
    const parts = getSplitParts('hello world')
    expect(parts).toEqual(['hello world'])
  })
})

describe('splitMultiTermEntry', () => {
  const baseEntry = {
    id: 'entry-1',
    user_id: 'user-1',
    source_text: 'conduct a survey / a study / an inspection',
    translation: 'tiến hành một cuộc khảo sát/nghiên cứu/điều tra',
    source_language: 'en' as const,
    native_language: 'vi' as const,
    item_type: 'phrase' as const,
    part_of_speech: null,
    ipa: null,
    note: null,
    meanings: [] as { text: string; language: string }[],
    examples: [] as { sentence: string; translation?: string }[],
    tags: [] as string[],
    status: 'new' as const,
    deck_ids: ['deck-1', 'deck-2'],
    relationship_ids: ['rel-1'],
  }

  it('produces one entry per slash-separated alternative', () => {
    const results = splitMultiTermEntry(baseEntry)
    expect(results).toHaveLength(3)
  })

  it('constructs correct source_text for each split part', () => {
    const results = splitMultiTermEntry(baseEntry)
    expect(results[0]!.source_text).toBe('conduct a survey')
    expect(results[1]!.source_text).toBe('conduct a study')
    expect(results[2]!.source_text).toBe('conduct an inspection')
  })

  it('constructs correct translation for each split part', () => {
    const results = splitMultiTermEntry(baseEntry)
    expect(results[0]!.translation).toBe('tiến hành một cuộc khảo sát')
    expect(results[1]!.translation).toBe('nghiên cứu')
    expect(results[2]!.translation).toBe('điều tra')
  })

  it('preserves all shared fields from the original entry', () => {
    const results = splitMultiTermEntry(baseEntry)
    for (const result of results) {
      expect(result.user_id).toBe('user-1')
      expect(result.source_language).toBe('en')
      expect(result.native_language).toBe('vi')
      expect(result.item_type).toBe('phrase')
      expect(result.status).toBe('new')
      expect(result.deck_ids).toEqual(['deck-1', 'deck-2'])
      expect(result.relationship_ids).toEqual(['rel-1'])
    }
  })

  it('splits source-only entries (translation without slashes)', () => {
    const entry = {
      ...baseEntry,
      source_text: 'about / almost',
      translation: 'khoảng',
    }
    const results = splitMultiTermEntry(entry)
    expect(results).toHaveLength(2)
    expect(results[0]!.source_text).toBe('about')
    expect(results[0]!.translation).toBe('khoảng')
    expect(results[1]!.source_text).toBe('almost')
    expect(results[1]!.translation).toBe('khoảng')
  })

  it('returns empty array for non-splittable entries', () => {
    const entry = { ...baseEntry, source_text: 'apple', translation: 'quả táo' }
    const results = splitMultiTermEntry(entry)
    expect(results).toEqual([])
  })
})
