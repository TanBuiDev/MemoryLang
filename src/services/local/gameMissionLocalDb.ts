import Dexie, { type Table } from 'dexie'
import { z } from 'zod'
import type { MissionAttemptState } from '@/features/games/mission/mission.types'

const questionTypeSchema = z.enum([
  'matching',
  'listening_choice',
  'listening_typing',
  'context_cloze',
  'meaning_recall',
  'spelling',
])

const answerRecordSchema = z.object({
  questionId: z.string().min(1),
  targetTermId: z.string().min(1),
  type: questionTypeSchema,
  attempts: z.number().int().min(1),
  hintLevel: z.number().int().min(0),
  isCorrect: z.boolean(),
  firstTryCorrect: z.boolean(),
  score: z.number().min(0).max(100),
  answeredAt: z.string().min(1),
})

const missionAttemptStateSchema = z.object({
  deckId: z.string().min(1),
  curriculumFingerprint: z.string().min(1),
  missionIndex: z.number().int().min(0),
  stageIndex: z.number().int().min(0),
  questionIndex: z.number().int().min(0),
  answers: z.array(answerRecordSchema),
  startedAt: z.string().min(1),
  updatedAt: z.string().min(1),
  status: z.enum(['in_progress', 'completed']),
})

const missionResultSchema = z.object({
  score: z.number().min(0).max(100),
  accuracy: z.number().min(0).max(100),
  firstTryAccuracy: z.number().min(0).max(100),
})

const storedAttemptSchema = z.object({
  key: z.string().min(1),
  userId: z.string().min(1),
  deckId: z.string().min(1),
  curriculumFingerprint: z.string().min(1),
  missionIndex: z.number().int().min(0),
  studySessionId: z.string().nullable(),
  state: missionAttemptStateSchema,
  pendingResult: missionResultSchema.optional(),
  srsSynced: z.boolean().optional(),
  studySessionEnded: z.boolean().optional(),
  progressSynced: z.boolean().optional(),
  updatedAt: z.string().min(1),
})

export interface StoredGameMissionAttempt {
  key: string
  userId: string
  deckId: string
  curriculumFingerprint: string
  missionIndex: number
  studySessionId: string | null
  state: MissionAttemptState
  pendingResult?: { score: number; accuracy: number; firstTryAccuracy: number }
  srsSynced?: boolean
  studySessionEnded?: boolean
  progressSynced?: boolean
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
    const validated = storedAttemptSchema.parse(record) as StoredGameMissionAttempt
    await db.activeAttempts.put(validated)
  },

  async getAttempt(userId: string, deckId: string, curriculumFingerprint: string, missionIndex: number) {
    const key = gameMissionAttemptKey(userId, deckId, curriculumFingerprint, missionIndex)
    const raw = await db.activeAttempts.get(key)
    if (!raw) return null

    const parsed = storedAttemptSchema.safeParse(raw)
    if (!parsed.success) {
      await db.activeAttempts.delete(key)
      return null
    }

    return parsed.data as StoredGameMissionAttempt
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
