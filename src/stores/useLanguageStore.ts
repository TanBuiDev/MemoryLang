import { create } from 'zustand'
import type { LanguageCode } from '@/types/language.types'

interface LanguageState {
  nativeLanguage: LanguageCode
  targetLanguage: LanguageCode
  setNativeLanguage: (language: LanguageCode) => void
  setTargetLanguage: (language: LanguageCode) => void
}

export const useLanguageStore = create<LanguageState>((set) => ({
  nativeLanguage: 'vi',
  targetLanguage: 'en',
  setNativeLanguage: (nativeLanguage) => set({ nativeLanguage }),
  setTargetLanguage: (targetLanguage) => set({ targetLanguage }),
}))
