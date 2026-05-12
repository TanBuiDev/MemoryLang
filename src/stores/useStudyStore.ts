import { create } from 'zustand'
import type { SessionLimit, StudyMode } from '@/types/study.types'

interface StudyState {
  mode: StudyMode
  cardLimit: SessionLimit
  shuffle: boolean
  selectedDeckId: string | null
  setMode: (mode: StudyMode) => void
  setCardLimit: (cardLimit: SessionLimit) => void
  setShuffle: (shuffle: boolean) => void
  setSelectedDeckId: (selectedDeckId: string | null) => void
}

export const useStudyStore = create<StudyState>((set) => ({
  mode: 'two_side',
  cardLimit: 20,
  shuffle: true,
  selectedDeckId: null,
  setMode: (mode) => set({ mode }),
  setCardLimit: (cardLimit) => set({ cardLimit }),
  setShuffle: (shuffle) => set({ shuffle }),
  setSelectedDeckId: (selectedDeckId) => set({ selectedDeckId }),
}))
