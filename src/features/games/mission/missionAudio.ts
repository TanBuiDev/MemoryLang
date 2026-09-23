import type { SpeakOptions } from '@/utils/audio'

type AudioEffect = 'matchSuccess' | 'matchError' | 'roundComplete'

export function parseMissionSoundConfig(value: unknown): {
  mode: 'synth' | 'custom_files'
  urls: Partial<Record<AudioEffect, string>>
} {
  if (!value || typeof value !== 'object') return { mode: 'synth', urls: {} }
  const config = value as Record<string, unknown>
  const mode = config.engine_mode === 'custom_files' ? 'custom_files' : 'synth'
  const urls: Partial<Record<AudioEffect, string>> = {}
  if (config.custom_urls && typeof config.custom_urls === 'object') {
    const configured = config.custom_urls as Record<string, unknown>
    for (const effect of ['matchSuccess', 'matchError', 'roundComplete'] as const) {
      const url = configured[effect]
      if (typeof url === 'string' && /^https?:\/\//.test(url)) urls[effect] = url
    }
  }
  return { mode, urls }
}

export function createMissionAudioCoordinator(
  speak: (text: string, options: SpeakOptions) => unknown,
  stop: () => void,
  playEffect: (effect: AudioEffect) => void = () => undefined,
) {
  const playedLearn = new Set<string>()
  const playedCorrect = new Set<string>()
  let replayTimer: ReturnType<typeof setTimeout> | null = null

  const clearReplay = () => {
    if (replayTimer !== null) clearTimeout(replayTimer)
    replayTimer = null
  }

  return {
    playLearn(key: string, text: string, options: SpeakOptions) {
      if (playedLearn.has(key)) return
      playedLearn.add(key)
      clearReplay()
      void speak(text, options)
    },
    correct(key: string, text?: string, options?: SpeakOptions) {
      if (playedCorrect.has(key)) return
      playedCorrect.add(key)
      playEffect('matchSuccess')
      if (text && options) {
        clearReplay()
        replayTimer = setTimeout(() => {
          replayTimer = null
          void speak(text, options)
        }, 450)
      }
    },
    wrong() { playEffect('matchError') },
    complete() { playEffect('roundComplete') },
    transition() {
      clearReplay()
      stop()
    },
    cancelPendingReplay() { clearReplay() },
  }
}
