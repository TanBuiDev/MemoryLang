import { create } from 'zustand'

interface ChatState {
  activeSessionId: string | null
  drafts: Record<string, string>
  setActiveSessionId: (sessionId: string | null) => void
  setDraft: (sessionId: string, draft: string) => void
  clearDraft: (sessionId: string) => void
}

export const useChatStore = create<ChatState>((set) => ({
  activeSessionId: null,
  drafts: {},
  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
  setDraft: (sessionId, draft) => set((state) => ({ drafts: { ...state.drafts, [sessionId]: draft } })),
  clearDraft: (sessionId) => set((state) => {
    const drafts = { ...state.drafts }
    delete drafts[sessionId]
    return { drafts }
  }),
}))
