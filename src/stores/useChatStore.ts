import { create } from 'zustand'

interface ChatState {
  activeSessionId: string | null
  drafts: Record<string, string>
  isAiModalOpen: boolean
  setActiveSessionId: (sessionId: string | null) => void
  setDraft: (sessionId: string, draft: string) => void
  clearDraft: (sessionId: string) => void
  openAiModal: () => void
  closeAiModal: () => void
  toggleAiModal: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  activeSessionId: null,
  drafts: {},
  isAiModalOpen: false,
  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
  setDraft: (sessionId, draft) =>
    set((state) => ({ drafts: { ...state.drafts, [sessionId]: draft } })),
  clearDraft: (sessionId) =>
    set((state) => {
      const drafts = { ...state.drafts }
      delete drafts[sessionId]
      return { drafts }
    }),
  openAiModal: () => set({ isAiModalOpen: true }),
  closeAiModal: () => set({ isAiModalOpen: false }),
  toggleAiModal: () => set((state) => ({ isAiModalOpen: !state.isAiModalOpen })),
}))
