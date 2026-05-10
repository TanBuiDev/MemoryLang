import { describe, expect, it } from 'vitest'
import { demoVocabulary } from '@/features/demo/demoData'
import { generateTrueFalseQuestions } from '@/features/quiz/trueFalseQuiz'

describe('generateTrueFalseQuestions', () => {
  it('generates bounded true false questions from vocabulary meanings', () => {
    const questions = generateTrueFalseQuestions(demoVocabulary, 2)

    expect(questions).toHaveLength(2)
    expect(questions[0]?.prompt).toContain('=')
    expect(typeof questions[0]?.expectedAnswer).toBe('boolean')
  })
})
