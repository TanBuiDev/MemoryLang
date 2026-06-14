import { create } from 'zustand'
import type { ListeningMode } from '@/types/listening.types'

interface ListeningState {
  selectedTopicId: string | null
  selectedTestId: string | null
  selectedPartId: string | null
  mode: ListeningMode
  setTopic: (id: string) => void
  setTest: (id: string) => void
  setPart: (id: string) => void
  setMode: (mode: ListeningMode) => void
  reset: () => void
}

export const useListeningStore = create<ListeningState>((set) => ({
  selectedTopicId: null,
  selectedTestId: null,
  selectedPartId: null,
  mode: 'test',
  setTopic: (id) => set({ selectedTopicId: id, selectedTestId: null, selectedPartId: null }),
  setTest: (id) => set({ selectedTestId: id, selectedPartId: null }),
  setPart: (id) => set({ selectedPartId: id }),
  setMode: (mode) => set({ mode }),
  reset: () => set({ selectedTopicId: null, selectedTestId: null, selectedPartId: null, mode: 'test' }),
}))
