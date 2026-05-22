import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Label, Select } from '@/components/ui/input'
import { demoDecks } from '@/features/demo/demoData'
import { buildStudySessionStorageKey, clearStoredStudySession, hasActiveStudySession, readActiveStudySessionStorageKey, readStoredStudySession, writeActiveStudySessionStorageKey } from '@/features/study/sessionPersistence'
import { mvpStudyModes } from '@/features/study/studyLabels'
import { useI18n } from '@/i18n'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { deckService } from '@/services/supabase/deck.service'
import { studyLocalDb } from '@/services/local/studyLocalDb'
import { studySyncService } from '@/services/local/studySync.service'
import { studyService } from '@/services/supabase/study.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useStudyStore } from '@/stores/useStudyStore'

export function StudySetupPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const { mode, setMode, cardLimit, setCardLimit, shuffle, setShuffle, selectedDeckId, setSelectedDeckId } = useStudyStore()
  const [clearHistoryOpen, setClearHistoryOpen] = useState(false)
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)
  const decksQuery = useQuery({
    queryKey: ['decks', user?.id],
    queryFn: () => deckService.list(user!.id),
    enabled: shouldUseRemoteData,
  })
  const decks = useMemo(
    () => shouldUseRemoteData ? decksQuery.data ?? [] : demoDecks,
    [decksQuery.data, shouldUseRemoteData],
  )
  const historyQuery = useQuery({
    queryKey: ['study-history', user?.id],
    queryFn: () => studyService.listRecentSessions(user!.id),
    enabled: shouldUseRemoteData,
  })
  const deleteHistoryMutation = useMutation({
    mutationFn: (sessionId: string) => studyService.deleteSession(sessionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['study-history', user?.id] }),
  })
  const clearHistoryMutation = useMutation({
    mutationFn: () => studyService.clearHistory(user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['study-history', user?.id] }),
  })
  const activeStudyTo = hasActiveStudySession()

  async function flushActiveSessionViews() {
    if (!shouldUseRemoteData || !user) return
    const activeSessionKey = readActiveStudySessionStorageKey({
      userId: user?.id,
      sessionId: 'deck-session',
      remote: shouldUseRemoteData,
    })
    if (!activeSessionKey) return

    const storedSession = readStoredStudySession(activeSessionKey)
    if (!storedSession) return

    const pendingIds = storedSession.viewedTermIds.filter((id) => !storedSession.flushedViewTermIds.includes(id))
    if (pendingIds.length > 0) await studyLocalDb.addPendingViewTermIds(user.id, pendingIds)
    await studySyncService.flushPendingStudyChanges(user.id)
  }

  async function startSession() {
    if (shouldUseRemoteData && user) await studySyncService.flushPendingStudyChanges(user.id)
    const remoteSession = shouldUseRemoteData
      ? await studyService.createSession(user!.id, mode, selectedDeckId, typeof cardLimit === 'number' ? cardLimit : 0)
      : null
    const nextSessionId = remoteSession?.id ?? 'deck-session'
    const sessionStorageKey = buildStudySessionStorageKey({
      userId: user?.id,
      sessionId: nextSessionId,
      selectedDeckId,
      mode,
      cardLimit,
      shuffle,
      remote: shouldUseRemoteData,
    })
    try {
      await flushActiveSessionViews()
    } finally {
      clearStoredStudySession(sessionStorageKey)
      writeActiveStudySessionStorageKey({
        userId: user?.id,
        sessionId: nextSessionId,
        remote: shouldUseRemoteData,
      }, sessionStorageKey)
      navigate(`/app/study/session/${nextSessionId}`)
    }
  }

  return (
    <>
      <ConfirmModal
        open={clearHistoryOpen}
        title={t('study.clearHistoryTitle')}
        description={t('study.clearHistoryDescription')}
        confirmLabel={t('study.clearHistoryConfirm')}
        cancelLabel={t('actions.cancel')}
        variant="danger"
        onConfirm={() => {
          setClearHistoryOpen(false)
          clearHistoryMutation.mutate()
        }}
        onCancel={() => setClearHistoryOpen(false)}
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <Card className="p-5">
          <CardTitle>{t('study.sessionOptions')}</CardTitle>
          <CardDescription className="mt-2">{t('study.sessionOptionsDescription')}</CardDescription>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {decksQuery.isLoading ? <Card className="font-black md:col-span-2">{t('decks.loading')}</Card> : null}
            {decksQuery.error ? <Card className="font-black text-danger md:col-span-2">{decksQuery.error.message}</Card> : null}
            <div className="md:col-span-2">
              <Label>{t('study.deck')}</Label>
              <Select value={selectedDeckId ?? ''} onChange={(event) => setSelectedDeckId(event.target.value || null)}>
                <option value="">{t('study.allVocabulary')}</option>
                {decks.map((deck) => <option key={deck.id} value={deck.id}>{deck.name}</option>)}
              </Select>
            </div>
            <div><Label>{t('study.mode')}</Label><Select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}>{mvpStudyModes.map((item) => <option key={item} value={item}>{t(item === 'two_side' ? 'study.twoSide' : 'study.oneSide')}</option>)}</Select></div>
            <div><Label>{t('study.cards')}</Label><Select value={cardLimit} onChange={(event) => setCardLimit(event.target.value === 'all' ? 'all' : Number(event.target.value))}><option value={10}>{t('study.cardCount', { count: 10 })}</option><option value={20}>{t('study.cardCount', { count: 20 })}</option><option value={50}>{t('study.cardCount', { count: 50 })}</option><option value="all">{t('study.allCards')}</option></Select></div>
            <label className="flex items-center gap-3 text-sm font-black md:col-span-2"><input checked={shuffle} onChange={(event) => setShuffle(event.target.checked)} type="checkbox" /> {t('study.shuffleCards')}</label>
            <Button className="md:col-span-2" disabled={shouldUseRemoteData && decksQuery.isLoading} onClick={startSession}>{t('study.startSession')}</Button>
          </div>
        </Card>

        <div className="grid gap-4">
          {activeStudyTo ? (
            <Card className="bg-secondary text-secondary-foreground">
              <CardTitle>{t('study.resumeSession')}</CardTitle>
              <p className="mt-2 text-sm font-semibold text-secondary-foreground/85">{t('study.resumeDescription')}</p>
              <Button asChild className="mt-4"><Link to={activeStudyTo}>{t('study.resumeSession')}</Link></Button>
            </Card>
          ) : null}
          <Card className="bg-primary text-primary-foreground">
            <p className="text-sm font-black uppercase">{t('study.cards')}</p>
            <p className="mt-2 text-4xl font-black">{typeof cardLimit === 'number' ? cardLimit : t('study.allCards')}</p>
            <p className="mt-1 text-sm font-semibold">{mode === 'two_side' ? t('study.twoSide') : t('study.oneSide')}</p>
          </Card>
        </div>
      </div>

      <Card className="mt-4 p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <CardTitle>{t('study.historyTitle')}</CardTitle>
            <CardDescription className="mt-2">{t('study.historyDescription')}</CardDescription>
          </div>
          {shouldUseRemoteData && (historyQuery.data?.length ?? 0) > 0 ? (
            <Button variant="ghost" onClick={() => setClearHistoryOpen(true)}>{t('study.clearHistory')}</Button>
          ) : null}
        </div>

        {!shouldUseRemoteData ? <p className="mt-5 text-sm font-bold text-muted-foreground">{t('study.historyUnavailable')}</p> : null}
        {historyQuery.isLoading ? <p className="mt-5 text-sm font-black">{t('vocabulary.loading')}</p> : null}
        {historyQuery.error ? <p className="mt-5 text-sm font-black text-danger">{historyQuery.error.message}</p> : null}
        {shouldUseRemoteData && !historyQuery.isLoading && (historyQuery.data?.length ?? 0) === 0 ? (
          <p className="mt-5 text-sm font-bold text-muted-foreground">{t('study.historyEmpty')}</p>
        ) : null}

        <div className="mt-5 grid gap-3">
          {(historyQuery.data ?? []).map((session) => (
            <div key={session.id} className="flex flex-col gap-3 rounded-md border-2 border-border bg-background p-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-black">{new Date(session.started_at).toLocaleString()}</p>
                <p className="mt-1 text-sm font-bold text-muted-foreground">
                  {session.mode === 'two_side' ? t('study.twoSide') : t('study.oneSide')} · {session.ended_at ? t('study.historyCompleted') : t('study.historyInProgress')}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm font-black">
                <span className="rounded-md border-2 border-border bg-card px-2 py-1">{t('study.historyCards', { viewed: session.viewed_cards, total: session.total_cards })}</span>
                <span className="rounded-md border-2 border-border bg-card px-2 py-1">{t('study.historyRemembered', { count: session.remembered_count })}</span>
                <span className="rounded-md border-2 border-border bg-card px-2 py-1">{t('study.historyForgot', { count: session.difficult_count })}</span>
                <Button variant="ghost" className="min-h-8 px-2 py-1 text-xs" onClick={() => deleteHistoryMutation.mutate(session.id)}>{t('study.deleteHistoryItem')}</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}
