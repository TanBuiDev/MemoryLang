import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
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
  useI18n: () => ({ t: (key: string) => ({
    'chat.title': 'AI Tutor', 'chat.newSession': 'New chat', 'chat.empty': 'Start practicing English with AI.',
    'chat.emptySession': 'Send the first message.', 'chat.placeholder': 'Type a message...', 'chat.send': 'Send',
    'chat.sessionList': 'Chat history', 'chat.demoNotice': 'AI Tutor requires Supabase and an AI provider.',
    'chat.sending': 'Sending...', 'chat.errorGeneric': 'Something went wrong. Please try again.',
    'chat.errorAI': 'AI is unavailable. Please try again later.', 'chat.quotaReached': 'You have used today’s chat limit.',
    'chat.upgradeForMore': 'Upgrade to Pro for more chat messages.', 'chat.deleteSession': 'Delete this chat?',
    'chat.deleteDescription': 'Messages in this chat will be permanently deleted.', 'chat.deleteConfirm': 'Delete',
  }[key] ?? key) }),
}))

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter><ChatPage /></MemoryRouter></QueryClientProvider>)
}

describe('ChatPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders an empty chat state and sends with Enter', async () => {
    vi.mocked(chatService.sendMessage).mockResolvedValue({
      session: { id: 'session-1' },
      userMessage: { id: 'message-1', role: 'user', content: 'Hello' },
      assistantMessage: { id: 'message-2', role: 'assistant', content: 'Hi there!' },
      quota: { remainingToday: 9, limitToday: 10 },
      usage: { provider: 'gemini', model: 'test', inputTokens: 1, outputTokens: 1 },
    } as never)
    renderPage()

    expect(await screen.findByText('Start practicing English with AI.')).toBeInTheDocument()
    const textbox = screen.getByPlaceholderText('Type a message...')
    fireEvent.change(textbox, { target: { value: 'Hello' } })
    fireEvent.keyDown(textbox, { key: 'Enter' })

    expect(await screen.findByText('Hi there!')).toBeInTheDocument()
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
