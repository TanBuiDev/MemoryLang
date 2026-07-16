import type { LanguageCode } from '@/types/language.types'

export type ChatRole = 'user' | 'assistant'
export type AiProviderName = 'gemini' | 'openai'

export interface ChatSession {
  id: string
  user_id: string
  title: string
  source_language: LanguageCode
  native_language: LanguageCode
  message_count: number
  last_message_at: string | null
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  session_id: string
  user_id: string
  role: ChatRole
  content: string
  created_at: string
}

export interface CreateChatSessionInput {
  userId: string
  sourceLanguage: LanguageCode
  nativeLanguage: LanguageCode
  title?: string
}

export interface SendChatMessageInput {
  sessionId: string | null
  message: string
  sourceLanguage: LanguageCode
  nativeLanguage: LanguageCode
}

export interface ChatQuota {
  remainingToday: number
  limitToday: number
}

export interface ChatUsage {
  provider: AiProviderName
  model: string
  inputTokens: number
  outputTokens: number
}

export interface SendChatMessageResponse {
  session: ChatSession
  userMessage: ChatMessage
  assistantMessage: ChatMessage
  quota: ChatQuota
  usage: ChatUsage
}

export class ChatApiError extends Error {
  public readonly code: string
  public readonly status?: number

  constructor(
    message: string,
    code: string,
    status?: number,
  ) {
    super(message)
    this.name = 'ChatApiError'
    this.code = code
    this.status = status
  }
}
