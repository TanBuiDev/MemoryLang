import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bot, MessageCirclePlus, Send, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/input'
import { PageHeader } from '@/components/common/PageHeader'
import { useI18n } from '@/i18n'
import { chatService } from '@/services/supabase/chat.service'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'
import { useChatStore } from '@/stores/useChatStore'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
import { ChatApiError, type ChatMessage } from '@/types/chat.types'
import { cn } from '@/utils/cn'

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
    mutationFn: () => chatService.sendMessage({
      sessionId: activeSessionId,
      message: draft,
      sourceLanguage: profile?.current_target_language ?? 'en',
      nativeLanguage: profile?.native_language ?? 'vi',
    }),
    onSuccess: (result) => {
      setActiveSessionId(result.session.id)
      setTransientMessages([result.userMessage, result.assistantMessage])
      setDraft('')
      setError(null)
      void queryClient.invalidateQueries({ queryKey: ['chat-sessions', user?.id] })
      void queryClient.invalidateQueries({ queryKey: ['chat-messages', result.session.id] })
    },
    onError: (cause) => {
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

  function send(event?: FormEvent) {
    event?.preventDefault()
    if (!isSupabaseConfigured || !user || !draft.trim() || sendMutation.isPending) return
    sendMutation.mutate()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      send()
    }
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
    <div className="mx-auto flex w-full max-w-7xl flex-col px-4 py-6">
      <PageHeader
        eyebrow="AI"
        title={t('chat.title')}
        actions={<Button onClick={startNewChat}><MessageCirclePlus size={18} />{t('chat.newSession')}</Button>}
      />

      <div className="grid min-h-[620px] gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="neo-card flex min-h-0 flex-col p-2">
          <p className="px-2 py-2 text-xs font-black uppercase text-muted-foreground">{t('chat.sessionList')}</p>
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
            {sessionsQuery.data?.map((session) => (
              <div key={session.id} className={cn('group flex items-center gap-1 rounded-md', activeSessionId === session.id && 'bg-primary text-primary-foreground')}>
                <Button
                  type="button"
                  variant="ghost"
                  className={cn('min-w-0 flex-1 justify-start border-0 bg-transparent px-2 py-2 text-left shadow-none hover:bg-muted', activeSessionId === session.id && 'text-primary-foreground hover:bg-primary')}
                  onClick={() => selectSession(session.id)}
                >
                  <span className="truncate">{session.title}</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={t('chat.deleteSession')}
                  className={cn('min-h-8 min-w-8 border-0 bg-transparent p-1 shadow-none hover:bg-danger hover:text-white', activeSessionId === session.id && 'text-primary-foreground')}
                  onClick={() => setPendingDeleteId(session.id)}
                >
                  <Trash2 size={15} />
                </Button>
              </div>
            ))}
          </div>
        </aside>

        <section className="neo-card flex min-h-0 flex-col p-0">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
            {messages.length === 0 ? (
              <div className="flex h-full min-h-[390px] flex-col items-center justify-center text-center">
                <Bot size={42} className="mb-3 text-secondary" />
                <p className="max-w-md text-lg font-black">{t('chat.empty', { language: profile?.current_target_language ?? 'en' })}</p>
                <p className="mt-2 text-sm font-semibold text-muted-foreground">{t('chat.emptySession')}</p>
              </div>
            ) : messages.map((message) => (
              <div key={message.id} className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[85%] whitespace-pre-wrap break-words rounded-md border-2 border-border px-3 py-2 text-sm font-semibold sm:max-w-[75%]',
                  message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground',
                )}>
                  {message.content}
                </div>
              </div>
            ))}
          </div>

          <form className="border-t-2 border-border p-3" onSubmit={send}>
            {error ? <p className="mb-2 text-sm font-bold text-danger">{error}</p> : null}
            {error === t('chat.quotaReached') && isFree ? <Link className="mb-2 inline-block text-sm font-black text-secondary underline" to="/app/upgrade">{t('chat.upgradeForMore')}</Link> : null}
            <div className="flex items-end gap-2">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('chat.placeholder')}
                className="min-h-12 max-h-32 resize-y"
                disabled={sendMutation.isPending}
              />
              <Button type="submit" aria-label={t('chat.send')} disabled={!draft.trim() || sendMutation.isPending} className="min-w-12 px-3">
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
