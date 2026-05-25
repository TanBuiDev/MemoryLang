export interface SpeakOptions {
  lang?: string
  rate?: number
  pitch?: number
  repeat?: number
  onEnd?: () => void
}

export function speak(text: string, options: SpeakOptions = {}) {
  if (!('speechSynthesis' in window)) return false

  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel()
  }

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = options.lang ?? 'en-US'
  utterance.rate = options.rate ?? 1
  utterance.pitch = options.pitch ?? 1

  const repeat = Math.max(1, options.repeat ?? 1)
  let completed = 0

  function speakOnce() {
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

  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel()
  }

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'vi-VN'
  utterance.rate = 0.9
  utterance.pitch = 1
  if (onEnd) utterance.onend = onEnd
  window.speechSynthesis.speak(utterance)
  return true
}
