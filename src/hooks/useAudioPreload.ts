import { useEffect, useRef } from 'react'

const preloaded = new Set<string>()
const MAX_PRELOAD = 6

const preloading = new Set<string>()

function stableKey(items: Array<{ audioUrl?: string | null } | string | null | undefined>, limit: number): string {
  const urls: string[] = []
  for (const item of items) {
    if (urls.length >= limit) break
    const url = typeof item === 'string' ? item : item?.audioUrl ?? null
    if (url) urls.push(url)
  }
  return urls.join('|')
}

export function useAudioPreload(
  items: Array<{ audioUrl?: string | null } | string | null | undefined>,
  limit = 4,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const key = stableKey(items, limit)

  useEffect(() => {
    if (!key) return
    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      const urls: string[] = []

      for (const item of items) {
        if (urls.length >= limit || preloading.size >= MAX_PRELOAD) break
        const url = typeof item === 'string' ? item : item?.audioUrl ?? null
        if (url && !preloaded.has(url) && !preloading.has(url)) {
          urls.push(url)
          preloading.add(url)
        }
      }

      for (const url of urls) {
        const audio = new Audio()
        audio.preload = 'auto'
        audio.src = url
        audio.load()

        const cleanup = () => {
          preloading.delete(url)
          preloaded.add(url)
          audio.removeEventListener('canplaythrough', cleanup)
          audio.removeEventListener('error', cleanup)
        }
        audio.addEventListener('canplaythrough', cleanup)
        audio.addEventListener('error', cleanup)
      }
    }, 150)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [key, limit])
}
