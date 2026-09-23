import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { buildStoredGameMissionAttempt, gameMissionLocalDb, type StoredGameMissionAttempt } from './gameMissionLocalDb'

describe('Mission snapshot', () => {
  it('never lets restored metadata overwrite the newest attempt state', () => {
    const previous = {
      key: 'user:deck:fp:0', userId: 'user', deckId: 'deck', curriculumFingerprint: 'fp', missionIndex: 0,
      studySessionId: 'session', updatedAt: 'old',
      state: { deckId: 'deck', curriculumFingerprint: 'fp', missionIndex: 0, stageIndex: 1, questionIndex: 0, answers: [], startedAt: 'start', updatedAt: 'old', status: 'in_progress' },
    } as StoredGameMissionAttempt
    const nextState = { ...previous.state, stageIndex: 2, updatedAt: 'new' }
    const next = buildStoredGameMissionAttempt(previous, nextState, 'new')
    expect(next.state.stageIndex).toBe(2)
    expect(next.updatedAt).toBe('new')
  })

  it('restores active hint and translation state from local storage', async () => {
    const record = {
      key: 'hint-user:hint-deck:fp:0', userId: 'hint-user', deckId: 'hint-deck', curriculumFingerprint: 'fp', missionIndex: 0,
      studySessionId: null, updatedAt: 'now',
      state: {
        deckId: 'hint-deck', curriculumFingerprint: 'fp', missionIndex: 0,
        stageIndex: 3, questionIndex: 0, answers: [],
        draft: { answerValue: 'sup', attemptNumber: 1, hintLevel: 2, contextTranslationShown: true },
        startedAt: 'start', updatedAt: 'now', status: 'in_progress',
      },
    } as StoredGameMissionAttempt
    await gameMissionLocalDb.saveAttempt(record)
    const restored = await gameMissionLocalDb.getAttempt('hint-user', 'hint-deck', 'fp', 0)
    expect(restored?.state.draft).toEqual(record.state.draft)
    await gameMissionLocalDb.clearAttempt('hint-user', 'hint-deck', 'fp', 0)
  })
})
