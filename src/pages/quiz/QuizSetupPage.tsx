import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Label, Select } from '@/components/ui/input'
import { demoDecks, getDemoVocabularyForDeck } from '@/features/demo/demoData'
import { buildQuizSessionStorageKey, clearStoredQuizSession, writeActiveQuizSessionStorageKey } from '@/features/quiz/sessionPersistence'
import { hasTranslation } from '@/features/quiz/translationInputQuiz'
import { useI18n } from '@/i18n'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { deckService } from '@/services/supabase/deck.service'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useQuizStore } from '@/stores/useQuizStore'
import { filterActiveVocabulary } from '@/utils/vocabulary'

export function QuizSetupPage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const { questionCount, setQuizType, setQuestionCount, selectedDeckId, setSelectedDeckId } = useQuizStore()
  const quizType = 'translation_input' as const
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
    () => filterActiveVocabulary(shouldUseRemoteData ? sourceVocabularyQuery.data ?? [] : getDemoVocabularyForDeck(selectedDeckId)),
    [selectedDeckId, shouldUseRemoteData, sourceVocabularyQuery.data],
  )
  const availableVocabulary = useMemo(
    () => sourceVocabulary.filter(hasTranslation),
    [sourceVocabulary],
  )
  const vocabularyLoading = shouldUseRemoteData && sourceVocabularyQuery.isLoading
  const vocabularyError = shouldUseRemoteData && sourceVocabularyQuery.isError
  const cannotStart = decksQuery.isLoading || vocabularyLoading || vocabularyError || availableVocabulary.length === 0

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
      <PageHeader title={t('quiz.setupTitle')} description={t('quiz.setupDescription')} />
      <Card className="max-w-2xl">
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
          <div><Label>{t('quiz.questionCount')}</Label><Select value={questionCount} onChange={(event) => setQuestionCount(event.target.value === 'all' ? 'all' : Number(event.target.value))}><option value={5}>{t('quiz.questions', { count: 5 })}</option><option value={10}>{t('quiz.questions', { count: 10 })}</option><option value="all">{t('quiz.allQuestions')}</option></Select></div>
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
            {!vocabularyLoading && !vocabularyError && availableVocabulary.length > 0 ? <p className="text-sm font-black text-success">{t('quiz.availableCount', { count: availableVocabulary.length })}</p> : null}
          </div>
          <Button disabled={cannotStart} onClick={startQuiz}>{t('quiz.start')}</Button>
        </div>
      </Card>
    </>
  )
}
