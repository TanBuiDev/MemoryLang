import { describe, expect, it } from 'vitest'
import { deriveTranslation, type Meaning } from './vocabulary.types'

describe('deriveTranslation', () => {
  it('returns null if there are no meanings', () => {
    expect(deriveTranslation([])).toBeNull()
  })

  it('returns null if meanings do not have translations', () => {
    const meanings: Meaning[] = [
      { text: 'apple', language: 'en', part_of_speech: 'noun' },
    ]
    expect(deriveTranslation(meanings)).toBeNull()
  })

  it('does not prefix if there is only one part of speech', () => {
    const meanings: Meaning[] = [
      { text: 'banana', language: 'en', part_of_speech: 'noun', translation: 'quả chuối' },
    ]
    expect(deriveTranslation(meanings)).toBe('quả chuối')
  })

  it('prefixes translations if there are multiple distinct parts of speech', () => {
    const meanings: Meaning[] = [
      { text: 'antique', language: 'en', part_of_speech: 'noun', translation: 'đồ cổ' },
      { text: 'antique', language: 'en', part_of_speech: 'adjective', translation: 'cổ, cũ kỹ' },
    ]
    expect(deriveTranslation(meanings)).toBe('(noun) đồ cổ; (adjective) cổ, cũ kỹ')
  })

  it('does not prefix if multiple meanings share the same part of speech', () => {
    const meanings: Meaning[] = [
      { text: 'run', language: 'en', part_of_speech: 'verb', translation: 'chạy' },
      { text: 'run', language: 'en', part_of_speech: 'verb', translation: 'vận hành' },
    ]
    expect(deriveTranslation(meanings)).toBe('chạy; vận hành')
  })

  it('does not prefix if there is only one defined part of speech and another undefined', () => {
    const meanings: Meaning[] = [
      { text: 'test', language: 'en', part_of_speech: 'noun', translation: 'bài kiểm tra' },
      { text: 'test', language: 'en', translation: 'thử nghiệm' },
    ]
    expect(deriveTranslation(meanings)).toBe('bài kiểm tra; thử nghiệm')
  })
})
