import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Label } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { demoDecks, demoVocabulary, getDemoVocabularyForDeck } from '@/features/demo/demoData'
import { hasTranslation } from '@/features/quiz/translationInputQuiz'
import { buildStudySessionStorageKey, clearStoredStudySession, hasActiveStudySession, writeActiveStudySessionStorageKey } from '@/features/study/sessionPersistence'
import { mvpStudyModes } from '@/features/study/studyLabels'
import { useI18n } from '@/i18n'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { deckService } from '@/services/supabase/deck.service'
import { studySyncService } from '@/services/local/studySync.service'
import { studyService } from '@/services/supabase/study.service'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useQuizStore } from '@/stores/useQuizStore'
import { rememberConfirmationOptions, useStudyStore, type RememberConfirmationSeconds } from '@/stores/useStudyStore'
import type { VocabularyItem } from '@/types/vocabulary.types'
import { filterActiveVocabulary } from '@/utils/vocabulary'
import { Brain, Play, RotateCcw, Zap, Trash2, History, Award } from 'lucide-react'
import { soundEffects } from '@/utils/soundEffects'

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
  const location = useLocation()
  const queryClient = useQueryClient()
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const setQuizDeckId = useQuizStore((state) => state.setSelectedDeckId)
  const completionState = location.state as { completedDeckId?: string } | null
  const completedDeckId = completionState?.completedDeckId ?? null
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
  const completedDeckTermsQuery = useQuery({
    queryKey: ['deck-terms', completedDeckId],
    queryFn: () => deckService.listTerms(completedDeckId!),
    enabled: shouldUseRemoteData && Boolean(completedDeckId),
  })
  const completedDeckVocabulary = filterActiveVocabulary(completedDeckId
    ? shouldUseRemoteData
      ? completedDeckTermsQuery.data ?? []
      : getDemoVocabularyForDeck(completedDeckId)
    : [])
  const canQuizCompletedDeck = completedDeckVocabulary.some(hasTranslation)
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

  function openCompletedDeckQuiz() {
    if (!completedDeckId || !canQuizCompletedDeck) return
    soundEffects.play('cardClick')
    setQuizDeckId(completedDeckId)
    navigate('/app/quiz')
  }

  async function startSession() {
    soundEffects.play('cardClick')
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
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
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

      {/* Hero Welcome Banner */}
      <div className="neo-card p-6 sm:p-8 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#fdc800] border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-full">
            <Brain className="w-4 h-4 text-slate-900" />
            <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
              Luyện Tập Flashcard Thẻ Từ
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            {t('study.sessionOptions')}
          </h1>
          <p className="text-xs sm:text-sm font-bold text-slate-600 leading-relaxed">
            {t('study.sessionOptionsDescription')}
          </p>
        </div>

        {activeStudyTo && (
          <div className="neo-card p-4 bg-amber-100 border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-xl space-y-2 shrink-0 max-w-xs">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-amber-700" />
              <span>{t('study.resumeSession')}</span>
            </h3>
            <p className="text-xs font-bold text-slate-700 leading-snug">
              {t('study.resumeDescription')}
            </p>
            <Button asChild className="neo-button w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-lg">
              <Link to={activeStudyTo} onClick={() => soundEffects.play('cardClick')}>
                {t('study.resumeSession')}
              </Link>
            </Button>
          </div>
        )}
      </div>

      {completedDeckId ? (
        <div className="neo-card p-6 bg-emerald-100 border-4 border-slate-900 shadow-[5px_5px_0px_0px_#000] rounded-2xl space-y-3">
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-emerald-800" />
            <h3 className="text-xl font-black text-emerald-950">{t('study.completedLessonTitle')}</h3>
          </div>
          <p className="text-xs sm:text-sm font-bold text-emerald-900">{t('study.completedLessonDescription')}</p>
          {completedDeckTermsQuery.isError ? (
            <div className="space-y-2">
              <p className="font-black text-rose-700 text-xs">{t('study.completedLessonQuizLoadError')}</p>
              <Button variant="ghost" onClick={() => void completedDeckTermsQuery.refetch()} className="font-bold text-xs">
                {t('quiz.retryLoad')}
              </Button>
            </div>
          ) : null}
          {!completedDeckTermsQuery.isLoading && !completedDeckTermsQuery.isError && !canQuizCompletedDeck ? (
            <p className="font-black text-xs text-emerald-900">{t('study.completedLessonNeedsTranslation')}</p>
          ) : null}
          <Button
            disabled={completedDeckTermsQuery.isLoading || !canQuizCompletedDeck}
            onClick={openCompletedDeckQuiz}
            className="neo-button py-2.5 px-5 bg-slate-900 text-white font-black text-xs sm:text-sm border-2 border-slate-900 shadow-[3px_3px_0px_0px_#000] rounded-xl"
          >
            {t('study.quizCompletedLesson')}
          </Button>
        </div>
      ) : null}

      {/* Form Options & Forecast Grid */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        {/* Setup Options Form */}
        <div className="neo-card p-6 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-2xl space-y-5">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-600 fill-amber-400" />
            <span>Thiết Lập Phiên Học</span>
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            {decksQuery.isLoading ? <div className="font-black text-xs text-slate-500 md:col-span-2">{t('decks.loading')}</div> : null}
            {decksQuery.error ? <div className="font-black text-xs text-rose-600 md:col-span-2">{decksQuery.error.message}</div> : null}

            {/* Deck Select */}
            <div className="md:col-span-2">
              <Label className="text-xs font-black uppercase text-slate-700 mb-1.5 block">{t('study.deck')}</Label>
              <Select
                value={selectedDeckId ?? ''}
                onChange={(val) => setSelectedDeckId(val || null)}
                options={[
                  { value: '', label: t('study.allVocabulary') },
                  ...decks.map((deck) => ({
                    value: deck.id,
                    label: deckService.getDeckPath(deck.id, decks),
                  })),
                ]}
                placeholder={t('study.allVocabulary')}
              />
            </div>

            {/* Mode Select */}
            <div>
              <Label className="text-xs font-black uppercase text-slate-700 mb-1.5 block">{t('study.mode')}</Label>
              <Select
                value={mode}
                onChange={(val) => setMode(val as typeof mode)}
                options={mvpStudyModes.map((item) => ({
                  value: item,
                  label: t(item === 'two_side' ? 'study.twoSide' : 'study.oneSide'),
                }))}
              />
            </div>

            {/* Cards Limit */}
            <div>
              <Label className="text-xs font-black uppercase text-slate-700 mb-1.5 block">{t('study.cards')}</Label>
              <Select
                value={String(cardLimit)}
                onChange={(val) => setCardLimit(val === 'all' ? 'all' : Number(val))}
                options={[
                  { value: '10', label: t('study.cardCount', { count: 10 }) },
                  { value: '20', label: t('study.cardCount', { count: 20 }) },
                  { value: '50', label: t('study.cardCount', { count: 50 }) },
                  { value: 'all', label: t('study.allCards') },
                ]}
              />
            </div>

            {/* Checkboxes */}
            <div className="md:col-span-2 space-y-2 pt-2 border-t border-slate-200">
              <label className="flex items-center gap-3 text-xs font-bold text-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={shuffle}
                  onChange={(event) => setShuffle(event.target.checked)}
                  className="h-4 w-4 accent-purple-600 rounded border-2 border-slate-900"
                />
                <span>{t('study.shuffleCards')}</span>
              </label>

              <label className="flex items-center gap-3 text-xs font-bold text-slate-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={requireRememberConfirmation}
                  onChange={(event) => setRequireRememberConfirmation(event.target.checked)}
                  className="h-4 w-4 accent-purple-600 rounded border-2 border-slate-900"
                />
                <span>{t('study.requireRememberConfirmation')}</span>
              </label>

              {requireRememberConfirmation ? (
                <div className="pt-2">
                  <Label htmlFor="remember-confirmation-seconds" className="text-xs font-black text-slate-700 mb-1 block">
                    {t('study.rememberConfirmationSeconds')}
                  </Label>
                  <Select
                    id="remember-confirmation-seconds"
                    value={String(rememberConfirmationSeconds)}
                    onChange={(val) => setRememberConfirmationSeconds(Number(val) as RememberConfirmationSeconds)}
                    options={rememberConfirmationOptions.map((seconds) => ({
                      value: String(seconds),
                      label: t('study.seconds', { count: seconds }),
                    }))}
                  />
                </div>
              ) : null}
            </div>

            {/* Start Button */}
            <Button
              disabled={shouldUseRemoteData && decksQuery.isLoading}
              onClick={startSession}
              className="md:col-span-2 neo-button py-3.5 bg-[#fdc800] hover:bg-amber-300 text-slate-900 font-black text-sm border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
            >
              <Play className="w-5 h-5 fill-slate-900" />
              <span>{t('study.startSession')}</span>
            </Button>
          </div>
        </div>

        {/* Forecast Side Panel */}
        <div className="space-y-4">
          <div className="neo-card p-6 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-2xl space-y-4 relative overflow-hidden">
            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase text-amber-600 tracking-wider">
                {t('study.forecastEyebrow')}
              </span>
              <h3 className="text-lg font-black text-slate-900">
                {t('study.forecastTitle')}
              </h3>
            </div>

            {sourceVocabularyQuery.isLoading ? <p className="text-xs font-bold text-slate-500">{t('vocabulary.loading')}</p> : null}
            {sourceVocabularyQuery.error ? <p className="text-xs font-bold text-rose-600">{sourceVocabularyQuery.error.message}</p> : null}

            {/* 3 Stat Tiles */}
            <div className="grid grid-cols-3 gap-2">
              <div className="neo-card p-3 bg-amber-100 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-xl text-center">
                <p className="text-sm sm:text-base font-black text-amber-950">{t('study.forecastDueCount', { count: forecast.dueCount })}</p>
                <p className="text-[10px] font-black uppercase text-amber-800 mt-0.5">{t('study.forecastDue')}</p>
              </div>

              <div className="neo-card p-3 bg-sky-100 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-xl text-center">
                <p className="text-sm sm:text-base font-black text-sky-950">{t('study.forecastNewCount', { count: forecast.newCount })}</p>
                <p className="text-[10px] font-black uppercase text-sky-800 mt-0.5">{t('study.forecastNew')}</p>
              </div>

              <div className="neo-card p-3 bg-rose-100 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-xl text-center">
                <p className="text-sm sm:text-base font-black text-rose-950">{t('study.forecastDifficultCount', { count: forecast.difficultCount })}</p>
                <p className="text-[10px] font-black uppercase text-rose-800 mt-0.5">{t('study.forecastDifficult')}</p>
              </div>
            </div>

            {/* Estimate Badge */}
            <div className="neo-card p-3.5 bg-slate-900 text-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-xl space-y-1">
              <p className="text-xs font-black text-[#fdc800]">
                {t('study.forecastEstimate', { minutes: forecast.estimatedMinutes })}
              </p>
              <p className="text-xs font-semibold text-slate-300 leading-snug">{forecastAdvice}</p>
            </div>
          </div>
        </div>
      </div>

      {/* History Log Section */}
      <div className="neo-card p-6 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-purple-700" />
            <h2 className="text-lg font-black text-slate-900">{t('study.historyTitle')}</h2>
          </div>
          {shouldUseRemoteData && (historyQuery.data?.length ?? 0) > 0 ? (
            <Button variant="ghost" onClick={() => setClearHistoryOpen(true)} className="text-xs font-bold text-rose-600">
              {t('study.clearHistory')}
            </Button>
          ) : null}
        </div>

        {!shouldUseRemoteData ? <p className="text-xs font-bold text-slate-500">{t('study.historyUnavailable')}</p> : null}
        {historyQuery.isLoading ? <p className="text-xs font-bold text-slate-500">{t('vocabulary.loading')}</p> : null}
        {historyQuery.error ? <p className="text-xs font-bold text-rose-600">{historyQuery.error.message}</p> : null}
        {shouldUseRemoteData && !historyQuery.isLoading && (historyQuery.data?.length ?? 0) === 0 ? (
          <p className="text-xs font-bold text-slate-500 py-2">{t('study.historyEmpty')}</p>
        ) : null}

        <div className="space-y-3">
          {(historyQuery.data ?? []).map((session) => (
            <div
              key={session.id}
              className="neo-card p-4 bg-slate-50 border-2 border-slate-900 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <p className="font-black text-sm text-slate-900">{new Date(session.started_at).toLocaleString()}</p>
                <p className="text-xs font-bold text-slate-600 mt-0.5">
                  {session.mode === 'two_side' ? t('study.twoSide') : t('study.oneSide')} · {session.ended_at ? t('study.historyCompleted') : t('study.historyInProgress')}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-white text-slate-900 font-black text-xs border border-slate-900">
                  {t('study.historyCards', { viewed: session.viewed_cards, total: session.total_cards })}
                </Badge>
                <Badge className="bg-emerald-100 text-emerald-950 font-black text-xs border border-slate-900">
                  {t('study.historyRemembered', { count: session.remembered_count })}
                </Badge>
                <Badge className="bg-rose-100 text-rose-950 font-black text-xs border border-slate-900">
                  {t('study.historyForgot', { count: session.difficult_count })}
                </Badge>
                <button
                  type="button"
                  onClick={() => deleteHistoryMutation.mutate(session.id)}
                  className="text-xs font-bold text-rose-600 hover:text-rose-800 p-1"
                  title={t('study.deleteHistoryItem')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
