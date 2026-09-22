const dbPromise = import('./studyLocalDb').then((m) => m.db)

let currentAudio: HTMLAudioElement | null = null
let currentObjectUrl: string | null = null
let playbackRequestId = 0
const latestAudioUrlByWord = new Map<string, string>()

function stopCurrentAudio() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl)
    currentObjectUrl = null
  }
}

function normalizeWord(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

export async function getCachedAudio(word: string, audioUrl?: string): Promise<Blob | null> {
  try {
    const { audioCache } = await dbPromise
    const record = await audioCache.get(normalizeWord(word))
    if (audioUrl && record?.audioUrl !== audioUrl) return null
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

async function deleteCachedAudio(word: string): Promise<void> {
  try {
    const { audioCache } = await dbPromise
    await audioCache.delete(normalizeWord(word))
  } catch {
    // cache cleanup failures are non-critical
  }
}

interface AudioPlaybackOptions {
  onEnd?: () => void
  repeat?: number
}

export function cancelAudioPlayback() {
  playbackRequestId++
  stopCurrentAudio()
}

export function playCachedOrFetch(
  word: string,
  audioUrl: string | null,
  options: AudioPlaybackOptions = {},
): Promise<boolean> {
  return playCachedOrFetchInternal(word, audioUrl, options, false)
}

async function playCachedOrFetchInternal(
  word: string,
  audioUrl: string | null,
  options: AudioPlaybackOptions,
  skipCache: boolean,
): Promise<boolean> {
  if (!audioUrl) return false

  const requestId = ++playbackRequestId
  stopCurrentAudio()
  const normalizedWord = normalizeWord(word)
  latestAudioUrlByWord.set(normalizedWord, audioUrl)
  let audio: HTMLAudioElement | null = null
  let objectUrl: string | null = null
  let usedCachedBlob = false

  try {
    const blob = skipCache ? null : await getCachedAudio(word, audioUrl)
    if (requestId !== playbackRequestId) return false

    if (blob) {
      usedCachedBlob = true
      objectUrl = URL.createObjectURL(blob)
      audio = new Audio(objectUrl)
      currentAudio = audio
      currentObjectUrl = objectUrl
    } else {
      // IndexedDB cache miss — use Audio element directly (no CORS needed for media elements)
      audio = new Audio(audioUrl)
      currentAudio = audio

      // Background cache: try to fetch + cache (silently fails if CORS not configured on R2)
      void fetch(audioUrl)
        .then((res) => res.ok ? res.blob() : null)
        .then((fetchedBlob) => {
          if (fetchedBlob && latestAudioUrlByWord.get(normalizedWord) === audioUrl) {
            void cacheAudio(word, audioUrl, fetchedBlob)
          }
        })
        .catch(() => {})
    }

    const activeAudio = audio
    const activeObjectUrl = objectUrl
    const repeat = Math.max(1, options.repeat ?? 1)
    let completed = 0
    activeAudio.addEventListener('ended', () => {
      completed++
      if (requestId === playbackRequestId && completed < repeat) {
        activeAudio.currentTime = 0
        void activeAudio.play().catch(() => {})
        return
      }
      if (activeObjectUrl) URL.revokeObjectURL(activeObjectUrl)
      if (currentObjectUrl === activeObjectUrl) currentObjectUrl = null
      if (currentAudio === activeAudio) currentAudio = null
      if (requestId === playbackRequestId) options.onEnd?.()
    })

    await activeAudio.play()
    if (requestId !== playbackRequestId) return false

    return true
  } catch {
    if (currentAudio === audio) currentAudio = null
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    if (currentObjectUrl === objectUrl) currentObjectUrl = null
    if (usedCachedBlob && requestId === playbackRequestId) {
      await deleteCachedAudio(word)
      if (requestId !== playbackRequestId) return false
      return playCachedOrFetchInternal(word, audioUrl, options, true)
    }
    return false
  }
}
