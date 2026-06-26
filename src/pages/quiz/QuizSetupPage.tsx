import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Pencil, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Label, Select } from '@/components/ui/input'
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
  const [editingSuggestionId, setEditingSuggestionId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

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
    <>
      {activeQuizSession ? (
        <Card className="mb-6 border-2 border-warning bg-warning/5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-lg font-black text-warning">{t('quiz.resumeTitle')}</p>
              <p className="text-sm font-bold text-muted-foreground">{t('quiz.resumeDescription')}</p>
              <p className="mt-1 text-sm font-black">
                {t('quiz.resumeProgress', {
                  completed: activeQuizSession.session.completedQuestionIds.length,
                  total: activeQuizSession.session.questions.length,
                })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => navigate(`/app/quiz/session/${activeQuizSession.sessionId}`)}>
                {t('quiz.resumeContinue')}
              </Button>
              <Button variant="ghost" onClick={abandonQuiz}>
                {t('quiz.resumeStartNew')}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card className="relative">
            {suggestions.length > 0 ? (
              <button
                type="button"
                className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-md border-2 border-warning bg-warning/10 px-2.5 py-1 text-xs font-black text-warning shadow-[1px_1px_0_var(--border)] hover:bg-warning/20"
                onClick={() => setSuggestionsModalOpen(true)}
              >
                {suggestions.length}
              </button>
            ) : null}
            <CardTitle>{t('quiz.options')}</CardTitle>
            <CardDescription className="mt-2">{t('quiz.optionsDescription')}</CardDescription>
            <div className="mt-6 grid gap-4">
              {decksQuery.isLoading ? <Card className="font-black">{t('decks.loading')}</Card> : null}
              {decksQuery.error ? <Card className="font-black text-danger">{decksQuery.error.message}</Card> : null}
              <div>
                <Label>{t('quiz.deck')}</Label>
                <Select value={selectedDeckId ?? ''} onChange={(event) => setSelectedDeckId(event.target.value || null)}>
                  <option value="">{t('quiz.allVocabulary')}</option>
                  {decks.map((deck) => <option key={deck.id} value={deck.id}>{deck.name}</option>)}
                </Select>
              </div>
              <div>
                <Label>{t('quiz.type')}</Label>
                <Select value={quizType} onChange={(event) => setQuizType(event.target.value as 'translation_input' | 'multiple_choice')}>
                  <option value="translation_input">{t('quiz.translationInput')}</option>
                  <option value="multiple_choice">{t('quiz.multipleChoice')}</option>
                </Select>
              </div>
              <div>
                <Label>{t('quiz.questionCount')}</Label>
                <div className="flex items-center gap-3 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={questionCount === 'all'}
                      onChange={(event) => setQuestionCount(event.target.checked ? 'all' : Math.min(10, availableVocabulary.length || 10))}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="text-sm font-black">{t('quiz.allQuestions')}</span>
                  </label>
                  {questionCount !== 'all' ? (
                    <div className="flex items-center rounded-md border-2 border-border bg-card shadow-[2px_2px_0_var(--border)]">
                      <button
                        type="button"
                        className="h-9 w-8 flex items-center justify-center text-sm font-black hover:bg-muted disabled:opacity-30"
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
                        className="h-9 w-14 text-center text-sm font-black bg-transparent tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        className="h-9 w-8 flex items-center justify-center text-sm font-black hover:bg-muted disabled:opacity-30"
                        disabled={questionCount >= (availableVocabulary.length || 100)}
                        onClick={() => setQuestionCount(Math.min(availableVocabulary.length || 100, (questionCount as number) + 1))}
                      >
                        +
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
              <div aria-live="polite" className="rounded-md border-2 border-border bg-background p-3 shadow-[2px_2px_0_var(--border)]">
                {vocabularyLoading ? <p className="text-sm font-black">{t('vocabulary.loading')}</p> : null}
                {vocabularyError ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-black text-danger">{t('quiz.loadError')}</p>
                    <Button variant="ghost" onClick={() => sourceVocabularyQuery.refetch()}>{t('quiz.retryLoad')}</Button>
                  </div>
                ) : null}
                {!vocabularyLoading && !vocabularyError && sourceVocabulary.length === 0 ? <p className="text-sm font-black text-danger">{t('quiz.noVocabulary')}</p> : null}
                {!vocabularyLoading && !vocabularyError && sourceVocabulary.length > 0 && availableVocabulary.length === 0 ? <p className="text-sm font-black text-danger">{t('quiz.noTranslatedVocabulary')}</p> : null}
                {!vocabularyLoading && !vocabularyError && availableVocabulary.length > 0 && missingTranslationVocabulary.length === 0 ? <p className="text-sm font-black text-success">{t('quiz.availableCount', { count: availableVocabulary.length })}</p> : null}
                {!vocabularyLoading && !vocabularyError && availableVocabulary.length > 0 && missingTranslationVocabulary.length > 0 ? (
                  <div className="grid gap-3">
                    <p className="text-sm font-black text-warning">
                      {t('quiz.partialAvailableCount', {
                        available: availableVocabulary.length,
                        total: sourceVocabulary.length,
                      })}
                    </p>
                    <p className="text-sm font-bold text-muted-foreground">
                      {t('quiz.missingTranslationNotice', { count: missingTranslationVocabulary.length })}
                    </p>
                    <div className="grid gap-2">
                      {missingTranslationVocabulary.map((item) => (
                        <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border-2 border-border bg-card p-2">
                          <span className="text-sm font-black">{item.source_text}</span>
                          <Button asChild variant="ghost" className="text-xs">
                            <Link
                              to={`/app/vocabulary/${item.id}`}
                              aria-label={t('quiz.addTranslationFor', { term: item.source_text })}
                            >
                              {t('quiz.addTranslation')}
                            </Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              <Button disabled={cannotStart} onClick={startQuiz}>{t('quiz.start')}</Button>
            </div>
          </Card>
        </div>

        <div>
          <Card className="sticky top-8 p-5">
            <CardTitle>{t('quiz.previewTitle')}</CardTitle>
            <div className="mt-5 grid gap-4">
              <div className="rounded-md border-2 border-border bg-background p-3 shadow-[2px_2px_0_var(--border)]">
                <p className="text-xs font-black uppercase text-muted-foreground">{t('quiz.previewDeck')}</p>
                <p className="mt-1 text-sm font-black">{selectedDeckId ? (decks.find((d) => d.id === selectedDeckId)?.name ?? '—') : t('quiz.allVocabulary')}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border-2 border-border bg-background p-3 shadow-[2px_2px_0_var(--border)]">
                  <p className="text-2xl font-black">{effectiveQuestionCount}</p>
                  <p className="text-xs font-black uppercase text-muted-foreground">{t('quiz.previewQuestions')}</p>
                </div>
                <div className="rounded-md border-2 border-border bg-background p-3 shadow-[2px_2px_0_var(--border)]">
                  <p className="text-2xl font-black">{availableVocabulary.length}</p>
                  <p className="text-xs font-black uppercase text-muted-foreground">{t('quiz.previewAvailable')}</p>
                </div>
              </div>
              <div className="rounded-md border-2 border-border bg-background p-3 shadow-[2px_2px_0_var(--border)]">
                <p className="mb-2 text-xs font-black uppercase text-muted-foreground">{t('quiz.previewDistribution')}</p>
                <div className="grid gap-1.5">
                  {(['word', 'phrase', 'idiom', 'sentence'] as const).filter((type) => typeDistribution[type]).map((type) => (
                    <div key={type} className="flex items-center justify-between text-sm">
                      <span className="font-bold text-muted-foreground">{t(`vocabulary.${type}`)}</span>
                      <span className="font-black">{typeDistribution[type]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {shouldUseRemoteData ? (
        <Card className="mt-6 p-5">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <CardTitle>{t('quiz.historyTitle')}</CardTitle>
              <CardDescription className="mt-2">{t('quiz.historyDescription')}</CardDescription>
            </div>
            {(historyQuery.data?.length ?? 0) > 0 ? (
              <Button variant="ghost" onClick={() => setClearHistoryOpen(true)}>{t('quiz.clearHistory')}</Button>
            ) : null}
          </div>

          {historyQuery.isLoading ? <p className="mt-5 text-sm font-black">{t('vocabulary.loading')}</p> : null}
          {historyQuery.error ? <p className="mt-5 text-sm font-black text-danger">{historyQuery.error.message}</p> : null}
          {!historyQuery.isLoading && (historyQuery.data?.length ?? 0) === 0 ? (
            <p className="mt-5 text-sm font-bold text-muted-foreground">{t('quiz.historyEmpty')}</p>
          ) : null}

          <div className="mt-5 grid gap-3">
            {(historyQuery.data ?? []).map((result) => (
              <div key={result.id} className="flex flex-col gap-3 rounded-md border-2 border-border bg-background p-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-black">{new Date(result.created_at).toLocaleString()}</p>
                  <p className="mt-1 text-sm font-bold text-muted-foreground">
                    {result.deck_id ? (decks.find((d) => d.id === result.deck_id)?.name ?? t('quiz.deck')) : t('quiz.allVocabulary')} · {t('quiz.historyQuestions', { count: result.total_questions })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-md border-2 border-border bg-card px-2 py-1 text-sm font-black">
                    {result.correct_answers}/{result.total_questions}
                  </span>
                  <Button
                    variant="ghost"
                    className="text-xs"
                    disabled={deletingId === result.id}
                    onClick={async () => {
                      setDeletingId(result.id)
                      try {
                        await deleteResultMutation.mutateAsync(result.id)
                      } catch { /* keep button enabled for retry */ }
                      setDeletingId(null)
                    }}
                  >
                    {t('quiz.historyDelete')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
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
          className={`${suggestionsModalOpen ? '' : 'hidden'} fixed inset-0 z-50 flex items-start justify-center overflow-y-auto pt-[8vh]`}
        >
          <div className="fixed inset-0 bg-foreground/40" onClick={() => setSuggestionsModalOpen(false)} />
          <div className="relative z-10 w-full max-w-4xl rounded-xl border-2 border-warning bg-card p-6 shadow-[5px_5px_0_var(--border)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-warning">{t('quiz.suggestionsTitle')}</h2>
                <p className="mt-1 text-sm font-bold text-muted-foreground">{t('quiz.suggestionsDescription')}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  className="text-xs"
                  disabled={isAcceptingAll || suggestions.every((s) => acceptedIds.has(s.userTermId) || savingIds.has(s.userTermId))}
                  onClick={async () => { setIsAcceptingAll(true); await acceptAllSuggestions(); setIsAcceptingAll(false) }}
                >
                  {t('quiz.suggestionsAcceptAll')}
                </Button>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border-2 border-border bg-secondary text-sm font-black text-secondary-foreground shadow-[1px_1px_0_var(--border)] hover:bg-secondary/80"
                  onClick={() => setSuggestionsModalOpen(false)}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {suggestions.map((suggestion) => {
                const isSaving = savingIds.has(suggestion.userTermId)
                const isAccepted = acceptedIds.has(suggestion.userTermId)
                return (
                  <div
                    key={suggestion.userTermId}
                    className="rounded-md border-2 border-border bg-background p-3 shadow-[2px_2px_0_var(--border)]"
                  >
                    <p className="text-sm font-black">
                      <span className="text-muted-foreground">{suggestion.sourceText}</span>
                    </p>
                    <div className="mt-2 grid gap-2 text-xs">
                      <div>
                        <span className="font-black uppercase text-muted-foreground">{t('quiz.existingTranslation')}: </span>
                        <span className="font-black">{suggestion.existingTranslation || t('quiz.suggestionsNoExisting')}</span>
                      </div>
                      <div>
                        <span className="font-black uppercase text-warning">{t('quiz.suggestedTranslation')}: </span>
                        {editingSuggestionId === suggestion.userTermId ? (
                          <input
                            value={editText}
                            onChange={(event) => setEditText(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') acceptSuggestion(suggestion, editText)
                              if (event.key === 'Escape') setEditingSuggestionId(null)
                            }}
                            className="mt-1 min-h-8 w-full rounded-md border-2 border-border bg-card px-2 py-1 text-xs font-semibold shadow-[2px_2px_0_var(--border)] outline-none focus:border-primary"
                            autoFocus
                          />
                        ) : (
                          <span className="font-black">{suggestion.suggestedTranslation}</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      {isAccepted ? (
                        <span className="inline-flex min-h-10 items-center px-3 text-sm font-black text-success">
                          {t('quiz.suggestionsAccepted')}
                        </span>
                      ) : editingSuggestionId === suggestion.userTermId ? (
                        <>
                          <button
                            type="button"
                            className="neo-button inline-flex min-h-10 w-10 items-center justify-center rounded-md border-2 border-border bg-primary text-primary-foreground shadow-[2px_2px_0_var(--border)] disabled:pointer-events-none disabled:opacity-50 active:neo-button-active hover:bg-[#ffe05c]"
                            disabled={isSaving || !editText.trim()}
                            aria-label={t('actions.saveChanges')}
                            onClick={() => acceptSuggestion(suggestion, editText)}
                          >
                            <Check size={16} />
                          </button>
                          <button
                            type="button"
                            className="neo-button inline-flex min-h-10 w-10 items-center justify-center rounded-md border-2 border-border bg-card text-muted-foreground shadow-[2px_2px_0_var(--border)] disabled:pointer-events-none disabled:opacity-50 active:neo-button-active hover:bg-muted"
                            disabled={isSaving}
                            aria-label={t('actions.cancel')}
                            onClick={() => setEditingSuggestionId(null)}
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="neo-button inline-flex min-h-10 w-10 items-center justify-center rounded-md border-2 border-border bg-primary text-primary-foreground shadow-[2px_2px_0_var(--border)] disabled:pointer-events-none disabled:opacity-50 active:neo-button-active hover:bg-[#ffe05c]"
                            disabled={isSaving}
                            aria-label={t('quiz.suggestionsAccept')}
                            onClick={() => acceptSuggestion(suggestion)}
                          >
                            <Check size={16} />
                          </button>
                          <button
                            type="button"
                            className="neo-button inline-flex min-h-10 w-10 items-center justify-center rounded-md border-2 border-border bg-card text-muted-foreground shadow-[2px_2px_0_var(--border)] disabled:pointer-events-none disabled:opacity-50 active:neo-button-active hover:bg-muted"
                            disabled={isSaving}
                            aria-label={t('vocabulary.edit')}
                            onClick={() => { setEditingSuggestionId(suggestion.userTermId); setEditText(suggestion.suggestedTranslation) }}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="neo-button inline-flex min-h-10 w-10 items-center justify-center rounded-md border-2 border-border bg-card text-muted-foreground shadow-[2px_2px_0_var(--border)] disabled:pointer-events-none disabled:opacity-50 active:neo-button-active hover:bg-muted"
                            disabled={isSaving}
                            aria-label={t('quiz.suggestionsDismiss')}
                            onClick={() => dismissSuggestion(suggestion)}
                          >
                            <X size={16} />
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
    </>
  )
}
