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
  audioUrl: null,
}

describe('translation quiz session persistence', () => {
  beforeEach(() => window.sessionStorage.clear())

  it('round trips a translation input session with startedAt', () => {
    writeStoredQuizSession(storageKey, {
      quizType: 'translation_input',
      questions: [
        question,
        { ...question, id: 'banana-0', ipa: '/banana/', partOfSpeech: 'noun' },
      ],
      index: 1,
      score: 1,
      revealedQuestionIds: ['apple-0'],
      completedQuestionIds: ['apple-0'],
      fuzzyCorrectQuestionIds: [],
      deckId: null,
      wrongQuestionIds: [],
      totalQuestionIds: [],
      skippedQuestionIds: [],
      startedAt: Date.now(),
    })

    expect(readStoredQuizSession(storageKey)).toEqual({
      quizType: 'translation_input',
      questions: [
        question,
        { ...question, id: 'banana-0', ipa: '/banana/', partOfSpeech: 'noun' },
      ],
      index: 1,
      score: 1,
      revealedQuestionIds: ['apple-0'],
      completedQuestionIds: ['apple-0'],
      fuzzyCorrectQuestionIds: [],
      deckId: null,
      wrongQuestionIds: [],
      totalQuestionIds: [],
      startedAt: expect.any(Number),
      skippedQuestionIds: [],
    })

    const payload = JSON.parse(window.sessionStorage.getItem(storageKey) ?? '{}') as Record<string, unknown>
    expect(payload.version).toBe(4)
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
      version: 4,
      quizType: 'translation_input',
      questions: [invalidQuestion],
      index: 0,
      score: 0,
    }))

    expect(readStoredQuizSession(storageKey)).toBeNull()
  })

  it('defaults missing progress id arrays and startedAt for a valid snapshot', () => {
    window.sessionStorage.setItem(storageKey, JSON.stringify({
      version: 4,
      quizType: 'translation_input',
      questions: [question],
      index: 0,
      score: 0,
    }))

    expect(readStoredQuizSession(storageKey)).toEqual({
      quizType: 'translation_input',
      questions: [question],
      index: 0,
      score: 0,
      revealedQuestionIds: [],
      completedQuestionIds: [],
      fuzzyCorrectQuestionIds: [],
      deckId: null,
      wrongQuestionIds: [],
      totalQuestionIds: [],
      startedAt: expect.any(Number),
      skippedQuestionIds: [],
    })
  })

  it('filters malformed progress ids from a valid snapshot', () => {
    window.sessionStorage.setItem(storageKey, JSON.stringify({
      version: 4,
      quizType: 'translation_input',
      questions: [question],
      index: 0,
      score: 0,
      revealedQuestionIds: ['apple-0', 1],
      completedQuestionIds: [null, 'apple-0'],
    }))

    expect(readStoredQuizSession(storageKey)).toEqual({
      quizType: 'translation_input',
      questions: [question],
      index: 0,
      score: 0,
      revealedQuestionIds: ['apple-0'],
      completedQuestionIds: ['apple-0'],
      fuzzyCorrectQuestionIds: [],
      deckId: null,
      wrongQuestionIds: [],
      totalQuestionIds: [],
      startedAt: expect.any(Number),
      skippedQuestionIds: [],
    })
  })

  it('removes a stored snapshot when cleared', () => {
    window.sessionStorage.setItem(storageKey, 'stored-quiz')

    clearStoredQuizSession(storageKey)

    expect(window.sessionStorage.getItem(storageKey)).toBeNull()
  })
})
