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
