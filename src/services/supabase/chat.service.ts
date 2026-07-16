import { supabase } from '@/services/supabase/client'
import type {
  ChatMessage,
  ChatSession,
  CreateChatSessionInput,
  SendChatMessageInput,
  SendChatMessageResponse,
} from '@/types/chat.types'
import { ChatApiError } from '@/types/chat.types'

async function throwIfError(error: { message: string; context?: Response } | null): Promise<void> {
  if (!error) return
  const payload = await error.context?.clone().json().catch(() => null) as {
    error?: { code?: string; message?: string }
  } | null
  throw new ChatApiError(
    payload?.error?.message ?? error.message,
    payload?.error?.code ?? 'CHAT_REQUEST_FAILED',
    error.context?.status,
  )
}

export const chatService = {
  async listSessions(userId: string): Promise<ChatSession[]> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (error) throw error
    return (data ?? []) as ChatSession[]
  },

  async createSession(input: CreateChatSessionInput): Promise<ChatSession> {
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: input.userId,
        source_language: input.sourceLanguage,
        native_language: input.nativeLanguage,
        title: input.title?.trim() || 'New chat',
      })
      .select('*')
      .single()

    if (error) throw error
    return data as ChatSession
  },

  async renameSession(sessionId: string, title: string): Promise<void> {
    const { error } = await supabase
      .from('chat_sessions')
      .update({ title: title.trim() })
      .eq('id', sessionId)

    if (error) throw error
  },

  async deleteSession(sessionId: string): Promise<void> {
    const { error } = await supabase.from('chat_sessions').delete().eq('id', sessionId)
    if (error) throw error
  },

  async listMessages(sessionId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data ?? []) as ChatMessage[]
  },

  async sendMessage(input: SendChatMessageInput): Promise<SendChatMessageResponse> {
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        action: 'send-message',
        sessionId: input.sessionId,
        message: input.message.trim(),
        sourceLanguage: input.sourceLanguage,
        nativeLanguage: input.nativeLanguage,
      },
    })

    await throwIfError(error)
    if (data?.error) {
      throw new ChatApiError(data.error.message ?? 'Chat request failed.', data.error.code ?? 'CHAT_REQUEST_FAILED')
    }
    return data as SendChatMessageResponse
  },
}
