import { describe, expect, it } from 'vitest'
import { demoVocabulary } from '@/features/demo/demoData'
import {
  checkTranslationAnswer,
  generateTranslationQuestions,
  isTranslationAnswerCorrect,
} from '@/features/quiz/translationInputQuiz'

describe('generateTranslationQuestions', () => {
  it('uses only vocabulary with a nonblank saved translation and exposes prompt fields', () => {
    const items = [
      demoVocabulary[0]!,
      { ...demoVocabulary[1]!, translation: '   ' },
      { ...demoVocabulary[2]!, translation: null },
    ]

    const questions = generateTranslationQuestions(items, 3, () => 0)

    expect(questions).toHaveLength(1)
    expect(questions[0]).toMatchObject({
      sourceText: 'apple',
      expectedTranslation: 'quả táo',
    })
  })

  it('respects a numeric question limit', () => {
    const questions = generateTranslationQuestions(demoVocabulary, 2, () => 0)

    expect(questions).toHaveLength(2)
  })
})

describe('isTranslationAnswerCorrect', () => {
  it('normalizes decomposed Vietnamese Unicode before comparing answers', () => {
    expect(isTranslationAnswerCorrect('qua\u0309 ta\u0301o', 'quả táo')).toBe(true)
  })

  it('allows one edit when the normalized expected answer is >= 5 characters', () => {
    expect(isTranslationAnswerCorrect('abcdx', 'Abcde!')).toBe(true)
  })

  it('rejects one edit for very short expected answers', () => {
    expect(isTranslationAnswerCorrect('abx', 'Abc!')).toBe(false)
  })

  it('accepts individual comma-separated translations and ignores part-of-speech labels', () => {
    expect(isTranslationAnswerCorrect('hứa', 'hứa, (n) lời hứa')).toBe(true)
    expect(isTranslationAnswerCorrect('lời hứa', 'hứa, (n) lời hứa')).toBe(true)
    expect(isTranslationAnswerCorrect('n', 'hứa, (n) lời hứa')).toBe(false)
  })

  it('accepts saved translation alternatives separated by semicolons or new lines', () => {
    expect(isTranslationAnswerCorrect('cam kết', 'hứa; cam kết')).toBe(true)
    expect(isTranslationAnswerCorrect('lời hứa', 'hứa\n(n) lời hứa')).toBe(true)
  })

  it('accepts any part of a translation separated by forward slashes', () => {
    expect(isTranslationAnswerCorrect('khảo sát', 'khảo sát/nghiên cứu/điều tra')).toBe(true)
    expect(isTranslationAnswerCorrect('nghiên cứu', 'khảo sát/nghiên cứu/điều tra')).toBe(true)
    expect(isTranslationAnswerCorrect('điều tra', 'khảo sát/nghiên cứu/điều tra')).toBe(true)
    expect(isTranslationAnswerCorrect('không liên quan', 'khảo sát/nghiên cứu/điều tra')).toBe(false)
  })

  it.each([
    ['Qua chuoi', 'qua chuoi', true],
    ['  qua   chuoi! ', 'qua chuoi', true],
    ['phá vở sự ngại ngùng', 'phá vỡ sự ngại ngùng', true],
    ['táo', 'táo', true],
    ['tao', 'táo', true],
    ['mèo', 'mẹo', true],
    ['mát', 'mất', false],
    ['', 'quả táo', false],
  ])('checks "%s" against "%s"', (answer, expected, isCorrect) => {
    expect(isTranslationAnswerCorrect(answer, expected)).toBe(isCorrect)
  })
})

describe('checkTranslationAnswer', () => {
  it('returns exact for a perfect match', () => {
    const result = checkTranslationAnswer('quả táo', 'quả táo')
    expect(result.result).toBe('exact')
    expect(result.matchedCandidate).toBe('quả táo')
  })

  it('returns exact for a normalized match', () => {
    const result = checkTranslationAnswer('  Qua Chuoi! ', 'qua chuoi')
    expect(result.result).toBe('exact')
    expect(result.matchedCandidate).toBe('qua chuoi')
  })

  it('returns exact for decomposed Vietnamese Unicode', () => {
    const result = checkTranslationAnswer('qua\u0309 ta\u0301o', 'quả táo')
    expect(result.result).toBe('exact')
    expect(result.matchedCandidate).toBe('quả táo')
  })

  it('returns exact for one of multiple comma-separated answers', () => {
    const result = checkTranslationAnswer('lời hứa', 'hứa, (n) lời hứa')
    expect(result.result).toBe('exact')
    expect(result.matchedCandidate).toBe('lời hứa')
  })

  it('returns exact for one of multiple slash-separated answers', () => {
    const result = checkTranslationAnswer('nghiên cứu', 'khảo sát/nghiên cứu/điều tra')
    expect(result.result).toBe('exact')
    expect(result.matchedCandidate).toBe('nghiên cứu')
  })

  it('handles mixed comma and slash separators', () => {
    const result = checkTranslationAnswer('điều tra', 'kiểm tra, khảo sát/nghiên cứu/điều tra')
    expect(result.result).toBe('exact')
    expect(result.matchedCandidate).toBe('điều tra')
  })

  it('returns fuzzy when one edit away and expected text is >= 5 characters', () => {
    const result = checkTranslationAnswer('abcdx', 'abcde')
    expect(result.result).toBe('fuzzy')
    expect(result.matchedCandidate).toBe('abcde')
  })

  it('returns fuzzy for tone-only differences via diacritic-agnostic match', () => {
    const result = checkTranslationAnswer('xin lõi', 'xin lỗi')
    expect(result.result).toBe('fuzzy')
    expect(result.matchedCandidate).toBe('xin lỗi')
  })

  it('returns fuzzy for missing tone via diacritic-agnostic match', () => {
    const result = checkTranslationAnswer('xin loi', 'xin lỗi')
    expect(result.result).toBe('fuzzy')
    expect(result.matchedCandidate).toBe('xin lỗi')
  })

  it('returns fuzzy for long strings with up to two edits', () => {
    const result = checkTranslationAnswer('phá vở sự ngại ngùg', 'phá vỡ sự ngại ngùng')
    expect(result.result).toBe('fuzzy')
  })

  it('returns incorrect when one edit away but expected text is very short', () => {
    const result = checkTranslationAnswer('abx', 'abc')
    expect(result.result).toBe('incorrect')
    expect(result.matchedCandidate).toBeNull()
  })

  it('returns incorrect for completely different answers', () => {
    const result = checkTranslationAnswer('chuột', 'quả táo')
    expect(result.result).toBe('incorrect')
    expect(result.matchedCandidate).toBeNull()
  })

  it('returns incorrect for empty answer', () => {
    const result = checkTranslationAnswer('', 'quả táo')
    expect(result.result).toBe('incorrect')
    expect(result.matchedCandidate).toBeNull()
  })

  it('prefers exact match over fuzzy when both possible', () => {
    const result = checkTranslationAnswer('abcdefgh', 'abcdefgh')
    expect(result.result).toBe('exact')
  })
})
