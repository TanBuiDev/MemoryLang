export interface SpeakOptions {
  lang?: string
  rate?: number
  pitch?: number
  repeat?: number
  onEnd?: () => void
  audioUrl?: string | null
}

let lastSpeakId = 0

export async function speak(text: string, options: SpeakOptions = {}) {
  if (options.audioUrl) {
    const { playCachedOrFetch } = await import('@/services/local/audioCache')
    const played = await playCachedOrFetch(text, options.audioUrl)
    if (played) return true
  }

  if (!('speechSynthesis' in window)) return false

  window.speechSynthesis.cancel()
  lastSpeakId++
  const speakId = lastSpeakId

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = options.lang ?? 'en-US'
  utterance.rate = options.rate ?? 1
  utterance.pitch = options.pitch ?? 1

  const repeat = Math.max(1, options.repeat ?? 1)
  let completed = 0

  function speakOnce() {
    if (speakId !== lastSpeakId) return
    completed++
    if (completed <= repeat) {
      utterance.onend = completed < repeat ? speakOnce : (options.onEnd ?? undefined)
      window.speechSynthesis.speak(utterance)
    }
  }

  speakOnce()
  return true
}

export function speakVI(text: string, onEnd?: () => void) {
  if (!('speechSynthesis' in window)) return false

  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'vi-VN'
  utterance.rate = 0.9
  utterance.pitch = 1
  if (onEnd) utterance.onend = onEnd
  window.speechSynthesis.speak(utterance)
  return true
}
