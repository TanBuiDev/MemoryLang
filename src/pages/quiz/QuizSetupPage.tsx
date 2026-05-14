import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Label, Select } from '@/components/ui/input'
import { demoDecks } from '@/features/demo/demoData'
import { buildQuizSessionStorageKey, clearStoredQuizSession, writeActiveQuizSessionStorageKey } from '@/features/quiz/sessionPersistence'
import { useI18n } from '@/i18n'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { deckService } from '@/services/supabase/deck.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useQuizStore } from '@/stores/useQuizStore'

export function QuizSetupPage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const { quizType, questionCount, setQuestionCount, selectedDeckId, setSelectedDeckId } = useQuizStore()
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

  function startQuiz() {
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
          <div><Label>{t('quiz.type')}</Label><Select defaultValue="true_false"><option value="true_false">{t('quiz.trueFalse')}</option></Select></div>
          <div><Label>{t('quiz.questionCount')}</Label><Select value={questionCount} onChange={(event) => setQuestionCount(event.target.value === 'all' ? 'all' : Number(event.target.value))}><option value={5}>{t('quiz.questions', { count: 5 })}</option><option value={10}>{t('quiz.questions', { count: 10 })}</option><option value="all">{t('quiz.allQuestions')}</option></Select></div>
          <Button disabled={shouldUseRemoteData && decksQuery.isLoading} onClick={startQuiz}>{t('quiz.start')}</Button>
        </div>
      </Card>
    </>
  )
}
