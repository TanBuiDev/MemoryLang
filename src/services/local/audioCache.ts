const dbPromise = import('./studyLocalDb').then((m) => m.db)

function normalizeWord(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

export async function getCachedAudio(word: string): Promise<Blob | null> {
  try {
    const { audioCache } = await dbPromise
    const record = await audioCache.get(normalizeWord(word))
    return record?.blob ?? null
  } catch {
    return null
  }
}

export async function cacheAudio(word: string, audioUrl: string, blob: Blob): Promise<void> {
  try {
    const { audioCache } = await dbPromise
    await audioCache.put({
      word: normalizeWord(word),
      blob,
      audioUrl,
      cachedAt: new Date().toISOString(),
    })
  } catch {
    // cache failures are non-critical
  }
}

export async function playCachedOrFetch(word: string, audioUrl: string | null): Promise<boolean> {
  if (!audioUrl) return false

  try {
    let blob = await getCachedAudio(word)

    if (!blob) {
      const response = await fetch(audioUrl)
      if (!response.ok) return false
      blob = await response.blob()
      await cacheAudio(word, audioUrl, blob)
    }

    const objectUrl = URL.createObjectURL(blob)
    const audio = new Audio(objectUrl)
    await audio.play()
    audio.addEventListener('ended', () => URL.revokeObjectURL(objectUrl))
    return true
  } catch {
    return false
  }
}
