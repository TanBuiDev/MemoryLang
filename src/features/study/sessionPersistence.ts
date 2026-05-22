import type { SessionLimit, StudyMode } from '@/types/study.types'
import type { VocabularyItem } from '@/types/vocabulary.types'

const STORAGE_PREFIX = 'memorylang.study.session.'
const ACTIVE_STORAGE_PREFIX = 'memorylang.study.activeSession.'
const STORAGE_VERSION = 1
const studyModes: StudyMode[] = ['two_side', 'one_side', 'quick_flash', 'audio_only', 'meaning_first', 'ipa_first', 'example_first']

interface StudySessionStorageKeyOptions {
  userId?: string | null
  sessionId?: string | null
  selectedDeckId?: string | null
  mode: StudyMode
  cardLimit: SessionLimit
  shuffle: boolean
  remote: boolean
}

interface StudyActiveSessionStorageKeyOptions {
  userId?: string | null
  sessionId?: string | null
  remote: boolean
}

export interface StoredStudySession {
  vocabulary: VocabularyItem[]
  index: number
  mode: StudyMode
  viewedTermIds: string[]
  flushedViewTermIds: string[]
}

interface StoredStudySessionPayload extends StoredStudySession {
  version: typeof STORAGE_VERSION
}

function getStorage() {
  if (typeof window === 'undefined') return null
  return window.sessionStorage
}

function isStudyMode(value: unknown): value is StudyMode {
  return typeof value === 'string' && studyModes.includes(value as StudyMode)
}

function readModeFromSessionStorageKey(key: string) {
  if (!key.startsWith(STORAGE_PREFIX)) return null
  const parts = key.slice(STORAGE_PREFIX.length).split(':').map((part) => decodeURIComponent(part))
  const mode = parts[3]
  return isStudyMode(mode) ? mode : null
}

export function buildStudySessionStorageKey({
  userId,
  sessionId,
  selectedDeckId,
  mode,
  cardLimit,
  shuffle,
  remote,
}: StudySessionStorageKeyOptions) {
  const keyParts = [
    remote ? userId ?? 'remote' : 'demo',
    sessionId ?? 'session',
    selectedDeckId ?? 'all',
    mode,
    String(cardLimit),
    String(shuffle),
  ]

  return `${STORAGE_PREFIX}${keyParts.map((part) => encodeURIComponent(part)).join(':')}`
}

function buildActiveStudySessionStorageKey({
  userId,
  sessionId,
  remote,
}: StudyActiveSessionStorageKeyOptions) {
  return `${ACTIVE_STORAGE_PREFIX}${encodeURIComponent(remote ? userId ?? 'remote' : 'demo')}:${encodeURIComponent(sessionId ?? 'session')}`
}

export function readActiveStudySessionStorageKey(options: StudyActiveSessionStorageKeyOptions) {
  const storage = getStorage()
  if (!storage) return null
  return storage.getItem(buildActiveStudySessionStorageKey(options))
}

export function writeActiveStudySessionStorageKey(options: StudyActiveSessionStorageKeyOptions, sessionStorageKey: string) {
  const storage = getStorage()
  if (!storage) return
  storage.setItem(buildActiveStudySessionStorageKey(options), sessionStorageKey)
}

export function readStoredStudySession(key: string): StoredStudySession | null {
  const storage = getStorage()
  if (!storage) return null

  try {
    const raw = storage.getItem(key)
    if (!raw) return null

    const payload = JSON.parse(raw) as Partial<StoredStudySessionPayload>
    if (payload.version !== STORAGE_VERSION) return null
    if (!Array.isArray(payload.vocabulary) || payload.vocabulary.length === 0) return null
    if (typeof payload.index !== 'number' || !Number.isFinite(payload.index)) return null
    const storedMode = isStudyMode(payload.mode) ? payload.mode : readModeFromSessionStorageKey(key)
    if (!storedMode) return null

    return {
      vocabulary: payload.vocabulary as VocabularyItem[],
      index: Math.max(0, Math.min(Math.trunc(payload.index), payload.vocabulary.length - 1)),
      mode: storedMode,
      viewedTermIds: Array.isArray(payload.viewedTermIds) ? payload.viewedTermIds.filter((id): id is string => typeof id === 'string') : [],
      flushedViewTermIds: Array.isArray(payload.flushedViewTermIds) ? payload.flushedViewTermIds.filter((id): id is string => typeof id === 'string') : [],
    }
  } catch {
    return null
  }
}

export function writeStoredStudySession(key: string, session: StoredStudySession) {
  const storage = getStorage()
  if (!storage || session.vocabulary.length === 0) return

  const payload: StoredStudySessionPayload = {
    version: STORAGE_VERSION,
    vocabulary: session.vocabulary,
    index: Math.max(0, Math.min(Math.trunc(session.index), session.vocabulary.length - 1)),
    mode: session.mode,
    viewedTermIds: session.viewedTermIds,
    flushedViewTermIds: session.flushedViewTermIds,
  }

  try {
    storage.setItem(key, JSON.stringify(payload))
  } catch {
    // Session persistence is a convenience layer; storage failures should not block studying.
  }
}

export function clearStoredStudySession(key: string) {
  const storage = getStorage()
  if (!storage) return
  storage.removeItem(key)
}

export function hasActiveStudySession(): string | null {
  const storage = getStorage()
  if (!storage) return null

  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (!key || !key.startsWith(ACTIVE_STORAGE_PREFIX)) continue

    const sessionStorageKey = storage.getItem(key)
    if (!sessionStorageKey) continue

    const storedSession = readStoredStudySession(sessionStorageKey)
    if (!storedSession) continue

    const parts = key.slice(ACTIVE_STORAGE_PREFIX.length).split(':').map(decodeURIComponent)
    const sessionId = parts[1] ?? 'deck-session'

    return `/app/study/session/${sessionId}`
  }

  return null
}

export function clearActiveStudySession(options: StudyActiveSessionStorageKeyOptions) {
  const storage = getStorage()
  if (!storage) return
  storage.removeItem(buildActiveStudySessionStorageKey(options))
}
