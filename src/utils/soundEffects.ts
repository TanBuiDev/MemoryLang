import { useSoundStore } from '@/stores/useSoundStore'

type SoundName =
  | 'cardClick'
  | 'matchSuccess'
  | 'matchError'
  | 'roundComplete'
  | 'lineConnect'
  | 'modalOpen'
  | 'modalClose'
  | 'hover'

class SoundEffectsEngine {
  private audioCtx: AudioContext | null = null
  private audioBuffers: Map<string, AudioBuffer> = new Map()
  private unlocked = false

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass()
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended' && this.unlocked) {
      void this.audioCtx.resume()
    }
    return this.audioCtx
  }

  /**
   * Unlock AudioContext on initial user gesture (iOS / Mobile Autoplay Policy)
   */
  public initMobileUnlock(): () => void {
    if (typeof window === 'undefined' || this.unlocked) return () => {}

    const unlock = () => {
      const ctx = this.getAudioContext()
      if (ctx) {
        if (ctx.state === 'suspended') {
          void ctx.resume()
        }
        this.unlocked = true
      }
      document.removeEventListener('click', unlock)
      document.removeEventListener('touchstart', unlock)
      document.removeEventListener('keydown', unlock)
    }

    document.addEventListener('click', unlock, { once: true })
    document.addEventListener('touchstart', unlock, { once: true })
    document.addEventListener('keydown', unlock, { once: true })

    return () => {
      document.removeEventListener('click', unlock)
      document.removeEventListener('touchstart', unlock)
      document.removeEventListener('keydown', unlock)
    }
  }

  /**
   * Preload audio buffer from a URL for file-based custom SFX
   */
  public async preloadAudioBuffer(name: string, url: string): Promise<boolean> {
    try {
      const ctx = this.getAudioContext()
      if (!ctx) return false
      const res = await fetch(url)
      const arrayBuffer = await res.arrayBuffer()
      const decoded = await ctx.decodeAudioData(arrayBuffer)
      this.audioBuffers.set(name, decoded)
      return true
    } catch (err) {
      console.warn(`[SoundEffectsEngine] Failed to preload sound "${name}" from ${url}:`, err)
      return false
    }
  }

  /**
   * Main play entry point
   */
  public play(name: SoundName) {
    const { sfxEnabled, sfxVolume, sfxEngineMode } = useSoundStore.getState()
    if (!sfxEnabled || sfxVolume <= 0) return

    const ctx = this.getAudioContext()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      void ctx.resume()
    }

    // Custom File mode with preloaded buffer
    if (sfxEngineMode === 'custom_files' && this.audioBuffers.has(name)) {
      this.playBuffer(name, sfxVolume)
      return
    }

    // Default Synthesizer mode (0ms latency, zero assets)
    this.playSynthesized(name, sfxVolume)
  }

  private playBuffer(name: string, volume: number) {
    const ctx = this.getAudioContext()
    const buffer = this.audioBuffers.get(name)
    if (!ctx || !buffer) return

    try {
      const source = ctx.createBufferSource()
      const gainNode = ctx.createGain()

      source.buffer = buffer
      gainNode.gain.setValueAtTime(volume, ctx.currentTime)

      source.connect(gainNode)
      gainNode.connect(ctx.destination)

      source.start(0)
    } catch (e) {
      console.error(`[SoundEffectsEngine] Error playing buffer sound "${name}":`, e)
    }
  }

  private playSynthesized(name: SoundName, masterVolume: number) {
    const ctx = this.getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    switch (name) {
      case 'cardClick':
        this.synthPop(ctx, now, masterVolume * 0.85, 480, 180, 0.07)
        break

      case 'matchSuccess':
        this.synthChime(ctx, now, masterVolume * 0.9)
        break

      case 'matchError':
        this.synthBuzz(ctx, now, masterVolume * 0.85)
        break

      case 'roundComplete':
        this.synthFanfare(ctx, now, masterVolume * 0.95)
        break

      case 'lineConnect':
        this.synthWhoosh(ctx, now, masterVolume * 0.75)
        break

      case 'modalOpen':
        this.synthPop(ctx, now, masterVolume * 0.85, 280, 620, 0.08)
        break

      case 'modalClose':
        this.synthPop(ctx, now, masterVolume * 0.85, 620, 220, 0.08)
        break

      case 'hover':
        this.synthTick(ctx, now, masterVolume * 0.4)
        break
    }
  }

  // --- Web Audio API Synthesizer Sound Builders ---

  /**
   * Frequency pitch-drop or pitch-up Pop sound
   */
  private synthPop(
    ctx: AudioContext,
    start: number,
    vol: number,
    fromFreq: number,
    toFreq: number,
    duration: number
  ) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(fromFreq, start)
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, toFreq), start + duration)

    gain.gain.setValueAtTime(vol, start)
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(start)
    osc.stop(start + duration + 0.01)
  }

  /**
   * Ascending 3-note chord chime (C5 -> E5 -> G5)
   */
  private synthChime(ctx: AudioContext, start: number, vol: number) {
    const notes = [523.25, 659.25, 783.99] // C5, E5, G5
    const noteDuration = 0.09

    notes.forEach((freq, idx) => {
      const noteStart = start + idx * 0.07
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, noteStart)

      gain.gain.setValueAtTime(vol, noteStart)
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDuration + 0.12)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(noteStart)
      osc.stop(noteStart + noteDuration + 0.15)
    })
  }

  /**
   * Clean 2-note minor drop for wrong match (soft, warm, zero speaker buzz distortion)
   */
  private synthBuzz(ctx: AudioContext, start: number, vol: number) {
    const notes = [
      { freq: 349.23, time: 0, dur: 0.11 }, // F4
      { freq: 261.63, time: 0.09, dur: 0.16 }, // C4
    ]

    notes.forEach(({ freq, time, dur }) => {
      const noteStart = start + time
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, noteStart)

      gain.gain.setValueAtTime(vol * 0.65, noteStart)
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + dur)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(noteStart)
      osc.stop(noteStart + dur + 0.01)
    })
  }

  /**
   * 4-note victory fanfare (C5 -> E5 -> G5 -> C6)
   */
  private synthFanfare(ctx: AudioContext, start: number, vol: number) {
    const notes = [
      { freq: 523.25, time: 0, dur: 0.1 },
      { freq: 659.25, time: 0.09, dur: 0.1 },
      { freq: 783.99, time: 0.18, dur: 0.12 },
      { freq: 1046.5, time: 0.3, dur: 0.35 },
    ]

    notes.forEach(({ freq, time, dur }) => {
      const noteStart = start + time
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, noteStart)

      gain.gain.setValueAtTime(vol, noteStart)
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + dur)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(noteStart)
      osc.stop(noteStart + dur + 0.01)
    })
  }

  /**
   * Soft filter sweep / whoosh for connection line
   */
  private synthWhoosh(ctx: AudioContext, start: number, vol: number) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(300, start)
    osc.frequency.linearRampToValueAtTime(600, start + 0.06)

    gain.gain.setValueAtTime(vol, start)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.06)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(start)
    osc.stop(start + 0.07)
  }

  /**
   * Micro click for hover
   */
  private synthTick(ctx: AudioContext, start: number, vol: number) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(1200, start)

    gain.gain.setValueAtTime(vol, start)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.015)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(start)
    osc.stop(start + 0.02)
  }
}

export const soundEffects = new SoundEffectsEngine()
