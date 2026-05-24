import { create } from 'zustand'
import { defaultStudyHotkeys, sanitizeStudyHotkeys, type StudyHotkeyMap } from '@/features/study/studyHotkeys'
import type { SessionLimit, StudyMode } from '@/types/study.types'

export type RememberConfirmationSeconds = 1 | 2 | 3 | 5

const STUDY_PREFERENCES_KEY = 'memorylang.study.preferences'
export const rememberConfirmationOptions: RememberConfirmationSeconds[] = [1, 2, 3, 5]

interface StoredStudyPreferences {
  requireRememberConfirmation: boolean
  rememberConfirmationSeconds: RememberConfirmationSeconds
  hotkeys: StudyHotkeyMap
}

function getStoredPreferences(): StoredStudyPreferences {
  if (typeof window === 'undefined') {
    return { requireRememberConfirmation: false, rememberConfirmationSeconds: 2, hotkeys: defaultStudyHotkeys }
  }

  try {
    const stored = JSON.parse(window.localStorage.getItem(STUDY_PREFERENCES_KEY) ?? '{}') as Partial<StoredStudyPreferences>
    return {
      requireRememberConfirmation: stored.requireRememberConfirmation === true,
      rememberConfirmationSeconds: rememberConfirmationOptions.includes(stored.rememberConfirmationSeconds as RememberConfirmationSeconds)
        ? stored.rememberConfirmationSeconds as RememberConfirmationSeconds
        : 2,
      hotkeys: sanitizeStudyHotkeys(stored.hotkeys),
    }
  } catch {
    return { requireRememberConfirmation: false, rememberConfirmationSeconds: 2, hotkeys: defaultStudyHotkeys }
  }
}

function storePreferences(preferences: StoredStudyPreferences) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STUDY_PREFERENCES_KEY, JSON.stringify(preferences))
}

interface StudyState {
  mode: StudyMode
  cardLimit: SessionLimit
  shuffle: boolean
  selectedDeckId: string | null
  requireRememberConfirmation: boolean
  rememberConfirmationSeconds: RememberConfirmationSeconds
  hotkeys: StudyHotkeyMap
  setMode: (mode: StudyMode) => void
  setCardLimit: (cardLimit: SessionLimit) => void
  setShuffle: (shuffle: boolean) => void
  setSelectedDeckId: (selectedDeckId: string | null) => void
  setRequireRememberConfirmation: (requireRememberConfirmation: boolean) => void
  setRememberConfirmationSeconds: (rememberConfirmationSeconds: RememberConfirmationSeconds) => void
  setHotkeys: (hotkeys: StudyHotkeyMap) => void
}

const storedPreferences = getStoredPreferences()

export const useStudyStore = create<StudyState>((set) => ({
  mode: 'two_side',
  cardLimit: 20,
  shuffle: true,
  selectedDeckId: null,
  ...storedPreferences,
  setMode: (mode) => set({ mode }),
  setCardLimit: (cardLimit) => set({ cardLimit }),
  setShuffle: (shuffle) => set({ shuffle }),
  setSelectedDeckId: (selectedDeckId) => set({ selectedDeckId }),
  setRequireRememberConfirmation: (requireRememberConfirmation) => set((state) => {
    const preferences = { requireRememberConfirmation, rememberConfirmationSeconds: state.rememberConfirmationSeconds, hotkeys: state.hotkeys }
    storePreferences(preferences)
    return preferences
  }),
  setRememberConfirmationSeconds: (rememberConfirmationSeconds) => set((state) => {
    const preferences = { requireRememberConfirmation: state.requireRememberConfirmation, rememberConfirmationSeconds, hotkeys: state.hotkeys }
    storePreferences(preferences)
    return preferences
  }),
  setHotkeys: (hotkeys) => set((state) => {
    const preferences = { requireRememberConfirmation: state.requireRememberConfirmation, rememberConfirmationSeconds: state.rememberConfirmationSeconds, hotkeys: sanitizeStudyHotkeys(hotkeys) }
    storePreferences(preferences)
    return preferences
  }),
}))
