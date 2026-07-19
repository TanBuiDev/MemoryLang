import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SfxEngineMode = 'synth' | 'custom_files'

export interface SoundState {
  sfxEnabled: boolean
  sfxVolume: number // 0.0 to 1.0
  sfxEngineMode: SfxEngineMode
  customSoundUrls: Record<string, string>
  toggleSfx: () => void
  setSfxEnabled: (enabled: boolean) => void
  setSfxVolume: (volume: number) => void
  setEngineMode: (mode: SfxEngineMode) => void
  setCustomSoundUrl: (id: string, url: string) => void
  setCustomSoundUrls: (urls: Record<string, string>) => void
}

export const useSoundStore = create<SoundState>()(
  persist(
    (set) => ({
      sfxEnabled: true,
      sfxVolume: 0.5,
      sfxEngineMode: 'synth',
      customSoundUrls: {},
      toggleSfx: () => set((state) => ({ sfxEnabled: !state.sfxEnabled })),
      setSfxEnabled: (enabled) => set({ sfxEnabled: enabled }),
      setSfxVolume: (volume) => set({ sfxVolume: Math.max(0, Math.min(1, volume)) }),
      setEngineMode: (mode) => set({ sfxEngineMode: mode }),
      setCustomSoundUrl: (id, url) =>
        set((state) => ({
          customSoundUrls: { ...state.customSoundUrls, [id]: url },
        })),
      setCustomSoundUrls: (urls) => set({ customSoundUrls: urls }),
    }),
    {
      name: 'memorylang-sound-settings',
    }
  )
)
