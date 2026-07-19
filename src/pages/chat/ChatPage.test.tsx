import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatPage } from '@/pages/chat/ChatPage'
import { chatService } from '@/services/supabase/chat.service'

vi.mock('@/services/supabase/client', () => ({ isSupabaseConfigured: true }))
vi.mock('@/services/supabase/chat.service', () => ({
  chatService: {
    listSessions: vi.fn().mockResolvedValue([]),
    listMessages: vi.fn().mockResolvedValue([]),
    deleteSession: vi.fn().mockResolvedValue(undefined),
    sendMessage: vi.fn(),
  },
}))
vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: vi.fn((selector: (state: unknown) => unknown) => selector({
    user: { id: 'user-1' },
    profile: { native_language: 'vi', current_target_language: 'en' },
  })),
}))
vi.mock('@/stores/useSubscriptionStore', () => ({
  useSubscriptionStore: vi.fn((selector: (state: unknown) => unknown) => selector({ isFree: true })),
}))
vi.mock('@/i18n', () => ({
  useI18n: () => ({ t: (key: string, params?: { source?: string }) => {
    if (key === 'chat.verifiedSource') return `Verified source: ${params?.source ?? ''}`
    return ({
      'chat.title': 'AI Tutor', 'chat.newSession': 'New chat', 'chat.empty': 'AI Tutor is ready to practice with you!',
      'chat.emptySession': 'Pick a suggested topic below or type a message to start practicing.', 'chat.placeholder': 'Type a message...', 'chat.send': 'Send',
      'chat.sessionList': 'Chat history', 'chat.demoNotice': 'AI Tutor requires Supabase and an AI provider.',
      'chat.sending': 'Sending...', 'chat.thinking': 'Thinking', 'chat.errorGeneric': 'Something went wrong. Please try again.',
      'chat.errorAI': 'AI is unavailable. Please try again later.', 'chat.quotaReached': 'You have used today’s chat limit.',
      'chat.upgradeForMore': 'Upgrade to Pro for more chat messages.', 'chat.deleteSession': 'Delete this chat?',
      'chat.deleteDescription': 'Messages in this chat will be permanently deleted.', 'chat.deleteConfirm': 'Delete',
      'chat.source.learning_overview': 'Learning progress',
    }[key] ?? key)
  } }),
}))

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter><ChatPage /></MemoryRouter></QueryClientProvider>)
}

describe('ChatPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows the user message and thinking state immediately after sending', async () => {
    let resolveSend: ((value: unknown) => void) | undefined
    vi.mocked(chatService.sendMessage).mockImplementation(() => new Promise((resolve) => {
      resolveSend = resolve
    }) as never)
    renderPage()

    expect(await screen.findByText('AI Tutor is ready to practice with you!')).toBeInTheDocument()
    const textbox = screen.getByPlaceholderText('Type a message...')
    fireEvent.change(textbox, { target: { value: 'Hello' } })
    fireEvent.keyDown(textbox, { key: 'Enter' })

    expect(textbox).toHaveValue('')
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('Thinking')).toBeInTheDocument()
    await waitFor(() => expect(chatService.sendMessage).toHaveBeenCalledTimes(1))

    await act(async () => {
      resolveSend?.({
        session: { id: 'session-1' },
        userMessage: { id: 'message-1', role: 'user', content: 'Hello' },
        assistantMessage: {
          id: 'message-2', role: 'assistant', content: 'Hi there!',
          metadata: { evidence: [{ kind: 'learning_overview', label: 'Learning progress' }] },
        },
        quota: { remainingToday: 9, limitToday: 10 },
        usage: { provider: 'gemini', model: 'test', inputTokens: 1, outputTokens: 1 },
      } as never)
    })

    expect(await screen.findByText('Hi there!')).toBeInTheDocument()
    expect(textbox).toHaveFocus()
    expect(screen.getByText('Verified source: Learning progress')).toBeInTheDocument()
    expect(chatService.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ message: 'Hello', sessionId: null }))
  })

  it('keeps a newline when Shift+Enter is used', async () => {
    renderPage()
    const textbox = await screen.findByPlaceholderText('Type a message...')
    fireEvent.change(textbox, { target: { value: 'Hello' } })
    fireEvent.keyDown(textbox, { key: 'Enter', shiftKey: true })

    expect(chatService.sendMessage).not.toHaveBeenCalled()
  })
})
