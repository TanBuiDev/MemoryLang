import { describe, expect, it } from 'vitest'
import { demoVocabulary } from '@/features/demo/demoData'
import {
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

  it('allows one edit when the normalized expected answer is exactly eight characters', () => {
    expect(isTranslationAnswerCorrect('abcdefgx', ' Abcdefgh! ')).toBe(true)
  })

  it('rejects one edit below the normalized expected answer length threshold', () => {
    expect(isTranslationAnswerCorrect('abcdefx', ' Abcdefg! ')).toBe(false)
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

  it.each([
    ['Qua chuoi', 'qua chuoi', true],
    ['  qua   chuoi! ', 'qua chuoi', true],
    ['phá vở sự ngại ngùng', 'phá vỡ sự ngại ngùng', true],
    ['táo', 'táo', true],
    ['tao', 'táo', false],
    ['mèo', 'mẹo', false],
    ['', 'quả táo', false],
  ])('checks "%s" against "%s"', (answer, expected, isCorrect) => {
    expect(isTranslationAnswerCorrect(answer, expected)).toBe(isCorrect)
  })
})
