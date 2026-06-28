const dbPromise = import('./studyLocalDb').then((m) => m.db)

let currentAudio: HTMLAudioElement | null = null

function stopCurrentAudio() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }
}

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

  stopCurrentAudio()

  try {
    const blob = await getCachedAudio(word)

    if (blob) {
      const objectUrl = URL.createObjectURL(blob)
      const audio = new Audio(objectUrl)
      currentAudio = audio
      await audio.play()
      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(objectUrl)
        if (currentAudio === audio) currentAudio = null
      })
      return true
    }

    // IndexedDB cache miss — use Audio element directly (no CORS needed for media elements)
    const audio = new Audio(audioUrl)
    currentAudio = audio
    await audio.play()
    audio.addEventListener('ended', () => {
      if (currentAudio === audio) currentAudio = null
    })

    // Background cache: try to fetch + cache (silently fails if CORS not configured on R2)
    void fetch(audioUrl)
      .then((res) => res.ok ? res.blob() : null)
      .then((fetchedBlob) => { if (fetchedBlob) void cacheAudio(word, audioUrl, fetchedBlob) })
      .catch(() => {})

    return true
  } catch {
    currentAudio = null
    return false
  }
}
