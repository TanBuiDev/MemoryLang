import { describe, expect, it } from 'vitest'
import { buildStoredGameMissionAttempt, type StoredGameMissionAttempt } from './gameMissionLocalDb'

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
})
