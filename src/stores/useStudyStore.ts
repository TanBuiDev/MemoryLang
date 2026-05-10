import { create } from 'zustand'
import type { StudyMode } from '@/types/study.types'

interface StudyState {
  mode: StudyMode
  cardLimit: number
  shuffle: boolean
  setMode: (mode: StudyMode) => void
  setCardLimit: (cardLimit: number) => void
  setShuffle: (shuffle: boolean) => void
}

export const useStudyStore = create<StudyState>((set) => ({
  mode: 'two_side',
  cardLimit: 20,
  shuffle: true,
  setMode: (mode) => set({ mode }),
  setCardLimit: (cardLimit) => set({ cardLimit }),
  setShuffle: (shuffle) => set({ shuffle }),
}))
