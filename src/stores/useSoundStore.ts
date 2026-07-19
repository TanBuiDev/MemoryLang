import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SfxEngineMode = 'synth' | 'custom_files'

export interface SoundState {
  sfxEnabled: boolean
  sfxVolume: number // 0.0 to 1.0
  sfxEngineMode: SfxEngineMode
  toggleSfx: () => void
  setSfxEnabled: (enabled: boolean) => void
  setSfxVolume: (volume: number) => void
  setEngineMode: (mode: SfxEngineMode) => void
}

export const useSoundStore = create<SoundState>()(
  persist(
    (set) => ({
      sfxEnabled: true,
      sfxVolume: 0.5,
      sfxEngineMode: 'synth',
      toggleSfx: () => set((state) => ({ sfxEnabled: !state.sfxEnabled })),
      setSfxEnabled: (enabled) => set({ sfxEnabled: enabled }),
      setSfxVolume: (volume) => set({ sfxVolume: Math.max(0, Math.min(1, volume)) }),
      setEngineMode: (mode) => set({ sfxEngineMode: mode }),
    }),
    {
      name: 'memorylang-sound-settings',
    }
  )
)
