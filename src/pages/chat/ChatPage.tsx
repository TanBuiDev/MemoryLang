import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bot,
  User,
  MessageCirclePlus,
  Send,
  Trash2,
  Copy,
  Check,
  Volume2,
  Sparkles,
  PlusCircle,
  MessageSquare,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/input'
import { PageHeader } from '@/components/common/PageHeader'
import { useI18n } from '@/i18n'
import { chatService } from '@/services/supabase/chat.service'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'
import { useChatStore } from '@/stores/useChatStore'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
import { ChatApiError, type ChatEvidenceKind, type ChatMessage } from '@/types/chat.types'
import { speak } from '@/utils/audio'
import { soundEffects } from '@/utils/soundEffects'
import { cn } from '@/utils/cn'

interface SuggestionPrompt {
  icon: string
  title: string
  prompt: string
}

const SUGGESTED_PROMPTS: SuggestionPrompt[] = [
  {
    icon: '💡',
    title: 'Giải thích ngữ pháp',
    prompt: 'Giải thích giúp tôi cấu trúc và cách dùng thì Hiện tại Hoàn thành (Present Perfect) kèm ví dụ dễ hiểu.',
  },
  {
    icon: '🗣️',
    title: 'Luyện hội thoại tiếng Anh',
    prompt: 'Hãy đóng vai người phỏng vấn xin việc bằng tiếng Anh và hỏi tôi câu đầu tiên để chúng ta bắt đầu thực hành.',
  },
  {
    icon: '📝',
    title: 'Phân biệt từ hay nhầm',
    prompt: 'Phân biệt sự khác nhau giữa hai từ "Affect" và "Effect" kèm câu ví dụ cụ thể.',
  },
  {
    icon: '📚',
    title: 'Tạo bài tập từ vựng',
    prompt: 'Hãy tạo cho tôi 3 câu bài tập trắc nghiệm nhỏ để kiểm tra từ vựng tiếng Anh trình độ B1.',
  },
]

export function ChatPage() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)
  const isFree = useSubscriptionStore((state) => state.isFree)
  const activeSessionId = useChatStore((state) => state.activeSessionId)
  const setActiveSessionId = useChatStore((state) => state.setActiveSessionId)

  const [draft, setDraft] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [transientMessages, setTransientMessages] = useState<ChatMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)

  const composerRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const sessionsQuery = useQuery({
    queryKey: ['chat-sessions', user?.id],
    queryFn: () => chatService.listSessions(user!.id),
    enabled: isSupabaseConfigured && Boolean(user),
  })

  const messagesQuery = useQuery({
    queryKey: ['chat-messages', activeSessionId],
    queryFn: () => chatService.listMessages(activeSessionId!),
    enabled: isSupabaseConfigured && Boolean(activeSessionId),
  })

  const messages = useMemo(() => {
    const persisted = messagesQuery.data ?? []
    const byId = new Map(persisted.map((message) => [message.id, message]))
    transientMessages.forEach((message) => byId.set(message.id, message))
    return [...byId.values()]
  }, [messagesQuery.data, transientMessages])

  const sendMutation = useMutation({
    mutationFn: (input: { sessionId: string | null; message: string; temporaryMessage: ChatMessage }) =>
      chatService.sendMessage({
        sessionId: input.sessionId,
        message: input.message,
        sourceLanguage: profile?.current_target_language ?? 'en',
        nativeLanguage: profile?.native_language ?? 'vi',
      }),
    onSuccess: (result, input) => {
      setActiveSessionId(result.session.id)
      setTransientMessages((messages) => [
        ...messages.filter((message) => message.id !== input.temporaryMessage.id),
        result.userMessage,
        result.assistantMessage,
      ])
      setError(null)
      soundEffects.play('cardClick')
      void queryClient.invalidateQueries({ queryKey: ['chat-sessions', user?.id] })
      void queryClient.invalidateQueries({ queryKey: ['chat-messages', result.session.id] })
    },
    onError: (cause, input) => {
      setTransientMessages((messages) => messages.filter((message) => message.id !== input.temporaryMessage.id))
      setDraft(input.message)
      soundEffects.play('matchError')
      if (cause instanceof ChatApiError && cause.code === 'CHAT_QUOTA_EXCEEDED') {
        setError(t('chat.quotaReached'))
        return
      }
      if (cause instanceof ChatApiError && cause.code === 'AI_SERVICE_UNAVAILABLE') {
        setError(t('chat.errorAI'))
        return
      }
      setError(t('chat.errorGeneric'))
    },
  })

  // Auto-scroll to bottom on new messages or thinking state
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' })
  }, [messages, sendMutation.isPending])

  const deleteMutation = useMutation({
    mutationFn: (sessionId: string) => chatService.deleteSession(sessionId),
    onSuccess: (_, sessionId) => {
      if (activeSessionId === sessionId) {
        setActiveSessionId(null)
        setTransientMessages([])
      }
      setPendingDeleteId(null)
      void queryClient.invalidateQueries({ queryKey: ['chat-sessions', user?.id] })
    },
  })

  useEffect(() => {
    if (!sendMutation.isPending) composerRef.current?.focus()
  }, [sendMutation.isPending])

  function startNewChat() {
    setActiveSessionId(null)
    setTransientMessages([])
    setError(null)
    setDraft('')
  }

  function selectSession(sessionId: string) {
    setActiveSessionId(sessionId)
    setTransientMessages([])
    setError(null)
  }

  function sendMessageWithContent(text: string) {
    if (!isSupabaseConfigured || !user || !text.trim() || sendMutation.isPending) return
    const message = text.trim()
    const temporaryMessage: ChatMessage = {
      id: `pending-${Date.now()}`,
      session_id: activeSessionId ?? '',
      user_id: user.id,
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
    }
    setTransientMessages((messages) => [...messages, temporaryMessage])
    setDraft('')
    sendMutation.mutate({ sessionId: activeSessionId, message, temporaryMessage })
  }

  function send(event?: FormEvent) {
    event?.preventDefault()
    sendMessageWithContent(draft)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      send()
    }
  }

  const handleCopyMessage = (id: string, text: string) => {
    void navigator.clipboard.writeText(text)
    setCopiedMessageId(id)
    setTimeout(() => setCopiedMessageId(null), 2000)
  }

  const handleSpeakMessage = (text: string) => {
    void speak(text, { lang: profile?.current_target_language ?? 'en-US' })
  }

  if (!isSupabaseConfigured || !user) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <PageHeader eyebrow="AI" title={t('chat.title')} />
        <Card className="max-w-2xl">
          <CardTitle>{t('chat.title')}</CardTitle>
          <CardDescription className="mt-2">{t('chat.demoNotice')}</CardDescription>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col px-4 py-6 space-y-4">
      <PageHeader
        eyebrow="AI Tutor"
        title={t('chat.title')}
        actions={
          <Button onClick={startNewChat} className="flex items-center gap-2 font-black shadow-[3px_3px_0px_0px_#000]">
            <MessageCirclePlus size={18} />
            {t('chat.newSession')}
          </Button>
        }
      />

      <div className="grid min-h-[620px] gap-4 lg:grid-cols-[290px_minmax(0,1fr)]">
        {/* Sidebar Sessions List */}
        <aside className="neo-card flex min-h-0 flex-col p-3 bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_#000]">
          <div className="flex items-center justify-between px-2 py-2 border-b-2 border-slate-900 mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-purple-600" />
              {t('chat.sessionList')}
            </span>
            <button
              onClick={startNewChat}
              title={t('chat.newSession')}
              className="p-1 hover:bg-amber-100 rounded text-slate-900 transition-colors border border-slate-800"
            >
              <PlusCircle className="w-4 h-4 text-slate-900" />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
            {sessionsQuery.data?.length === 0 ? (
              <div className="p-4 text-center text-xs font-bold text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                Chưa có hội thoại nào. Bấm nút <strong>+ Hội thoại mới</strong> để bắt đầu!
              </div>
            ) : (
              sessionsQuery.data?.map((session) => (
                <div
                  key={session.id}
                  className={cn(
                    'group flex items-center gap-1 rounded-lg border-2 border-slate-900 transition-all',
                    activeSessionId === session.id
                      ? 'bg-[#fdc800] text-slate-900 shadow-[2px_2px_0px_0px_#000] font-black'
                      : 'bg-slate-50 text-slate-800 hover:bg-slate-100'
                  )}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    className={cn(
                      'min-w-0 flex-1 justify-start border-0 bg-transparent px-3 py-2 text-left shadow-none text-xs font-bold text-slate-900 hover:bg-transparent',
                      activeSessionId === session.id && 'font-black'
                    )}
                    onClick={() => selectSession(session.id)}
                  >
                    <span className="truncate">{session.title}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label={t('chat.deleteSession')}
                    className={cn(
                      'min-h-8 min-w-8 border-0 bg-transparent p-1 shadow-none text-slate-600 hover:bg-rose-500 hover:text-white transition-colors',
                      activeSessionId === session.id && 'text-slate-900 hover:bg-rose-500 hover:text-white'
                    )}
                    onClick={() => setPendingDeleteId(session.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Main Chat Box */}
        <section className="neo-card flex min-h-0 flex-col p-0 bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_#000] overflow-hidden">
          {/* Messages List Area */}
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 md:p-6 bg-[#fbfbf9]" aria-live="polite">
            {messages.length === 0 ? (
              <div className="flex h-full min-h-[420px] flex-col items-center justify-center text-center space-y-6">
                <div className="w-16 h-16 bg-[#432dd7] border-4 border-slate-900 rounded-2xl flex items-center justify-center shadow-[4px_4px_0px_0px_#000] animate-bounce">
                  <Bot size={36} className="text-white" />
                </div>
                <div className="space-y-1">
                  <h3 className="max-w-md text-xl font-black text-slate-900">
                    {t('chat.empty', { language: profile?.current_target_language ?? 'en' })}
                  </h3>
                  <p className="text-sm font-semibold text-slate-600">{t('chat.emptySession')}</p>
                </div>

                {/* Quick Suggestion Chips */}
                <div className="w-full max-w-2xl pt-2">
                  <div className="text-xs font-black uppercase text-slate-500 tracking-wider mb-3 flex items-center justify-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Gợi ý câu hỏi bắt đầu nhanh
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                    {SUGGESTED_PROMPTS.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => sendMessageWithContent(item.prompt)}
                        className="p-3 bg-white border-2 border-slate-900 rounded-xl shadow-[3px_3px_0px_0px_#000] hover:bg-amber-100 hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-slate-900 group"
                      >
                        <div className="flex items-center gap-2 font-black text-xs">
                          <span>{item.icon}</span>
                          <span className="group-hover:text-purple-700">{item.title}</span>
                        </div>
                        <p className="text-[11px] font-semibold text-slate-600 mt-1 line-clamp-2">{item.prompt}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((message) => {
                const isUser = message.role === 'user'
                const isCopied = copiedMessageId === message.id

                return (
                  <div
                    key={message.id}
                    className={cn('flex items-start gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
                  >
                    {/* Avatar Badge */}
                    <div
                      className={cn(
                        'w-9 h-9 rounded-xl border-2 border-slate-900 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_#000]',
                        isUser ? 'bg-[#fdc800] text-slate-900' : 'bg-[#432dd7] text-white'
                      )}
                    >
                      {isUser ? <User size={18} /> : <Bot size={20} />}
                    </div>

                    {/* Message Bubble */}
                    <div className={cn('max-w-[85%] sm:max-w-[75%] space-y-1.5')}>
                      <div
                        className={cn(
                          'rounded-xl border-2 border-slate-900 px-4 py-3 text-sm font-semibold whitespace-pre-wrap break-words shadow-[3px_3px_0px_0px_#000]',
                          isUser
                            ? 'bg-[#fdc800] text-slate-900'
                            : 'bg-white text-slate-900'
                        )}
                      >
                        {message.content}
                      </div>

                      {/* Assistant Evidence Badges & Actions Bar */}
                      {!isUser && (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                          {message.metadata?.evidence?.length ? (
                            <div className="flex flex-wrap gap-1.5">
                              {message.metadata.evidence.map((evidence) => (
                                <Badge
                                  key={evidence.kind}
                                  className="bg-purple-100 text-purple-900 border border-purple-300 text-[10px] font-bold"
                                >
                                  {t('chat.verifiedSource', { source: t(evidenceKey(evidence.kind)) })}
                                </Badge>
                              ))}
                            </div>
                          ) : <div />}

                          {/* Quick Action Icons */}
                          <div className="flex items-center gap-1 text-slate-500">
                            <button
                              type="button"
                              onClick={() => handleSpeakMessage(message.content)}
                              title="Phát âm thanh mẫu"
                              className="p-1 hover:bg-slate-200 rounded text-slate-700 transition-colors"
                            >
                              <Volume2 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyMessage(message.id, message.content)}
                              title={isCopied ? 'Đã sao chép' : 'Sao chép văn bản'}
                              className="p-1 hover:bg-slate-200 rounded text-slate-700 transition-colors"
                            >
                              {isCopied ? <Check size={14} className="text-emerald-600 font-bold" /> : <Copy size={14} />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}

            {/* Thinking State */}
            {sendMutation.isPending && (
              <div className="flex items-start gap-3 flex-row" role="status">
                <div className="w-9 h-9 rounded-xl border-2 border-slate-900 bg-[#432dd7] text-white flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_#000]">
                  <Bot size={20} />
                </div>
                <div className="flex items-center rounded-xl border-2 border-slate-900 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-[3px_3px_0px_0px_#000]">
                  <Sparkles className="w-4 h-4 text-amber-500 mr-2 animate-spin" />
                  {t('chat.thinking')}
                  <span aria-hidden="true" className="ml-1.5 inline-flex gap-0.5 text-purple-700">
                    <span className="animate-pulse">.</span>
                    <span className="animate-pulse [animation-delay:150ms]">.</span>
                    <span className="animate-pulse [animation-delay:300ms]">.</span>
                  </span>
                </div>
              </div>
            )}

            {/* Scroll Anchor */}
            <div ref={messagesEndRef} />
          </div>

          {/* Form Input Area */}
          <form className="border-t-2 border-slate-900 p-4 bg-white" onSubmit={send}>
            {error ? <p className="mb-2 text-sm font-bold text-rose-600">{error}</p> : null}
            {error === t('chat.quotaReached') && isFree ? (
              <Link className="mb-2 inline-block text-sm font-black text-purple-700 underline" to="/app/upgrade">
                {t('chat.upgradeForMore')}
              </Link>
            ) : null}

            <div className="flex items-end gap-2">
              <Textarea
                ref={composerRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('chat.placeholder')}
                className="min-h-12 max-h-32 resize-y font-medium text-slate-900 border-2 border-slate-900 focus:border-purple-600"
                disabled={sendMutation.isPending}
              />
              <Button
                type="submit"
                aria-label={t('chat.send')}
                disabled={!draft.trim() || sendMutation.isPending}
                className="min-w-12 h-12 px-4 font-black shadow-[3px_3px_0px_0px_#000]"
              >
                <Send size={18} />
                <span className="sr-only">{sendMutation.isPending ? t('chat.sending') : t('chat.send')}</span>
              </Button>
            </div>
          </form>
        </section>
      </div>

      <ConfirmModal
        open={Boolean(pendingDeleteId)}
        title={t('chat.deleteSession')}
        description={t('chat.deleteDescription')}
        confirmLabel={t('chat.deleteConfirm')}
        cancelLabel={t('actions.cancel')}
        confirmDisabled={deleteMutation.isPending}
        onConfirm={() => pendingDeleteId && deleteMutation.mutate(pendingDeleteId)}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  )
}

function evidenceKey(kind: ChatEvidenceKind): string {
  return `chat.source.${kind}`
}
