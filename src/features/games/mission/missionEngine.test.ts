import { describe, expect, it } from 'vitest'
import { createCurriculumFingerprint, splitIntoMissions } from './curriculum'
import { findExactCloze, normalizeMissionAnswer } from './generators'
import { calculateMissionScore } from './missionEngine'
import { buildMissionReviewActions } from './missionSrsAdapter'
import type { GameTerm, MissionDefinition } from './mission.types'

const term = (overrides: Partial<GameTerm> = {}): GameTerm => ({
  globalTermId: 'term-1',
  orderIndex: 0,
  sourceText: 'renovate',
  normalizedText: 'renovate',
  sourceLanguage: 'en',
  nativeLanguage: 'vi',
  itemType: 'word',
  partOfSpeech: 'verb',
  ipa: '/ˈrenəveɪt/',
  audioUrl: 'https://example.com/renovate.mp3',
  imageUrl: null,
  translation: 'cải tạo',
  meanings: [],
  examples: [{ sentence: 'They plan to renovate the office.' }],
  tags: [],
  ...overrides,
})

describe('mission curriculum', () => {
  it('merges a tiny final mission', () => {
    expect(splitIntoMissions(Array.from({ length: 23 }, (_, index) => index), 10, 5).map((group) => group.length)).toEqual([10, 13])
  })
  it('changes fingerprint when term order changes', () => {
    const a = createCurriculumFingerprint({ deckId: 'd', orderedTermIds: ['a', 'b'], termsPerMission: 10, scriptKey: 'standard' })
    const b = createCurriculumFingerprint({ deckId: 'd', orderedTermIds: ['b', 'a'], termsPerMission: 10, scriptKey: 'standard' })
    expect(a).not.toBe(b)
  })
})

describe('question helpers', () => {
  it('normalizes spaces and smart apostrophes', () => {
    expect(normalizeMissionAnswer("  Don’t   stop ")).toBe("don't stop")
  })
  it('creates cloze only for an exact surface form', () => {
    expect(findExactCloze(term())?.prompt).toBe('They plan to ______ the office.')
    expect(findExactCloze(term({ examples: [{ sentence: 'They renovated the office.' }] }))).toBeNull()
  })
})

describe('mission score', () => {
  it('separates final accuracy from first-try accuracy', () => {
    const definition = { stages: [{ type: 'meaning_recall', targetTermIds: ['term-1'], required: true, questions: [{ id: 'q1' }] }] } as unknown as MissionDefinition
    expect(calculateMissionScore(definition, [{ questionId: 'q1', score: 50, isCorrect: true, firstTryCorrect: false }])).toEqual({
      score: 50,
      accuracy: 100,
      firstTryAccuracy: 0,
    })
  })
})


describe('mission SRS adapter', () => {
  const answer = (overrides: Record<string, unknown> = {}) => ({
    questionId: 'q',
    targetTermId: 'term-1',
    type: 'meaning_recall' as const,
    attempts: 1,
    hintLevel: 0,
    isCorrect: true,
    firstTryCorrect: true,
    score: 100,
    answeredAt: '2026-09-24T00:00:00.000Z',
    ...overrides,
  })

  it('maps strong first-try recall to know', () => {
    const actions = buildMissionReviewActions(
      [answer()],
      new Map([['term-1', { globalTermId: 'term-1', correctCount: 0, wrongCount: 0, repetition: 0, intervalDays: 0, easeFactor: 2.5 }]]),
      new Date('2026-09-24T00:00:00.000Z'),
    )
    expect(actions).toHaveLength(1)
    expect(actions[0].action).toBe('know')
  })

  it('maps retry to difficult and any final failure to dont_know', () => {
    const snapshot = new Map([['term-1', { globalTermId: 'term-1', correctCount: 2, wrongCount: 0, repetition: 2, intervalDays: 6, easeFactor: 2.5 }]])
    expect(buildMissionReviewActions([answer({ attempts: 2, firstTryCorrect: false })], snapshot)[0].action).toBe('difficult')
    expect(buildMissionReviewActions([answer({ isCorrect: false, firstTryCorrect: false, score: 0 })], snapshot)[0].action).toBe('dont_know')
  })

  it('aggregates multiple questions into one action per term', () => {
    const actions = buildMissionReviewActions(
      [answer({ questionId: 'q1' }), answer({ questionId: 'q2', type: 'context_cloze' })],
      new Map(),
    )
    expect(actions).toHaveLength(1)
  })
})
