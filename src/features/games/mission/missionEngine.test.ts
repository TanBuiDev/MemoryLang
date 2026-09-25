import { describe, expect, it } from 'vitest'
import { createCurriculumContentVersion, createCurriculumFingerprint, splitIntoMissions } from './curriculum'
import { findExactCloze, generateQuestion, normalizeMissionAnswer } from './generators'
import { calculateMissionScore, createMissionDefinition, evaluateMissionReadiness } from './missionEngine'
import { buildMissionReviewActions } from './missionSrsAdapter'
import { parseGameHubConfig } from './gameConfig'
import { missionAttemptReducer, shouldAutoSyncMission } from './missionReducer'
import { getMissionScript } from './scriptRegistry'
import { buildMissionReviewItems } from './missionReview'
import { calculateMissionProgress, createSkippedMissionAnswer, formatMissionPartOfSpeech, getMissionContextTranslation, getMissionRetryFeedback, getSkippedMissionTerms, scoreMissionAnswer, selectMatchingTranslation } from './missionInteraction'
import type { GameTerm, MissionAttemptState, MissionDefinition } from './mission.types'

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
    expect(createCurriculumContentVersion([term({ audioUrl: 'https://example.com/new-audio.mp3' })])).not.toBe(before)
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
    expect(buildMissionReviewActions([answer({ hintLevel: 1, firstTryCorrect: false, score: 50 })], snapshot)[0].action).toBe('difficult')
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
  const initial: MissionAttemptState = {
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

  it('persists unfinished input, retry state and matching choices, then clears them on transition', () => {
    const draft = missionAttemptReducer(initial, {
      type: 'setDraft',
      draft: { answerValue: 'reno', attemptNumber: 2, matchingSelections: { q1: 'cải tạo' } },
      at: '2026-09-24T00:01:00.000Z',
    })
    expect(draft?.draft).toEqual({ answerValue: 'reno', attemptNumber: 2, matchingSelections: { q1: 'cải tạo' } })
    const advanced = missionAttemptReducer(draft, { type: 'transition', stageIndex: 1, questionIndex: 0, at: '2026-09-24T00:02:00.000Z' })
    expect(advanced?.draft).toBeUndefined()
  })

  it('does not auto-sync while initial completion is still saving', () => {
    expect(shouldAutoSyncMission(true, true, false, true)).toBe(false)
    expect(shouldAutoSyncMission(true, true, false, false)).toBe(true)
    expect(shouldAutoSyncMission(true, true, false, false, true)).toBe(false)
  })

  it('enqueues retry questions and preserves retryQueue within stage then clears on next stage', () => {
    const withRetry = missionAttemptReducer(initial, {
      type: 'enqueueRetry',
      questionId: 'q-missed',
      at: '2026-09-24T00:01:00.000Z',
    })
    expect(withRetry?.retryQueue).toEqual(['q-missed'])

    // Advancing question within the same stage preserves retryQueue
    const nextQuestion = missionAttemptReducer(withRetry, {
      type: 'transition',
      stageIndex: 0,
      questionIndex: 1,
      at: '2026-09-24T00:02:00.000Z',
    })
    expect(nextQuestion?.retryQueue).toEqual(['q-missed'])

    // Transitioning to a new stage resets retryQueue
    const nextStage = missionAttemptReducer(nextQuestion, {
      type: 'transition',
      stageIndex: 1,
      questionIndex: 0,
      at: '2026-09-24T00:03:00.000Z',
    })
    expect(nextStage?.retryQueue).toBeUndefined()
  })

  it('caps retries for the same question at 3 attempts', () => {
    let state: MissionAttemptState = initial
    for (let i = 0; i < 5; i++) {
      state = missionAttemptReducer(state, {
        type: 'enqueueRetry',
        questionId: 'q-difficult',
        at: '2026-09-24T00:01:00.000Z',
      }) ?? state
    }
    expect(state.retryQueue).toEqual(['q-difficult', 'q-difficult', 'q-difficult'])
  })
})

describe('mission interactions', () => {
  it('returns each skipped term once in curriculum order for ungraded review', () => {
    const terms = [term({ globalTermId: 'a' }), term({ globalTermId: 'b' })]
    const skipped = [
      createSkippedMissionAnswer({ id: 'q-b-1', targetTermId: 'b', type: 'spelling' }, 1, '', 'now'),
      createSkippedMissionAnswer({ id: 'q-b-2', targetTermId: 'b', type: 'meaning_recall' }, 1, '', 'now'),
      createSkippedMissionAnswer({ id: 'q-a', targetTermId: 'a', type: 'meaning_recall' }, 1, '', 'now'),
    ]
    expect(getSkippedMissionTerms(terms, skipped).map((item) => item.globalTermId)).toEqual(['a', 'b'])
  })
  it('keeps progress below 100 percent until the Boss is completed', () => {
    const definition: MissionDefinition = {
      deckId: 'deck', curriculumFingerprint: 'fingerprint', missionIndex: 0,
      targetTermIds: ['a'], scriptKey: 'standard', scriptVersion: 1, generatorVersion: 1,
      stages: [
        { type: 'learn', targetTermIds: ['a'], questions: [], required: true },
        { type: 'boss', targetTermIds: ['a'], questions: [{ id: 'boss-1', type: 'meaning_recall', targetTermId: 'a', prompt: 'nghĩa', acceptedAnswers: ['word'] }], required: true },
      ],
    }
    expect(calculateMissionProgress(definition, { stageIndex: 1, questionIndex: 0, answers: [], status: 'in_progress' })).toBe(50)
    expect(calculateMissionProgress(definition, { stageIndex: 1, questionIndex: 0, answers: [createSkippedMissionAnswer({ id: 'boss-1', targetTermId: 'a', type: 'meaning_recall' }, 1, '', 'now')], status: 'in_progress' })).toBe(100)
  })

  it('labels common parts of speech for learners', () => {
    expect(formatMissionPartOfSpeech('verb')).toBe('v · động từ')
    expect(formatMissionPartOfSpeech('noun, adjective')).toBe('n · danh từ / adj · tính từ')
  })
  it('records a skipped question as incorrect with zero points', () => {
    const record = createSkippedMissionAnswer({ id: 'q1', targetTermId: 'term-1', type: 'meaning_recall' }, 1, '', 'now')
    expect(record).toMatchObject({ questionId: 'q1', skipped: true, isCorrect: false, firstTryCorrect: false, score: 0 })
    expect(buildMissionReviewActions([record], new Map())[0].action).toBe('dont_know')
  })

  it('points to an internal near-miss instead of repeating a first-letter hint', () => {
    expect(getMissionRetryFeedback('suspicios', 'suspicious')).toBe('Bạn gần đúng rồi! Hãy kiểm tra lại phần đuôi từ (từ có 10 chữ cái).')
    expect(getMissionRetryFeedback('suspecous', 'suspicious')).toBe('Bạn gần đúng rồi! Hãy kiểm tra lại phần giữa từ (từ có 10 chữ cái).')
    expect(getMissionRetryFeedback('supsicious', 'suspicious')).toBe('Bạn gần đúng rồi! Hãy kiểm tra lại phần đầu từ (từ có 10 chữ cái).')
    expect(getMissionRetryFeedback('look fro', 'look for')).toBe('Bạn gần đúng rồi! Hãy kiểm tra lại phần giữa của từ thứ 2 (từ có 3 chữ cái).')
    expect(getMissionRetryFeedback('take card', 'take care')).toBe('Bạn gần đúng rồi! Hãy kiểm tra lại phần đuôi của từ thứ 2 (từ có 4 chữ cái).')
    expect(getMissionRetryFeedback('different', 'suspicious')).not.toMatch(/gần đúng/i)
  })
  it('moves an occupied Matching translation and clears its previous row', () => {
    expect(selectMatchingTranslation({ a: 'nghĩa A', b: 'nghĩa B' }, 'a', 'nghĩa B')).toEqual({
      a: 'nghĩa B',
    })
    expect(selectMatchingTranslation({ a: 'nghĩa A' }, 'a', '')).toEqual({})
    expect(selectMatchingTranslation({ a: 'nghĩa A' }, 'b', 'nghĩa A')).toEqual({ b: 'nghĩa A' })
  })

  it('caps a hinted first-try answer at partial credit', () => {
    expect(scoreMissionAnswer(true, 1, 0)).toBe(100)
    expect(scoreMissionAnswer(true, 1, 1)).toBe(50)
    expect(scoreMissionAnswer(true, 2, 0)).toBe(50)
    expect(scoreMissionAnswer(false, 1, 0)).toBe(0)
  })

  it('shows only the existing translation of the exact cloze example', () => {
    const target = term({ examples: [
      { sentence: 'They plan to renovate the office.', translation: 'Họ dự định cải tạo văn phòng.' },
      { sentence: 'We renovate homes.', translation: 'Chúng tôi cải tạo nhà.' },
    ] })
    expect(getMissionContextTranslation({ targetTermId: target.globalTermId, sourceExampleIndex: 1 }, [target])).toBe('Chúng tôi cải tạo nhà.')
    expect(getMissionContextTranslation({ targetTermId: target.globalTermId, sourceExampleIndex: 3 }, [target])).toBeNull()
    expect(getMissionContextTranslation({ targetTermId: target.globalTermId, sourceExampleIndex: 0 }, [term({ examples: [{ sentence: 'They plan to renovate the office.' }] })])).toBeNull()
  })
})

describe('mission answer review', () => {
  it('keeps curriculum order and includes the learner submission and correction', () => {
    const definition: MissionDefinition = {
      deckId: 'deck', curriculumFingerprint: 'fp', missionIndex: 0,
      scriptKey: 'standard', scriptVersion: 1, generatorVersion: 1, targetTermIds: ['term-1'],
      stages: [
        { type: 'learn', required: true, targetTermIds: ['term-1'], questions: [] },
        { type: 'matching', required: true, targetTermIds: ['term-1'], questions: [{
          id: 'match-1', type: 'matching', targetTermId: 'term-1', prompt: 'supplier',
          acceptedAnswers: ['nhà cung cấp'],
        }] },
        { type: 'listening_typing', required: true, targetTermIds: ['term-1'], questions: [{
          id: 'q1', type: 'listening_typing', targetTermId: 'term-1', prompt: 'Nghe và nhập từ hoặc cụm từ',
          acceptedAnswers: ['supplier'], audioText: 'supplier', audioUrl: 'supplier.mp3',
        }] },
      ],
    }
    const review = buildMissionReviewItems(definition, [{
      questionId: 'q1', targetTermId: 'term-1', type: 'listening_typing',
      attempts: 2, hintLevel: 1, isCorrect: true, firstTryCorrect: false,
      score: 50, answeredAt: 'now', firstSubmittedAnswer: 'supply', submittedAnswer: 'supplier',
    }, {
      questionId: 'match-1', targetTermId: 'term-1', type: 'matching',
      attempts: 1, hintLevel: 0, isCorrect: false, firstTryCorrect: false,
      score: 0, answeredAt: 'now', submittedAnswer: 'đối thủ',
    }])
    expect(review).toHaveLength(2)
    expect(review[0]).toMatchObject({ stageType: 'matching', answer: { submittedAnswer: 'đối thủ' } })
    expect(review[1]).toMatchObject({
      stageType: 'listening_typing',
      answer: { firstSubmittedAnswer: 'supply', submittedAnswer: 'supplier', score: 50 },
      question: { acceptedAnswers: ['supplier'] },
    })
  })
})
