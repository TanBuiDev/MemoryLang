import Dexie, { type Table } from 'dexie'
import type { MissionAttemptState } from '@/features/games/mission/mission.types'

export interface StoredGameMissionAttempt {
  key: string
  userId: string
  deckId: string
  curriculumFingerprint: string
  missionIndex: number
  studySessionId: string | null
  state: MissionAttemptState
  updatedAt: string
}

class GameMissionDatabase extends Dexie {
  activeAttempts!: Table<StoredGameMissionAttempt, string>

  constructor() {
    super('memorylang-game')
    this.version(1).stores({
      activeAttempts: 'key,userId,deckId,curriculumFingerprint,missionIndex,updatedAt',
    })
  }
}

const db = new GameMissionDatabase()

export function gameMissionAttemptKey(
  userId: string,
  deckId: string,
  curriculumFingerprint: string,
  missionIndex: number,
) {
  return [userId, deckId, curriculumFingerprint, missionIndex].join(':')
}

export const gameMissionLocalDb = {
  async saveAttempt(record: StoredGameMissionAttempt) {
    await db.activeAttempts.put(record)
  },

  async getAttempt(userId: string, deckId: string, curriculumFingerprint: string, missionIndex: number) {
    return await db.activeAttempts.get(gameMissionAttemptKey(userId, deckId, curriculumFingerprint, missionIndex)) ?? null
  },

  async clearAttempt(userId: string, deckId: string, curriculumFingerprint: string, missionIndex: number) {
    await db.activeAttempts.delete(gameMissionAttemptKey(userId, deckId, curriculumFingerprint, missionIndex))
  },

  async clearStaleAttempts(userId: string, deckId: string, currentFingerprint: string) {
    const attempts = await db.activeAttempts
      .where('userId')
      .equals(userId)
      .filter((record) => record.deckId === deckId && record.curriculumFingerprint !== currentFingerprint)
      .toArray()
    await db.activeAttempts.bulkDelete(attempts.map((record) => record.key))
  },
}
