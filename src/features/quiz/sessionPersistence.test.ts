import { beforeEach, describe, expect, it } from 'vitest'
import { clearStoredQuizSession, readStoredQuizSession, writeStoredQuizSession } from '@/features/quiz/sessionPersistence'

const storageKey = 'quiz-key'
const question = {
  id: 'apple-0',
  userTermId: 'apple',
  sourceText: 'apple',
  ipa: null,
  partOfSpeech: null,
  expectedTranslation: 'qua tao',
}

describe('translation quiz session persistence', () => {
  beforeEach(() => window.sessionStorage.clear())

  it('round trips version 2 progress without storing draft input', () => {
    writeStoredQuizSession(storageKey, {
      questions: [
        question,
        { ...question, id: 'banana-0', ipa: '/banana/', partOfSpeech: 'noun' },
      ],
      index: 1,
      score: 1,
      revealedQuestionIds: ['apple-0'],
      completedQuestionIds: ['apple-0'],
    })

    expect(readStoredQuizSession(storageKey)).toEqual({
      questions: [
        question,
        { ...question, id: 'banana-0', ipa: '/banana/', partOfSpeech: 'noun' },
      ],
      index: 1,
      score: 1,
      revealedQuestionIds: ['apple-0'],
      completedQuestionIds: ['apple-0'],
    })

    const payload = JSON.parse(window.sessionStorage.getItem(storageKey) ?? '{}') as Record<string, unknown>
    expect(payload.version).toBe(2)
    expect(payload).not.toHaveProperty('draftAnswer')
    expect(payload).not.toHaveProperty('draftInput')
  })

  it('rejects legacy version 1 true-false snapshots', () => {
    window.sessionStorage.setItem(storageKey, JSON.stringify({
      version: 1,
      questions: [{ id: 'apple-0', prompt: 'apple = A fruit', expectedAnswer: true }],
      index: 0,
      score: 0,
    }))

    expect(readStoredQuizSession(storageKey)).toBeNull()
  })

  it.each([
    [{ ...question, expectedTranslation: undefined }],
    [{ ...question, ipa: undefined }],
    [{ ...question, partOfSpeech: false }],
    [{ ...question, userTermId: 1 }],
  ])('rejects invalid translation question structures', (invalidQuestion) => {
    window.sessionStorage.setItem(storageKey, JSON.stringify({
      version: 2,
      questions: [invalidQuestion],
      index: 0,
      score: 0,
    }))

    expect(readStoredQuizSession(storageKey)).toBeNull()
  })

  it('defaults missing progress id arrays for a valid version 2 snapshot', () => {
    window.sessionStorage.setItem(storageKey, JSON.stringify({
      version: 2,
      questions: [question],
      index: 0,
      score: 0,
    }))

    expect(readStoredQuizSession(storageKey)).toEqual({
      questions: [question],
      index: 0,
      score: 0,
      revealedQuestionIds: [],
      completedQuestionIds: [],
    })
  })

  it('filters malformed progress ids from a valid version 2 snapshot', () => {
    window.sessionStorage.setItem(storageKey, JSON.stringify({
      version: 2,
      questions: [question],
      index: 0,
      score: 0,
      revealedQuestionIds: ['apple-0', 1],
      completedQuestionIds: [null, 'apple-0'],
    }))

    expect(readStoredQuizSession(storageKey)).toEqual({
      questions: [question],
      index: 0,
      score: 0,
      revealedQuestionIds: ['apple-0'],
      completedQuestionIds: ['apple-0'],
    })
  })

  it('removes a stored snapshot when cleared', () => {
    window.sessionStorage.setItem(storageKey, 'stored-quiz')

    clearStoredQuizSession(storageKey)

    expect(window.sessionStorage.getItem(storageKey)).toBeNull()
  })
})
