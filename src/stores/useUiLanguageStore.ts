import { create } from 'zustand'
import type { UiLanguageCode } from '@/types/auth.types'

function getInitialUiLanguage(): UiLanguageCode | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem('memorylang-ui-language')
  if (stored === 'vi' || stored === 'en') return stored
  return null
}

interface UiLanguageState {
  uiLanguage: UiLanguageCode | null
  setUiLanguage: (language: UiLanguageCode) => void
}

export const useUiLanguageStore = create<UiLanguageState>((set) => ({
  uiLanguage: getInitialUiLanguage(),
  setUiLanguage: (language) => {
    localStorage.setItem('memorylang-ui-language', language)
    set({ uiLanguage: language })
  },
}))
