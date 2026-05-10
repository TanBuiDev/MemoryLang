export interface SpeakOptions {
  lang?: string
  rate?: number
  pitch?: number
}

export function speak(text: string, options: SpeakOptions = {}) {
  if (!('speechSynthesis' in window)) return false

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = options.lang ?? 'en-US'
  utterance.rate = options.rate ?? 1
  utterance.pitch = options.pitch ?? 1
  window.speechSynthesis.speak(utterance)
  return true
}
