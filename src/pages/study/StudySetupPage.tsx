import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Label, Select } from '@/components/ui/input'
import { demoDecks, demoVocabulary } from '@/features/demo/demoData'
import { buildStudySessionStorageKey, clearStoredStudySession, hasActiveStudySession, writeActiveStudySessionStorageKey } from '@/features/study/sessionPersistence'
import { mvpStudyModes } from '@/features/study/studyLabels'
import { useI18n } from '@/i18n'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { deckService } from '@/services/supabase/deck.service'
import { studySyncService } from '@/services/local/studySync.service'
import { studyService } from '@/services/supabase/study.service'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { rememberConfirmationOptions, useStudyStore, type RememberConfirmationSeconds } from '@/stores/useStudyStore'
import type { VocabularyItem } from '@/types/vocabulary.types'
import { filterActiveVocabulary } from '@/utils/vocabulary'

const SECONDS_PER_FORECAST_CARD = 30

function getStudyForecast(vocabulary: VocabularyItem[], cardLimit: number | 'all') {
  const now = new Date()
  const dueCount = vocabulary.filter((item) => item.next_review_at && new Date(item.next_review_at) <= now).length
  const newCount = vocabulary.filter((item) => item.status === 'new').length
  const difficultCount = vocabulary.filter((item) => item.status === 'difficult' || item.wrong_count >= 3).length
  const suggestedCards = cardLimit === 'all'
    ? vocabulary.length
    : Math.min(cardLimit, Math.max(dueCount + newCount + difficultCount, 1))
  const estimatedMinutes = Math.max(1, Math.ceil((suggestedCards * SECONDS_PER_FORECAST_CARD) / 60))

  return { dueCount, newCount, difficultCount, suggestedCards, estimatedMinutes }
}

export function StudySetupPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const {
    mode,
    setMode,
    cardLimit,
    setCardLimit,
    shuffle,
    setShuffle,
    selectedDeckId,
    setSelectedDeckId,
    requireRememberConfirmation,
    setRequireRememberConfirmation,
    rememberConfirmationSeconds,
    setRememberConfirmationSeconds,
  } = useStudyStore()
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
  const sourceVocabularyQuery = useQuery({
    queryKey: selectedDeckId ? ['deck-terms', selectedDeckId] : ['vocabulary', user?.id],
    queryFn: () => selectedDeckId ? deckService.listTerms(selectedDeckId) : vocabularyService.list(user!.id),
    enabled: shouldUseRemoteData,
  })
  const sourceVocabulary = useMemo(
    () => filterActiveVocabulary(shouldUseRemoteData ? sourceVocabularyQuery.data ?? [] : demoVocabulary),
    [shouldUseRemoteData, sourceVocabularyQuery.data],
  )
  const forecast = useMemo(
    () => getStudyForecast(sourceVocabulary, cardLimit),
    [cardLimit, sourceVocabulary],
  )
  const forecastAdvice = forecast.dueCount > 0
    ? t('study.forecastPriorityDue', { count: forecast.dueCount })
    : forecast.difficultCount > 0
      ? t('study.forecastPriorityDifficult', { count: forecast.difficultCount })
      : forecast.newCount > 0
        ? t('study.forecastPriorityNew', { count: forecast.newCount })
        : t('study.forecastAllClear')
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
    clearStoredStudySession(sessionStorageKey)
    writeActiveStudySessionStorageKey({
      userId: user?.id,
      sessionId: nextSessionId,
      remote: shouldUseRemoteData,
    }, sessionStorageKey)
    navigate(`/app/study/session/${nextSessionId}`)
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
            <label className="flex items-center gap-3 text-sm font-black md:col-span-2">
              <input
                checked={requireRememberConfirmation}
                onChange={(event) => setRequireRememberConfirmation(event.target.checked)}
                type="checkbox"
              />
              {t('study.requireRememberConfirmation')}
            </label>
            {requireRememberConfirmation ? (
              <div className="md:col-span-2">
                <Label htmlFor="remember-confirmation-seconds">{t('study.rememberConfirmationSeconds')}</Label>
                <Select
                  id="remember-confirmation-seconds"
                  aria-label={t('study.rememberConfirmationSeconds')}
                  value={rememberConfirmationSeconds}
                  onChange={(event) => setRememberConfirmationSeconds(Number(event.target.value) as RememberConfirmationSeconds)}
                >
                  {rememberConfirmationOptions.map((seconds) => (
                    <option key={seconds} value={seconds}>{t('study.seconds', { count: seconds })}</option>
                  ))}
                </Select>
              </div>
            ) : null}
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
          <Card className="relative overflow-hidden bg-card p-5">
            <div className="absolute inset-x-0 top-0 h-3 bg-primary" />
            <p className="mt-2 text-xs font-black uppercase tracking-wide text-muted-foreground">{t('study.forecastEyebrow')}</p>
            <CardTitle className="mt-1">{t('study.forecastTitle')}</CardTitle>
            {sourceVocabularyQuery.isLoading ? <p className="mt-4 text-sm font-black">{t('vocabulary.loading')}</p> : null}
            {sourceVocabularyQuery.error ? <p className="mt-4 text-sm font-black text-danger">{sourceVocabularyQuery.error.message}</p> : null}
            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="rounded-md border-2 border-border bg-background p-3 shadow-[2px_2px_0_var(--border)]">
                <p className="text-2xl font-black">{forecast.dueCount}</p>
                <p className="mt-1 text-xs font-black uppercase text-muted-foreground">{t('study.forecastDue')}</p>
              </div>
              <div className="rounded-md border-2 border-border bg-background p-3 shadow-[2px_2px_0_var(--border)]">
                <p className="text-2xl font-black">{forecast.newCount}</p>
                <p className="mt-1 text-xs font-black uppercase text-muted-foreground">{t('study.forecastNew')}</p>
              </div>
              <div className="rounded-md border-2 border-border bg-background p-3 shadow-[2px_2px_0_var(--border)]">
                <p className="text-2xl font-black">{forecast.difficultCount}</p>
                <p className="mt-1 text-xs font-black uppercase text-muted-foreground">{t('study.forecastDifficult')}</p>
              </div>
            </div>
            <div className="mt-4 rounded-md border-2 border-border bg-primary px-3 py-2 text-primary-foreground shadow-[2px_2px_0_var(--border)]">
              <p className="text-sm font-black">{t('study.forecastEstimate', { minutes: forecast.estimatedMinutes })}</p>
              <p className="mt-1 text-sm font-semibold">{forecastAdvice}</p>
            </div>
            <div className="sr-only">
              <span>{t('study.forecastDueCount', { count: forecast.dueCount })}</span>
              <span>{t('study.forecastNewCount', { count: forecast.newCount })}</span>
              <span>{t('study.forecastDifficultCount', { count: forecast.difficultCount })}</span>
            </div>
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
