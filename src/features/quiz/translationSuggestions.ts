export interface TranslationSuggestion {
  userTermId: string
  sourceText: string
  suggestedTranslation: string
  existingTranslation: string
  createdAt: number
}

const STORAGE_PREFIX = 'memorylang.quiz.suggestions.'

function buildKey(userId?: string | null): string {
  return `${STORAGE_PREFIX}${userId ?? 'demo'}`
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  return window.sessionStorage
}

function deduplicateByTermId(suggestions: TranslationSuggestion[]): TranslationSuggestion[] {
  const seen = new Set<string>()
  return suggestions.filter((s) => {
    if (seen.has(s.userTermId)) return false
    seen.add(s.userTermId)
    return true
  })
}

export function getPendingSuggestions(userId?: string | null): TranslationSuggestion[] {
  const storage = getStorage()
  if (!storage) return []

  try {
    const raw = storage.getItem(buildKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return deduplicateByTermId(
      parsed.filter(
        (s): s is TranslationSuggestion =>
          typeof s.userTermId === 'string' &&
          typeof s.sourceText === 'string' &&
          typeof s.suggestedTranslation === 'string' &&
          typeof s.existingTranslation === 'string' &&
          typeof s.createdAt === 'number',
      ),
    )
  } catch {
    return []
  }
}

export function addTranslationSuggestion(
  suggestion: TranslationSuggestion,
  userId?: string | null,
): void {
  const storage = getStorage()
  if (!storage) return

  const existing = getPendingSuggestions(userId)
  if (existing.some((s) => s.userTermId === suggestion.userTermId)) return

  const updated = deduplicateByTermId([suggestion, ...existing])

  try {
    storage.setItem(buildKey(userId), JSON.stringify(updated))
  } catch {
    // storage failures are non-critical
  }
}

export function removeTranslationSuggestion(userTermId: string, userId?: string | null): void {
  const storage = getStorage()
  if (!storage) return

  const suggestions = getPendingSuggestions(userId).filter((s) => s.userTermId !== userTermId)

  try {
    storage.setItem(buildKey(userId), JSON.stringify(suggestions))
  } catch {
    // storage failures are non-critical
  }
}

export function clearAllSuggestions(userId?: string | null): void {
  const storage = getStorage()
  if (!storage) return

  try {
    storage.removeItem(buildKey(userId))
  } catch {
    // storage failures are non-critical
  }
}
