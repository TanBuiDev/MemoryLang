import Dexie, { type Table } from 'dexie'
import type { StoredStudySession } from '@/features/study/sessionPersistence'
import type { StudySession } from '@/types/study.types'
import type { VocabularyItem } from '@/types/vocabulary.types'
import type { ReviewAction, ReviewResult } from '@/utils/spacedRepetition'

export interface SerializedReviewResult {
  status: ReviewResult['status']
  nextReviewAt: string
  correctIncrement: number
  wrongIncrement: number
  repetition: number
  intervalDays: number
  easeFactor: number
}

export interface PendingReviewAction {
  termId: string
  action: ReviewAction
  reviewedAt: string
  result: SerializedReviewResult
}

interface CachedVocabularyRecord {
  key: string
  userId: string
  deckId: string
  updatedAt: string
  items: VocabularyItem[]
}

interface ActiveStudySessionRecord {
  key: string
  session: StoredStudySession
}

interface PendingStudyRecord {
  userId: string
  actions: PendingReviewAction[]
  viewedTermIds: string[]
  sessionId: string | null
  sessionPatch: Partial<StudySession> | null
  updatedAt: string
}

class StudyLocalDatabase extends Dexie {
  cachedVocabulary!: Table<CachedVocabularyRecord, string>
  activeSessions!: Table<ActiveStudySessionRecord, string>
  pendingStudy!: Table<PendingStudyRecord, string>

  constructor() {
    super('memorylang-study')
    this.version(1).stores({
      cachedVocabulary: 'key,userId,deckId,updatedAt',
      activeSessions: 'key',
      pendingStudy: 'userId,updatedAt',
    })
  }
}

const db = new StudyLocalDatabase()

function vocabularyCacheKey(userId: string, deckId: string | null) {
  return `${userId}:${deckId ?? 'all'}`
}

export function mergeViewedTermIds(current: string[], next: string[]) {
  return Array.from(new Set([...current, ...next].filter(Boolean)))
}

export function mergeReviewActions(current: PendingReviewAction[], next: PendingReviewAction[]) {
  const actionByTerm = new Map<string, PendingReviewAction>()
  for (const action of current) actionByTerm.set(action.termId, action)
  for (const action of next) actionByTerm.set(action.termId, action)
  return Array.from(actionByTerm.values())
}

async function readPending(userId: string): Promise<PendingStudyRecord> {
  return await db.pendingStudy.get(userId) ?? {
    userId,
    actions: [],
    viewedTermIds: [],
    sessionId: null,
    sessionPatch: null,
    updatedAt: new Date(0).toISOString(),
  }
}

async function updatePending(userId: string, update: (pending: PendingStudyRecord) => PendingStudyRecord) {
  await db.transaction('rw', db.pendingStudy, async () => {
    const pending = await readPending(userId)
    await db.pendingStudy.put(update(pending))
  })
}

export const studyLocalDb = {
  async cacheVocabulary(userId: string, deckId: string | null, items: VocabularyItem[]) {
    await db.cachedVocabulary.put({
      key: vocabularyCacheKey(userId, deckId),
      userId,
      deckId: deckId ?? 'all',
      items,
      updatedAt: new Date().toISOString(),
    })
  },

  async getCachedVocabulary(userId: string, deckId: string | null) {
    return (await db.cachedVocabulary.get(vocabularyCacheKey(userId, deckId)))?.items ?? []
  },

  async saveActiveSession(key: string, session: StoredStudySession) {
    await db.activeSessions.put({ key, session })
  },

  async getActiveSession(key: string) {
    return (await db.activeSessions.get(key))?.session ?? null
  },

  async clearActiveSession(key: string) {
    await db.activeSessions.delete(key)
  },

  async addPendingReviewAction(userId: string, action: PendingReviewAction) {
    await updatePending(userId, (pending) => ({
      ...pending,
      actions: mergeReviewActions(pending.actions, [action]),
      updatedAt: new Date().toISOString(),
    }))
  },

  async addPendingViewTermIds(userId: string, termIds: string[]) {
    await updatePending(userId, (pending) => ({
      ...pending,
      viewedTermIds: mergeViewedTermIds(pending.viewedTermIds, termIds),
      updatedAt: new Date().toISOString(),
    }))
  },

  async savePendingSessionSummary(userId: string, sessionId: string | null, sessionPatch: Partial<StudySession>) {
    await updatePending(userId, (pending) => ({
      ...pending,
      sessionId,
      sessionPatch,
      updatedAt: new Date().toISOString(),
    }))
  },

  async getPendingReviewActions(userId: string) {
    return (await readPending(userId)).actions
  },

  async getPendingViewTermIds(userId: string) {
    return (await readPending(userId)).viewedTermIds
  },

  async getPendingStudyChanges(userId: string) {
    const pending = await readPending(userId)
    return {
      actions: pending.actions,
      viewedTermIds: pending.viewedTermIds,
      sessionId: pending.sessionId,
      sessionPatch: pending.sessionPatch,
    }
  },

  async clearPendingStudyChanges(userId: string) {
    await db.pendingStudy.delete(userId)
  },

  async clearAllData() {
    await db.delete()
  },
}
