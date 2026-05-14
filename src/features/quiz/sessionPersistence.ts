import type { TrueFalseQuestion } from '@/types/quiz.types'
import type { QuizType } from '@/types/quiz.types'
import type { SessionLimit } from '@/types/study.types'

const STORAGE_PREFIX = 'memorylang.quiz.session.'
const ACTIVE_STORAGE_PREFIX = 'memorylang.quiz.activeSession.'
const STORAGE_VERSION = 1

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
  questions: TrueFalseQuestion[]
  index: number
  score: number
}

interface StoredQuizSessionPayload extends StoredQuizSession {
  version: typeof STORAGE_VERSION
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
    if (typeof payload.index !== 'number' || !Number.isFinite(payload.index)) return null
    if (typeof payload.score !== 'number' || !Number.isFinite(payload.score)) return null

    return {
      questions: payload.questions as TrueFalseQuestion[],
      index: Math.max(0, Math.min(Math.trunc(payload.index), payload.questions.length - 1)),
      score: Math.max(0, Math.trunc(payload.score)),
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
