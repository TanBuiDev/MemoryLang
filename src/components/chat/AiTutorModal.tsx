import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bot,
  User,
  Send,
  Trash2,
  Copy,
  Check,
  Volume2,
  Sparkles,
  PlusCircle,
  MessageSquare,
  X,
  Maximize2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/input'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { useI18n } from '@/i18n'
import { chatService } from '@/services/supabase/chat.service'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'
import { useChatStore } from '@/stores/useChatStore'
import { ChatApiError, type ChatMessage } from '@/types/chat.types'
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
    title: 'Giải thích từ vựng / Ngữ pháp',
    prompt: 'Giải thích giúp tôi cấu trúc và cách dùng thì Hiện tại Hoàn thành (Present Perfect) kèm ví dụ.',
  },
  {
    icon: '🗣️',
    title: 'Luyện hội thoại tiếng Anh',
    prompt: 'Hãy đóng vai người phỏng vấn xin việc bằng tiếng Anh và hỏi tôi câu đầu tiên để thực hành.',
  },
  {
    icon: '📝',
    title: 'Phân biệt từ dễ nhầm lẫn',
    prompt: 'Phân biệt sự khác nhau giữa hai từ "Affect" và "Effect" kèm câu ví dụ cụ thể.',
  },
  {
    icon: '📚',
    title: 'Tạo bài tập nhanh',
    prompt: 'Hãy tạo cho tôi 3 câu bài tập trắc nghiệm nhỏ để kiểm tra từ vựng trình độ B1.',
  },
]

export function AiTutorModal() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)

  const isAiModalOpen = useChatStore((state) => state.isAiModalOpen)
  const closeAiModal = useChatStore((state) => state.closeAiModal)
  const toggleAiModal = useChatStore((state) => state.toggleAiModal)
  const activeSessionId = useChatStore((state) => state.activeSessionId)
  const setActiveSessionId = useChatStore((state) => state.setActiveSessionId)

  const [draft, setDraft] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [transientMessages, setTransientMessages] = useState<ChatMessage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [showSidebar, setShowSidebar] = useState(false)

  const composerRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Listen for Ctrl+K / Cmd+K global shortcut to toggle AI Modal
  useEffect(() => {
    function handleGlobalKeyDown(e: globalThis.KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        toggleAiModal()
      }
      if (e.key === 'Escape' && isAiModalOpen) {
        closeAiModal()
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [isAiModalOpen, toggleAiModal, closeAiModal])

  const sessionsQuery = useQuery({
    queryKey: ['chat-sessions', user?.id],
    queryFn: () => chatService.listSessions(user!.id),
    enabled: isSupabaseConfigured && Boolean(user) && isAiModalOpen,
  })

  const messagesQuery = useQuery({
    queryKey: ['chat-messages', activeSessionId],
    queryFn: () => chatService.listMessages(activeSessionId!),
    enabled: isSupabaseConfigured && Boolean(activeSessionId) && isAiModalOpen,
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

  // Auto-scroll to bottom
  useEffect(() => {
    if (isAiModalOpen) {
      messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' })
    }
  }, [messages, sendMutation.isPending, isAiModalOpen])

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
    if (isAiModalOpen && !sendMutation.isPending) {
      composerRef.current?.focus()
    }
  }, [isAiModalOpen, sendMutation.isPending])

  if (!isAiModalOpen) return null

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
    setShowSidebar(false)
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

  const handleOpenFullPage = () => {
    closeAiModal()
    navigate('/app/chat')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      {/* Modal Container */}
      <div className="w-full max-w-4xl h-[85vh] max-h-[720px] neo-card bg-white border-4 border-slate-900 shadow-[8px_8px_0px_0px_#000] flex flex-col overflow-hidden relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#fdc800] border-b-4 border-slate-900 select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#432dd7] border-2 border-slate-900 rounded-lg flex items-center justify-center text-white shadow-[2px_2px_0px_0px_#000]">
              <Bot size={18} />
            </div>
            <div>
              <h2 className="font-black text-slate-900 text-base leading-tight">Tra cứu & Hỏi đáp với Gia sư AI</h2>
              <p className="text-[11px] font-bold text-slate-800 hidden sm:block">
                Hỏi đáp tức thì trong lúc học từ vựng hoặc làm bài tập
              </p>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2">
            <span className="hidden md:inline-block px-2 py-0.5 text-[10px] font-black uppercase bg-slate-900 text-white rounded border border-slate-900">
              Ctrl + K
            </span>

            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-1.5 bg-white border-2 border-slate-900 rounded-lg hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center gap-1 shadow-[2px_2px_0px_0px_#000] sm:hidden"
            >
              <MessageSquare size={14} />
            </button>

            <button
              onClick={handleOpenFullPage}
              title="Mở toàn màn hình"
              className="p-1.5 bg-white border-2 border-slate-900 rounded-lg hover:bg-slate-100 text-slate-900 shadow-[2px_2px_0px_0px_#000] transition-transform active:translate-x-0.5 active:translate-y-0.5"
            >
              <Maximize2 size={16} />
            </button>

            <button
              onClick={closeAiModal}
              title="Đóng Modal (Esc)"
              className="p-1.5 bg-rose-400 text-slate-900 border-2 border-slate-900 rounded-lg hover:bg-rose-500 shadow-[2px_2px_0px_0px_#000] transition-transform active:translate-x-0.5 active:translate-y-0.5"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body Grid */}
        <div className="grid flex-1 min-h-0 sm:grid-cols-[240px_minmax(0,1fr)] bg-[#fbfbf9] relative">
          {/* Sidebar Sessions (Collapsible on Mobile, Fixed on Desktop) */}
          <aside
            className={cn(
              'neo-card flex min-h-0 flex-col p-2.5 bg-white border-r-4 border-slate-900 z-10 transition-all',
              showSidebar ? 'absolute inset-y-0 left-0 w-64 shadow-2xl sm:relative sm:w-auto' : 'hidden sm:flex'
            )}
          >
            <div className="flex items-center justify-between px-2 py-1.5 border-b-2 border-slate-900 mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                Lịch sử hội thoại
              </span>
              <button
                onClick={startNewChat}
                title="Tạo hội thoại mới"
                className="p-1 hover:bg-amber-100 rounded text-slate-900 border border-slate-800"
              >
                <PlusCircle className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
              {sessionsQuery.data?.length === 0 ? (
                <div className="p-3 text-center text-[11px] font-bold text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                  Bấm <strong>+ Hội thoại mới</strong> để bắt đầu hỏi!
                </div>
              ) : (
                sessionsQuery.data?.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      'group flex items-center gap-1 rounded-lg border-2 border-slate-900 transition-all text-xs',
                      activeSessionId === session.id
                        ? 'bg-[#fdc800] text-slate-900 shadow-[2px_2px_0px_0px_#000] font-black'
                        : 'bg-slate-50 text-slate-800 hover:bg-slate-100'
                    )}
                  >
                    <button
                      type="button"
                      className={cn(
                        'min-w-0 flex-1 justify-start border-0 bg-transparent px-2.5 py-1.5 text-left text-xs font-bold text-slate-900 truncate',
                        activeSessionId === session.id && 'font-black'
                      )}
                      onClick={() => selectSession(session.id)}
                    >
                      <span className="truncate">{session.title}</span>
                    </button>
                    <button
                      type="button"
                      aria-label="Xóa hội thoại"
                      className="p-1 text-slate-600 hover:bg-rose-500 hover:text-white rounded"
                      onClick={() => setPendingDeleteId(session.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </aside>

          {/* Chat Main Area */}
          <section className="flex min-h-0 flex-col bg-[#fbfbf9]">
            {/* Messages View */}
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5" aria-live="polite">
              {!isSupabaseConfigured || !user ? (
                <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center p-4 space-y-4">
                  <div className="w-16 h-16 bg-[#fdc800] border-3 border-slate-900 rounded-2xl flex items-center justify-center text-slate-900 shadow-[4px_4px_0px_0px_#000] animate-bounce">
                    <Bot size={36} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-slate-900">Trò chuyện với Gia sư AI 24/7</h3>
                    <p className="text-xs sm:text-sm font-semibold text-slate-600 max-w-md">
                      Đăng nhập tài khoản miễn phí để hỏi đáp ngữ pháp, tra cứu từ vựng và lưu lại lịch sử hội thoại của bạn.
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      closeAiModal()
                      navigate('/login')
                    }}
                    className="px-6 py-2.5 font-black text-sm shadow-[3px_3px_0px_0px_#000]"
                  >
                    Đăng nhập / Đăng ký ngay ✨
                  </Button>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center space-y-5">
                  <div className="w-14 h-14 bg-[#432dd7] border-3 border-slate-900 rounded-2xl flex items-center justify-center shadow-[3px_3px_0px_0px_#000]">
                    <Bot size={32} className="text-white" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-slate-900">Gia sư AI sẵn sàng đồng hành cùng bạn!</h3>
                    <p className="text-xs font-semibold text-slate-600">
                      Chọn câu hỏi gợi ý bên dưới hoặc nhập thắc mắc của bạn để tra cứu nhanh.
                    </p>
                  </div>

                  {/* Suggestion Chips */}
                  <div className="w-full max-w-xl pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
                      {SUGGESTED_PROMPTS.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => sendMessageWithContent(item.prompt)}
                          className="p-2.5 bg-white border-2 border-slate-900 rounded-xl shadow-[2px_2px_0px_0px_#000] hover:bg-amber-100 hover:translate-x-0.5 hover:translate-y-0.5 transition-all text-slate-900 group"
                        >
                          <div className="flex items-center gap-1.5 font-black text-xs">
                            <span>{item.icon}</span>
                            <span className="group-hover:text-purple-700">{item.title}</span>
                          </div>
                          <p className="text-[10px] font-semibold text-slate-600 mt-0.5 line-clamp-2">{item.prompt}</p>
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
                      className={cn('flex items-start gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}
                    >
                      {/* Avatar */}
                      <div
                        className={cn(
                          'w-8 h-8 rounded-lg border-2 border-slate-900 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_#000]',
                          isUser ? 'bg-[#fdc800] text-slate-900' : 'bg-[#432dd7] text-white'
                        )}
                      >
                        {isUser ? <User size={16} /> : <Bot size={18} />}
                      </div>

                      {/* Bubble */}
                      <div className="max-w-[85%] sm:max-w-[80%] space-y-1">
                        <div
                          className={cn(
                            'rounded-xl border-2 border-slate-900 px-3.5 py-2.5 text-xs sm:text-sm font-semibold whitespace-pre-wrap break-words shadow-[2px_2px_0px_0px_#000]',
                            isUser ? 'bg-[#fdc800] text-slate-900' : 'bg-white text-slate-900'
                          )}
                        >
                          {message.content}
                        </div>

                        {/* Assistant Actions */}
                        {!isUser && (
                          <div className="flex items-center justify-between gap-2 pt-0.5">
                            {message.metadata?.evidence?.length ? (
                              <div className="flex flex-wrap gap-1">
                                {message.metadata.evidence.map((evidence) => (
                                  <Badge
                                    key={evidence.kind}
                                    className="bg-purple-100 text-purple-900 border border-purple-300 text-[9px] font-bold"
                                  >
                                    {evidence.kind}
                                  </Badge>
                                ))}
                              </div>
                            ) : <div />}

                            <div className="flex items-center gap-1 text-slate-500">
                              <button
                                type="button"
                                onClick={() => handleSpeakMessage(message.content)}
                                title="Phát âm"
                                className="p-1 hover:bg-slate-200 rounded text-slate-700"
                              >
                                <Volume2 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyMessage(message.id, message.content)}
                                title={isCopied ? 'Đã sao chép' : 'Sao chép'}
                                className="p-1 hover:bg-slate-200 rounded text-slate-700"
                              >
                                {isCopied ? <Check size={13} className="text-emerald-600 font-bold" /> : <Copy size={13} />}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}

              {/* Thinking Indicator */}
              {sendMutation.isPending && (
                <div className="flex items-start gap-2.5 flex-row" role="status">
                  <div className="w-8 h-8 rounded-lg border-2 border-slate-900 bg-[#432dd7] text-white flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_#000]">
                    <Bot size={18} />
                  </div>
                  <div className="flex items-center rounded-xl border-2 border-slate-900 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 shadow-[2px_2px_0px_0px_#000]">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 mr-1.5 animate-spin" />
                    Đang suy nghĩ...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Composer */}
            <form className="border-t-2 border-slate-900 p-3 bg-white" onSubmit={send}>
              {error && <p className="mb-1.5 text-xs font-bold text-rose-600">{error}</p>}

              <div className="flex items-end gap-2">
                <Textarea
                  ref={composerRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Nhập từ vựng hoặc câu hỏi tiếng Anh để tra cứu..."
                  className="min-h-11 max-h-28 text-xs sm:text-sm font-medium border-2 border-slate-900 focus:border-purple-600"
                  disabled={sendMutation.isPending}
                />
                <Button
                  type="submit"
                  aria-label={t('chat.send')}
                  disabled={!draft.trim() || sendMutation.isPending}
                  className="min-w-11 h-11 px-3 font-black shadow-[2px_2px_0px_0px_#000]"
                >
                  <Send size={16} />
                </Button>
              </div>
            </form>
          </section>
        </div>
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
