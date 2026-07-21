import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, X, ClipboardCheck, Sparkles, HelpCircle, Layers, History, Trash2, Play, AlertCircle } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Label } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { demoDecks, getDemoVocabularyForDeck } from '@/features/demo/demoData'
import { abandonActiveQuizSession, buildQuizSessionStorageKey, clearStoredQuizSession, findActiveQuizSession, writeActiveQuizSessionStorageKey } from '@/features/quiz/sessionPersistence'
import { hasTranslation } from '@/features/quiz/translationInputQuiz'
import { getPendingSuggestions, removeTranslationSuggestion, type TranslationSuggestion } from '@/features/quiz/translationSuggestions'
import { useI18n } from '@/i18n'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { deckService } from '@/services/supabase/deck.service'
import { quizService } from '@/services/supabase/quiz.service'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useQuizStore } from '@/stores/useQuizStore'
import { filterActiveVocabulary } from '@/utils/vocabulary'
import { soundEffects } from '@/utils/soundEffects'

export function QuizSetupPage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const { questionCount, quizType, setQuizType, setQuestionCount, selectedDeckId, setSelectedDeckId } = useQuizStore()
  const [clearHistoryOpen, setClearHistoryOpen] = useState(false)
  const [suggestionsModalOpen, setSuggestionsModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)
  const queryClient = useQueryClient()
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
    () => filterActiveVocabulary(shouldUseRemoteData ? sourceVocabularyQuery.data ?? [] : getDemoVocabularyForDeck(selectedDeckId)),
    [selectedDeckId, shouldUseRemoteData, sourceVocabularyQuery.data],
  )
  const availableVocabulary = useMemo(
    () => sourceVocabulary.filter(hasTranslation),
    [sourceVocabulary],
  )
  const missingTranslationVocabulary = useMemo(
    () => sourceVocabulary.filter((item) => !hasTranslation(item)),
    [sourceVocabulary],
  )
  const typeDistribution = useMemo(() => {
    const types: Record<string, number> = {}
    for (const item of sourceVocabulary) {
      const key = item.item_type
      types[key] = (types[key] ?? 0) + 1
    }
    return types
  }, [sourceVocabulary])
  const effectiveQuestionCount = questionCount === 'all' ? availableVocabulary.length : Math.min(questionCount, availableVocabulary.length)
  const vocabularyLoading = shouldUseRemoteData && sourceVocabularyQuery.isLoading
  const vocabularyError = shouldUseRemoteData && sourceVocabularyQuery.isError
  const cannotStart = decksQuery.isLoading || vocabularyLoading || vocabularyError || availableVocabulary.length === 0

  const historyQuery = useQuery({
    queryKey: ['quiz-history', user?.id],
    queryFn: async () => {
      await quizService.pruneHistory(user!.id)
      return quizService.listRecentResults(user!.id)
    },
    enabled: shouldUseRemoteData,
  })

  const deleteResultMutation = useMutation({
    mutationFn: (resultId: string) => quizService.deleteResult(resultId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quiz-history', user?.id] }),
  })

  const clearHistoryMutation = useMutation({
    mutationFn: () => quizService.clearHistory(user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quiz-history', user?.id] }),
  })

  const [suggestions, setSuggestions] = useState<TranslationSuggestion[]>(() =>
    getPendingSuggestions(user?.id),
  )
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set())
  const [isAcceptingAll, setIsAcceptingAll] = useState(false)

  const acceptSuggestion = useCallback(async (suggestion: TranslationSuggestion, _overrideText?: string) => {
    setSavingIds((prev) => new Set(prev).add(suggestion.userTermId))
    try {
      removeTranslationSuggestion(suggestion.userTermId, user?.id)
      setSuggestions((prev) => prev.filter((s) => s.userTermId !== suggestion.userTermId))
      setAcceptedIds((prev) => new Set(prev).add(suggestion.userTermId))
      setEditingSuggestionId(null)
    } catch {
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(suggestion.userTermId)
        return next
      })
    }
  }, [user?.id])

  const dismissSuggestion = useCallback((suggestion: TranslationSuggestion) => {
    removeTranslationSuggestion(suggestion.userTermId, user?.id)
    setSuggestions((prev) => prev.filter((s) => s.userTermId !== suggestion.userTermId))
  }, [user?.id])

  const acceptAllSuggestions = useCallback(async () => {
    const remaining = suggestions.filter((s) => !acceptedIds.has(s.userTermId) && !savingIds.has(s.userTermId))
    if (remaining.length === 0) return
    setSavingIds((prev) => {
      const next = new Set(prev)
      for (const s of remaining) next.add(s.userTermId)
      return next
    })
    for (const s of remaining) {
      removeTranslationSuggestion(s.userTermId, user?.id)
    }
    setSuggestions((prev) => prev.filter((s) => !remaining.find(r => r.userTermId === s.userTermId)))
    for (const s of remaining) {
      setAcceptedIds((prev) => new Set(prev).add(s.userTermId))
    }
    setSavingIds((prev) => {
      const next = new Set(prev)
      for (const s of remaining) next.delete(s.userTermId)
      return next
    })
  }, [suggestions, acceptedIds, savingIds, user?.id])

  const userIdentifier = shouldUseRemoteData ? (user?.id ?? 'remote') : 'demo'
  const [activeQuizSession, setActiveQuizSession] = useState(() => findActiveQuizSession(userIdentifier))

  function abandonQuiz() {
    abandonActiveQuizSession(userIdentifier)
    setActiveQuizSession(null)
  }

  function startQuiz() {
    if (cannotStart) return
    soundEffects.play('cardClick')
    setQuizType(quizType)
    const sessionStorageKey = buildQuizSessionStorageKey({
      userId: user?.id,
      sessionId: 'deck-quiz',
      selectedDeckId,
      quizType,
      questionCount,
      remote: shouldUseRemoteData,
    })
    clearStoredQuizSession(sessionStorageKey)
    writeActiveQuizSessionStorageKey({
      userId: user?.id,
      sessionId: 'deck-quiz',
      remote: shouldUseRemoteData,
    }, sessionStorageKey)
    navigate('/app/quiz/session/deck-quiz')
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Hero Welcome Banner */}
      <div className="neo-card p-6 sm:p-8 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative">
        {suggestions.length > 0 ? (
          <button
            type="button"
            className="absolute top-4 right-4 neo-button px-3 py-1 bg-amber-300 text-slate-900 font-black text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-xl flex items-center gap-1.5"
            onClick={() => setSuggestionsModalOpen(true)}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gợi Ý Bản Dịch ({suggestions.length})</span>
          </button>
        ) : null}

        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-full">
            <ClipboardCheck className="w-4 h-4 text-emerald-800" />
            <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
              Kiểm Tra & Phản Xạ Quiz
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            {t('quiz.options')}
          </h1>
          <p className="text-xs sm:text-sm font-bold text-slate-600 leading-relaxed">
            {t('quiz.optionsDescription')}
          </p>
        </div>
      </div>

      {activeQuizSession ? (
        <div className="neo-card p-5 bg-amber-100 border-4 border-slate-900 shadow-[5px_5px_0px_0px_#000] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-black text-amber-950 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-700" />
              <span>{t('quiz.resumeTitle')}</span>
            </h3>
            <p className="text-xs font-bold text-amber-900">{t('quiz.resumeDescription')}</p>
            <Badge className="bg-slate-900 text-[#fdc800] font-black text-xs border border-slate-900 mt-1">
              {t('quiz.resumeProgress', {
                completed: activeQuizSession.session.completedQuestionIds.length,
                total: activeQuizSession.session.questions.length,
              })}
            </Badge>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={() => { soundEffects.play('cardClick'); navigate(`/app/quiz/session/${activeQuizSession.sessionId}`) }}
              className="neo-button bg-[#fdc800] hover:bg-amber-300 text-slate-900 font-black text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000]"
            >
              {t('quiz.resumeContinue')}
            </Button>
            <Button variant="ghost" onClick={abandonQuiz} className="text-xs font-bold text-slate-700">
              {t('quiz.resumeStartNew')}
            </Button>
          </div>
        </div>
      ) : null}

      {/* Main Form & Preview Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Quiz Setup Form */}
        <div className="neo-card p-6 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-2xl space-y-5">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-purple-700" />
            <span>Tùy Chọn Câu Hỏi</span>
          </h2>

          <div className="space-y-4">
            {decksQuery.isLoading ? <div className="text-xs font-black text-slate-500">{t('decks.loading')}</div> : null}
            {decksQuery.error ? <div className="text-xs font-black text-rose-600">{decksQuery.error.message}</div> : null}

            {/* Deck Select */}
            <div>
              <Label className="text-xs font-black uppercase text-slate-700 mb-1.5 block">{t('quiz.deck')}</Label>
              <Select
                value={selectedDeckId ?? ''}
                onChange={(val) => setSelectedDeckId(val || null)}
                options={[
                  { value: '', label: t('quiz.allVocabulary') },
                  ...decks.map((deck) => ({
                    value: deck.id,
                    label: deckService.getDeckPath(deck.id, decks),
                  })),
                ]}
                placeholder={t('quiz.allVocabulary')}
              />
            </div>

            {/* Quiz Type Select */}
            <div>
              <Label className="text-xs font-black uppercase text-slate-700 mb-1.5 block">{t('quiz.type')}</Label>
              <Select
                value={quizType}
                onChange={(val) => setQuizType(val as 'translation_input' | 'multiple_choice')}
                options={[
                  { value: 'translation_input', label: t('quiz.translationInput') },
                  { value: 'multiple_choice', label: t('quiz.multipleChoice') },
                ]}
              />
            </div>

            {/* Question Count Selector */}
            <div>
              <Label className="text-xs font-black uppercase text-slate-700 mb-1.5 block">{t('quiz.questionCount')}</Label>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={questionCount === 'all'}
                    onChange={(event) => setQuestionCount(event.target.checked ? 'all' : Math.min(10, availableVocabulary.length || 10))}
                    className="h-4 w-4 accent-purple-600 rounded border-2 border-slate-900"
                  />
                  <span className="text-xs font-black text-slate-900">{t('quiz.allQuestions')}</span>
                </label>

                {questionCount !== 'all' ? (
                  <div className="flex items-center rounded-xl border-2 border-slate-900 bg-white shadow-[2px_2px_0px_0px_#000] overflow-hidden">
                    <button
                      type="button"
                      className="h-9 w-9 flex items-center justify-center text-sm font-black bg-slate-100 hover:bg-amber-100 text-slate-900 disabled:opacity-30"
                      disabled={questionCount <= 1}
                      onClick={() => setQuestionCount(Math.max(1, (questionCount as number) - 1))}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={questionCount}
                      min={1}
                      max={availableVocabulary.length || 100}
                      onChange={(event) => {
                        const value = Number.parseInt(event.target.value, 10)
                        if (!Number.isNaN(value) && value >= 1) {
                          setQuestionCount(Math.min(value, availableVocabulary.length || 100))
                        }
                      }}
                      className="h-9 w-14 text-center text-sm font-black bg-transparent tabular-nums outline-none"
                    />
                    <button
                      type="button"
                      className="h-9 w-9 flex items-center justify-center text-sm font-black bg-slate-100 hover:bg-amber-100 text-slate-900 disabled:opacity-30"
                      disabled={questionCount >= (availableVocabulary.length || 100)}
                      onClick={() => setQuestionCount(Math.min(availableVocabulary.length || 100, (questionCount as number) + 1))}
                    >
                      +
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Readiness Feedback Card */}
            <div className="neo-card p-4 bg-slate-50 border-2 border-slate-900 rounded-xl space-y-2">
              {vocabularyLoading ? <p className="text-xs font-black text-slate-600">{t('vocabulary.loading')}</p> : null}
              {vocabularyError ? (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-black text-rose-600">{t('quiz.loadError')}</p>
                  <Button variant="ghost" onClick={() => sourceVocabularyQuery.refetch()} className="text-xs font-bold">
                    {t('quiz.retryLoad')}
                  </Button>
                </div>
              ) : null}

              {!vocabularyLoading && !vocabularyError && sourceVocabulary.length === 0 ? (
                <p className="text-xs font-black text-rose-600">{t('quiz.noVocabulary')}</p>
              ) : null}

              {!vocabularyLoading && !vocabularyError && sourceVocabulary.length > 0 && availableVocabulary.length === 0 ? (
                <p className="text-xs font-black text-rose-600">{t('quiz.noTranslatedVocabulary')}</p>
              ) : null}

              {!vocabularyLoading && !vocabularyError && availableVocabulary.length > 0 && missingTranslationVocabulary.length === 0 ? (
                <p className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{t('quiz.availableCount', { count: availableVocabulary.length })}</span>
                </p>
              ) : null}

              {!vocabularyLoading && !vocabularyError && availableVocabulary.length > 0 && missingTranslationVocabulary.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-black text-amber-800">
                    {t('quiz.partialAvailableCount', {
                      available: availableVocabulary.length,
                      total: sourceVocabulary.length,
                    })}
                  </p>
                  <p className="text-xs font-bold text-slate-600">
                    {t('quiz.missingTranslationNotice', { count: missingTranslationVocabulary.length })}
                  </p>
                </div>
              ) : null}
            </div>

            {/* Start Button */}
            <Button
              disabled={cannotStart}
              onClick={startQuiz}
              className="neo-button w-full py-3.5 bg-[#fdc800] hover:bg-amber-300 text-slate-900 font-black text-sm border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-xl flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-slate-900" />
              <span>{t('quiz.start')}</span>
            </Button>
          </div>
        </div>

        {/* Quiz Preview Side Card */}
        <div className="neo-card p-6 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-2xl space-y-4">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-600" />
            <span>{t('quiz.previewTitle')}</span>
          </h2>

          <div className="space-y-3">
            <div className="neo-card p-3.5 bg-amber-50 border-2 border-slate-900 rounded-xl space-y-1">
              <span className="text-[10px] font-black uppercase text-amber-800">{t('quiz.previewDeck')}</span>
              <p className="text-sm font-black text-slate-900">
                {selectedDeckId ? (deckService.getDeckPath(selectedDeckId, decks) || '—') : t('quiz.allVocabulary')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="neo-card p-3.5 bg-purple-100 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-xl text-center">
                <p className="text-2xl font-black text-purple-950">{effectiveQuestionCount}</p>
                <p className="text-[10px] font-black uppercase text-purple-800 mt-0.5">{t('quiz.previewQuestions')}</p>
              </div>

              <div className="neo-card p-3.5 bg-emerald-100 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-xl text-center">
                <p className="text-2xl font-black text-emerald-950">{availableVocabulary.length}</p>
                <p className="text-[10px] font-black uppercase text-emerald-800 mt-0.5">{t('quiz.previewAvailable')}</p>
              </div>
            </div>

            <div className="neo-card p-4 bg-slate-900 text-white border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-xl space-y-2">
              <p className="text-xs font-black uppercase text-[#fdc800]">{t('quiz.previewDistribution')}</p>
              <div className="space-y-1 pt-1 border-t border-slate-800">
                {(['word', 'phrase', 'idiom', 'sentence'] as const).filter((type) => typeDistribution[type]).map((type) => (
                  <div key={type} className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-300">{t(`vocabulary.${type}`)}</span>
                    <span className="font-black text-[#fdc800]">{typeDistribution[type]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quiz History Section */}
      {shouldUseRemoteData ? (
        <div className="neo-card p-6 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-purple-700" />
              <h2 className="text-lg font-black text-slate-900">{t('quiz.historyTitle')}</h2>
            </div>
            {(historyQuery.data?.length ?? 0) > 0 ? (
              <Button variant="ghost" onClick={() => setClearHistoryOpen(true)} className="text-xs font-bold text-rose-600">
                {t('quiz.clearHistory')}
              </Button>
            ) : null}
          </div>

          {historyQuery.isLoading ? <p className="text-xs font-bold text-slate-500">{t('vocabulary.loading')}</p> : null}
          {historyQuery.error ? <p className="text-xs font-bold text-rose-600">{historyQuery.error.message}</p> : null}
          {!historyQuery.isLoading && (historyQuery.data?.length ?? 0) === 0 ? (
            <p className="text-xs font-bold text-slate-500 py-2">{t('quiz.historyEmpty')}</p>
          ) : null}

          <div className="space-y-3">
            {(historyQuery.data ?? []).map((result) => (
              <div key={result.id} className="neo-card p-4 bg-slate-50 border-2 border-slate-900 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-black text-sm text-slate-900">{new Date(result.created_at).toLocaleString()}</p>
                  <p className="text-xs font-bold text-slate-600 mt-0.5">
                    {result.deck_id ? (decks.find((d) => d.id === result.deck_id)?.name ?? t('quiz.deck')) : t('quiz.allVocabulary')} · {t('quiz.historyQuestions', { count: result.total_questions })}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Badge className="bg-[#fdc800] text-slate-900 font-black text-sm border-2 border-slate-900 shadow-[1.5px_1.5px_0px_0px_#000] px-3 py-1">
                    {result.correct_answers} / {result.total_questions}
                  </Badge>
                  <button
                    type="button"
                    disabled={deletingId === result.id}
                    onClick={async () => {
                      setDeletingId(result.id)
                      try {
                        await deleteResultMutation.mutateAsync(result.id)
                      } catch { /* keep button enabled for retry */ }
                      setDeletingId(null)
                    }}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={clearHistoryOpen}
        title={t('quiz.clearHistoryTitle')}
        description={t('quiz.clearHistoryDescription')}
        confirmLabel={t('quiz.clearHistoryConfirm')}
        cancelLabel={t('actions.cancel')}
        variant="danger"
        onConfirm={() => {
          clearHistoryMutation.mutate()
          setClearHistoryOpen(false)
        }}
        onCancel={() => setClearHistoryOpen(false)}
      />

      {suggestions.length > 0 ? (
        <div
          role="dialog"
          aria-modal="true"
          className={`${suggestionsModalOpen ? '' : 'hidden'} fixed inset-0 z-50 flex items-start justify-center overflow-y-auto pt-[8vh] px-4`}
        >
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSuggestionsModalOpen(false)} />
          <div className="relative z-10 w-full max-w-4xl rounded-2xl border-4 border-slate-900 bg-white p-6 shadow-[8px_8px_0px_0px_#000] space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-amber-600">{t('quiz.suggestionsTitle')}</h2>
                <p className="text-xs font-bold text-slate-600 mt-1">{t('quiz.suggestionsDescription')}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  className="neo-button bg-[#fdc800] text-slate-900 font-black text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000]"
                  disabled={isAcceptingAll || suggestions.every((s) => acceptedIds.has(s.userTermId) || savingIds.has(s.userTermId))}
                  onClick={async () => { setIsAcceptingAll(true); await acceptAllSuggestions(); setIsAcceptingAll(false) }}
                >
                  {t('quiz.suggestionsAcceptAll')}
                </Button>
                <button
                  type="button"
                  className="neo-button p-2 rounded-xl border-2 border-slate-900 bg-slate-100 hover:bg-slate-200"
                  onClick={() => setSuggestionsModalOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 max-h-[60vh] overflow-y-auto pr-1">
              {suggestions.map((suggestion) => {
                const isSaving = savingIds.has(suggestion.userTermId)
                const isAccepted = acceptedIds.has(suggestion.userTermId)
                return (
                  <div
                    key={suggestion.userTermId}
                    className="neo-card p-4 bg-slate-50 border-2 border-slate-900 rounded-xl space-y-2"
                  >
                    <p className="text-sm font-black text-slate-900">{suggestion.sourceText}</p>
                    <div className="space-y-1 text-xs font-bold">
                      <p className="text-slate-500">{t('quiz.existingTranslation')}: <span className="text-slate-900 font-black">{suggestion.existingTranslation || t('quiz.suggestionsNoExisting')}</span></p>
                      <p className="text-amber-700">{t('quiz.suggestedTranslation')}: <span className="font-black text-slate-900">{suggestion.suggestedTranslation}</span></p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                      {isAccepted ? (
                        <span className="text-xs font-black text-emerald-700">{t('quiz.suggestionsAccepted')}</span>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => acceptSuggestion(suggestion)}
                            className="neo-button p-2 bg-[#fdc800] text-slate-900 font-black text-xs border-2 border-slate-900 rounded-lg shadow-[1.5px_1.5px_0px_0px_#000]"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => dismissSuggestion(suggestion)}
                            className="neo-button p-2 bg-rose-100 text-rose-700 font-black text-xs border-2 border-slate-900 rounded-lg shadow-[1.5px_1.5px_0px_0px_#000]"
                          >
                            <X size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
