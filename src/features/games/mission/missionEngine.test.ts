import { describe, expect, it } from 'vitest'
import { createCurriculumContentVersion, createCurriculumFingerprint, splitIntoMissions } from './curriculum'
import { findExactCloze, generateQuestion, normalizeMissionAnswer } from './generators'
import { calculateMissionScore, createMissionDefinition, evaluateMissionReadiness } from './missionEngine'
import { buildMissionReviewActions } from './missionSrsAdapter'
import { parseGameHubConfig } from './gameConfig'
import { missionAttemptReducer } from './missionReducer'
import { getMissionScript } from './scriptRegistry'
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

  it('changes content version when learning-relevant shared content changes', () => {
    const before = createCurriculumContentVersion([term()])
    const after = createCurriculumContentVersion([term({ translation: 'tân trang' })])
    expect(before).not.toBe(after)
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
  it('skips listening questions without stored audio and unprompted spelling', () => {
    const silent = term({ audioUrl: null, translation: null })
    const translatedSilent = term({ audioUrl: null })
    const distractors = Array.from({ length: 4 }, (_, index) => term({ globalTermId: 'other-' + index, translation: 'nghĩa ' + index }))
    expect(generateQuestion('listening_choice', translatedSilent, [translatedSilent, ...distractors], 'seed').question).toBeNull()
    expect(generateQuestion('listening_typing', silent, [silent], 'seed').question).toBeNull()
    expect(generateQuestion('spelling', silent, [silent], 'seed').question).toBeNull()
  })
  it('skips a matching target whose translation is shared by another term', () => {
    const duplicate = term({ globalTermId: 'duplicate', sourceText: 'refurbish' })
    const distractors = Array.from({ length: 3 }, (_, index) => term({ globalTermId: 'other-' + index, translation: 'nghĩa ' + index }))
    expect(generateQuestion('matching', term(), [term(), duplicate, ...distractors], 'seed').question).toBeNull()
  })
})

describe('shared mission definitions', () => {
  const terms = Array.from({ length: 10 }, (_, index) => term({
    globalTermId: 'term-' + index,
    orderIndex: index,
    sourceText: 'word-' + index,
    normalizedText: 'word-' + index,
    translation: 'nghĩa ' + index,
    examples: [{ sentence: 'This is word-' + index + '.' }],
  }))

  it('gives different users the same target terms and question structure', () => {
    const input = { deckId: 'deck-1', curriculumFingerprint: 'fp', missionIndex: 0, terms }
    const userA = createMissionDefinition(input).definition
    const userB = createMissionDefinition(input).definition
    expect(userA).toEqual(userB)
    expect(userA.targetTermIds).toEqual(terms.map((item) => item.globalTermId))
  })

  it('keeps every matching translation unique', () => {
    const duplicated = terms.map((item, index) => index === 9 ? { ...item, translation: 'nghĩa 0' } : item)
    const { definition } = createMissionDefinition({ deckId: 'deck-1', curriculumFingerprint: 'fp', missionIndex: 0, terms: duplicated })
    const matching = definition.stages.find((stage) => stage.type === 'matching')
    const normalized = matching?.questions.map((question) => normalizeMissionAnswer(question.acceptedAnswers[0])) ?? []
    expect(new Set(normalized).size).toBe(normalized.length)
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


describe('mission game configuration', () => {
  it('does not auto-enable Mission for a legacy allowed deck', () => {
    const parsed = parseGameHubConfig({
      games: { matching: { accessTier: 'free' } },
      allowedDecks: [{ deckId: 'deck-1', allowed: true, accessTier: 'free' }],
    })
    expect(parsed.allowedDecks[0].missionEnabled).toBe(false)
  })

  it('preserves explicit Mission settings', () => {
    const parsed = parseGameHubConfig({
      games: { mission: { accessTier: 'pro' } },
      allowedDecks: [{
        deckId: 'deck-1',
        allowed: true,
        accessTier: 'pro',
        missionEnabled: true,
        termsPerMission: 15,
        scriptKey: 'standard',
      }],
    })
    expect(parsed.games.mission.accessTier).toBe('pro')
    expect(parsed.allowedDecks[0]).toMatchObject({
      missionEnabled: true,
      termsPerMission: 15,
      scriptKey: 'standard',
    })
  })
})


describe('mission readiness', () => {
  it('blocks a mission whose translations are too ambiguous for required stages', () => {
    const terms = Array.from({ length: 5 }, (_, index) => term({
      globalTermId: 'term-' + index,
      orderIndex: index,
      sourceText: 'word-' + index,
      normalizedText: 'word-' + index,
      translation: 'trùng nghĩa',
    }))
    const readiness = evaluateMissionReadiness(terms)
    expect(readiness.playable).toBe(false)
    expect(readiness.blocking.some((issue) => issue.code === 'DUPLICATE_TRANSLATION')).toBe(true)
  })
})


describe('mission script registry', () => {
  it('returns the reusable standard script and its version', () => {
    const script = getMissionScript('standard')
    expect(script.version).toBe(1)
    expect(script.stages.map((stage) => stage.type)).toEqual([
      'matching',
      'listening_choice',
      'listening_typing',
      'context_cloze',
      'meaning_recall',
    ])
  })

  it('falls back safely for an unknown script key', () => {
    expect(getMissionScript('missing-script').key).toBe('standard')
  })
})

describe('mission attempt reducer', () => {
  const initial = {
    deckId: 'deck-1',
    curriculumFingerprint: 'fp',
    missionIndex: 0,
    stageIndex: 0,
    questionIndex: 0,
    answers: [],
    startedAt: '2026-09-24T00:00:00.000Z',
    updatedAt: '2026-09-24T00:00:00.000Z',
    status: 'in_progress' as const,
  }

  it('transitions stage and question deterministically', () => {
    const next = missionAttemptReducer(initial, {
      type: 'transition',
      stageIndex: 2,
      questionIndex: 1,
      at: '2026-09-24T00:01:00.000Z',
    })
    expect(next).toMatchObject({ stageIndex: 2, questionIndex: 1 })
    expect(initial).toMatchObject({ stageIndex: 0, questionIndex: 0 })
  })

  it('replaces an existing answer by question id instead of duplicating it', () => {
    const answer = {
      questionId: 'q1',
      targetTermId: 'term-1',
      type: 'meaning_recall' as const,
      attempts: 1,
      hintLevel: 0,
      isCorrect: true,
      firstTryCorrect: true,
      score: 100,
      answeredAt: '2026-09-24T00:01:00.000Z',
    }
    const once = missionAttemptReducer(initial, {
      type: 'recordAnswers',
      answers: [answer],
      at: answer.answeredAt,
    })
    const twice = missionAttemptReducer(once, {
      type: 'recordAnswers',
      answers: [{ ...answer, score: 50, attempts: 2, firstTryCorrect: false }],
      at: '2026-09-24T00:02:00.000Z',
    })
    expect(twice?.answers).toHaveLength(1)
    expect(twice?.answers[0].score).toBe(50)
  })

  it('marks the attempt completed without changing its answers', () => {
    const completed = missionAttemptReducer(initial, {
      type: 'complete',
      at: '2026-09-24T00:03:00.000Z',
    })
    expect(completed?.status).toBe('completed')
    expect(completed?.answers).toEqual([])
  })
})
