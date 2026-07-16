import { beforeEach, describe, expect, it, vi } from 'vitest'
import { chatService } from '@/services/supabase/chat.service'

const { from, invoke } = vi.hoisted(() => ({
  from: vi.fn(),
  invoke: vi.fn(),
}))

vi.mock('@/services/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => from(...args),
    functions: { invoke: (...args: unknown[]) => invoke(...args) },
  },
}))

describe('chatService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists only the current user sessions ordered by recent activity', async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ id: 'session-1' }], error: null })
    const eq = vi.fn().mockReturnValue({ order })
    const select = vi.fn().mockReturnValue({ eq })
    from.mockReturnValue({ select })

    await expect(chatService.listSessions('user-1')).resolves.toEqual([{ id: 'session-1' }])
    expect(from).toHaveBeenCalledWith('chat_sessions')
    expect(eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(order).toHaveBeenCalledWith('last_message_at', { ascending: false, nullsFirst: false })
  })

  it('sends the normalized request to the ai-chat Edge Function', async () => {
    invoke.mockResolvedValue({
      data: { session: { id: 'session-1' }, userMessage: { id: 'message-1' } },
      error: null,
    })

    await chatService.sendMessage({
      sessionId: null,
      message: '  Practice coffee ordering  ',
      sourceLanguage: 'en',
      nativeLanguage: 'vi',
    })

    expect(invoke).toHaveBeenCalledWith('ai-chat', {
      body: {
        action: 'send-message',
        sessionId: null,
        message: 'Practice coffee ordering',
        sourceLanguage: 'en',
        nativeLanguage: 'vi',
      },
    })
  })
})
