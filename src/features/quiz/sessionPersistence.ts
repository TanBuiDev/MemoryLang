import type { QuizType, TranslationInputQuestion } from '@/types/quiz.types'
import type { SessionLimit } from '@/types/study.types'

const STORAGE_PREFIX = 'memorylang.quiz.session.'
const ACTIVE_STORAGE_PREFIX = 'memorylang.quiz.activeSession.'
const STORAGE_VERSION = 2

interface QuizSessionStorageKeyOptions {
  userId?: string | null
  sessionId?: string | null
  selectedDeckId?: string | null
  quizType: QuizType
  questionCount: SessionLimit
  remote: boolean
}

interface QuizActiveSessionStorageKeyOptions {
  userId?: string | null
  sessionId?: string | null
  remote: boolean
}

export interface StoredQuizSession {
  questions: TranslationInputQuestion[]
  index: number
  score: number
  revealedQuestionIds: string[]
  completedQuestionIds: string[]
  fuzzyCorrectQuestionIds: string[]
  deckId: string | null
  wrongQuestionIds: string[]
  totalQuestionIds: string[]
}

interface StoredQuizSessionPayload extends StoredQuizSession {
  version: typeof STORAGE_VERSION
}

function isTranslationQuestion(question: unknown): question is TranslationInputQuestion {
  if (!question || typeof question !== 'object') return false

  const value = question as Partial<TranslationInputQuestion>
  return typeof value.id === 'string'
    && typeof value.userTermId === 'string'
    && typeof value.sourceText === 'string'
    && (typeof value.ipa === 'string' || value.ipa === null)
    && (typeof value.partOfSpeech === 'string' || value.partOfSpeech === null)
    && typeof value.expectedTranslation === 'string'
}

function getStorage() {
  if (typeof window === 'undefined') return null
  return window.sessionStorage
}

export function buildQuizSessionStorageKey({
  userId,
  sessionId,
  selectedDeckId,
  quizType,
  questionCount,
  remote,
}: QuizSessionStorageKeyOptions) {
  const keyParts = [
    remote ? userId ?? 'remote' : 'demo',
    sessionId ?? 'session',
    selectedDeckId ?? 'all',
    quizType,
    String(questionCount),
  ]

  return `${STORAGE_PREFIX}${keyParts.map((part) => encodeURIComponent(part)).join(':')}`
}

function buildActiveQuizSessionStorageKey({
  userId,
  sessionId,
  remote,
}: QuizActiveSessionStorageKeyOptions) {
  return `${ACTIVE_STORAGE_PREFIX}${encodeURIComponent(remote ? userId ?? 'remote' : 'demo')}:${encodeURIComponent(sessionId ?? 'session')}`
}

export function readActiveQuizSessionStorageKey(options: QuizActiveSessionStorageKeyOptions) {
  const storage = getStorage()
  if (!storage) return null
  return storage.getItem(buildActiveQuizSessionStorageKey(options))
}

export function writeActiveQuizSessionStorageKey(options: QuizActiveSessionStorageKeyOptions, sessionStorageKey: string) {
  const storage = getStorage()
  if (!storage) return
  storage.setItem(buildActiveQuizSessionStorageKey(options), sessionStorageKey)
}

export function readStoredQuizSession(key: string): StoredQuizSession | null {
  const storage = getStorage()
  if (!storage) return null

  try {
    const raw = storage.getItem(key)
    if (!raw) return null

    const payload = JSON.parse(raw) as Partial<StoredQuizSessionPayload>
    if (payload.version !== STORAGE_VERSION) return null
    if (!Array.isArray(payload.questions) || payload.questions.length === 0) return null
    if (!payload.questions.every(isTranslationQuestion)) return null
    if (typeof payload.index !== 'number' || !Number.isFinite(payload.index)) return null
    if (typeof payload.score !== 'number' || !Number.isFinite(payload.score)) return null

    return {
      questions: payload.questions,
      index: Math.max(0, Math.min(Math.trunc(payload.index), payload.questions.length - 1)),
      score: Math.max(0, Math.trunc(payload.score)),
      revealedQuestionIds: Array.isArray(payload.revealedQuestionIds)
        ? payload.revealedQuestionIds.filter((id): id is string => typeof id === 'string')
        : [],
      completedQuestionIds: Array.isArray(payload.completedQuestionIds)
        ? payload.completedQuestionIds.filter((id): id is string => typeof id === 'string')
        : [],
      fuzzyCorrectQuestionIds: Array.isArray(payload.fuzzyCorrectQuestionIds)
        ? payload.fuzzyCorrectQuestionIds.filter((id): id is string => typeof id === 'string')
        : [],
      deckId: typeof payload.deckId === 'string' ? payload.deckId : null,
      wrongQuestionIds: Array.isArray(payload.wrongQuestionIds)
        ? payload.wrongQuestionIds.filter((id): id is string => typeof id === 'string')
        : [],
      totalQuestionIds: Array.isArray(payload.totalQuestionIds)
        ? payload.totalQuestionIds.filter((id): id is string => typeof id === 'string')
        : [],
    }
  } catch {
    return null
  }
}

export function writeStoredQuizSession(key: string, session: StoredQuizSession) {
  const storage = getStorage()
  if (!storage || session.questions.length === 0) return

  const payload: StoredQuizSessionPayload = {
    version: STORAGE_VERSION,
    questions: session.questions,
    index: Math.max(0, Math.min(Math.trunc(session.index), session.questions.length - 1)),
    score: Math.max(0, Math.trunc(session.score)),
    revealedQuestionIds: session.revealedQuestionIds,
    completedQuestionIds: session.completedQuestionIds,
    fuzzyCorrectQuestionIds: session.fuzzyCorrectQuestionIds,
    deckId: session.deckId,
    wrongQuestionIds: session.wrongQuestionIds ?? [],
    totalQuestionIds: session.totalQuestionIds ?? [],
  }

  try {
    storage.setItem(key, JSON.stringify(payload))
  } catch {
    // Session persistence is a convenience layer; storage failures should not block quizzes.
  }
}

export function clearStoredQuizSession(key: string) {
  const storage = getStorage()
  if (!storage) return
  storage.removeItem(key)
}

export function findActiveQuizSession(userIdentifier: string): { session: StoredQuizSession; storageKey: string; sessionId: string } | null {
  const storage = getStorage()
  if (!storage) return null

  const prefix = ACTIVE_STORAGE_PREFIX + encodeURIComponent(userIdentifier) + ':'

  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (!key || !key.startsWith(prefix)) continue

    const sessionStorageKey = storage.getItem(key)
    if (!sessionStorageKey) continue

    const session = readStoredQuizSession(sessionStorageKey)
    if (!session) continue

    const sessionId = decodeURIComponent(key.slice(prefix.length))

    return { session, storageKey: sessionStorageKey, sessionId }
  }

  return null
}

export function abandonActiveQuizSession(userIdentifier: string) {
  const storage = getStorage()
  if (!storage) return

  const prefix = ACTIVE_STORAGE_PREFIX + encodeURIComponent(userIdentifier) + ':'

  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (!key || !key.startsWith(prefix)) continue

    const sessionStorageKey = storage.getItem(key)
    if (sessionStorageKey) storage.removeItem(sessionStorageKey)
    storage.removeItem(key)
  }
}
