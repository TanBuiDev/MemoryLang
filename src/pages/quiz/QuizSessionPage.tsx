/* eslint-disable react-hooks/set-state-in-effect */
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { demoVocabulary } from '@/features/demo/demoData'
import { buildQuizSessionStorageKey, clearStoredQuizSession, readActiveQuizSessionStorageKey, readStoredQuizSession, writeStoredQuizSession } from '@/features/quiz/sessionPersistence'
import { generateTrueFalseQuestions } from '@/features/quiz/trueFalseQuiz'
import { prepareSessionVocabulary } from '@/features/study/sessionVocabulary'
import { useI18n } from '@/i18n'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { deckService } from '@/services/supabase/deck.service'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useQuizStore } from '@/stores/useQuizStore'
import { filterActiveVocabulary } from '@/utils/vocabulary'

export function QuizSessionPage() {
  const navigate = useNavigate()
  const { sessionId } = useParams()
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const { quizType, questionCount, selectedDeckId } = useQuizStore()
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)
  const fallbackSessionKey = buildQuizSessionStorageKey({
    userId: user?.id,
    sessionId,
    selectedDeckId,
    quizType,
    questionCount,
    remote: shouldUseRemoteData,
  })
  const sessionKey = readActiveQuizSessionStorageKey({
    userId: user?.id,
    sessionId,
    remote: shouldUseRemoteData,
  }) ?? fallbackSessionKey
  const initialStoredSession = readStoredQuizSession(sessionKey)
  const [index, setIndex] = useState(initialStoredSession?.index ?? 0)
  const [score, setScore] = useState(initialStoredSession?.score ?? 0)
  const [quizSnapshot, setQuizSnapshot] = useState(initialStoredSession ? { key: sessionKey, questions: initialStoredSession.questions } : null)
  const vocabularyQuery = useQuery({
    queryKey: ['vocabulary', user?.id],
    queryFn: () => vocabularyService.list(user!.id),
    enabled: shouldUseRemoteData && !selectedDeckId,
  })
  const deckTermsQuery = useQuery({
    queryKey: ['deck-terms', selectedDeckId],
    queryFn: () => deckService.listTerms(selectedDeckId!),
    enabled: shouldUseRemoteData && Boolean(selectedDeckId),
  })
  const vocabulary = useMemo(
    () => {
      const source = shouldUseRemoteData
        ? selectedDeckId
          ? deckTermsQuery.data ?? []
          : vocabularyQuery.data ?? []
        : demoVocabulary
      return prepareSessionVocabulary(filterActiveVocabulary(source), { limit: questionCount, shuffle: true })
    },
    [deckTermsQuery.data, questionCount, selectedDeckId, shouldUseRemoteData, vocabularyQuery.data],
  )
  const generatedQuestions = useMemo(() => generateTrueFalseQuestions(vocabulary, questionCount), [questionCount, vocabulary])
  const isSourceReady = shouldUseRemoteData
    ? selectedDeckId
      ? deckTermsQuery.isSuccess
      : vocabularyQuery.isSuccess
    : true

  useEffect(() => {
    if (quizSnapshot?.key === sessionKey) return

    const storedSession = readStoredQuizSession(sessionKey)
    if (storedSession) {
      setQuizSnapshot({ key: sessionKey, questions: storedSession.questions })
      setIndex(storedSession.index)
      setScore(storedSession.score)
      return
    }

    if (!isSourceReady || generatedQuestions.length === 0) return
    writeStoredQuizSession(sessionKey, { questions: generatedQuestions, index: 0, score: 0 })
    setQuizSnapshot({ key: sessionKey, questions: generatedQuestions })
    setIndex(0)
    setScore(0)
  }, [generatedQuestions, isSourceReady, quizSnapshot?.key, sessionKey])

  const questions = quizSnapshot?.key === sessionKey ? quizSnapshot.questions : generatedQuestions

  useEffect(() => {
    if (quizSnapshot?.key !== sessionKey) return
    writeStoredQuizSession(sessionKey, { questions: quizSnapshot.questions, index, score })
  }, [index, quizSnapshot, score, sessionKey])

  const question = questions[index]

  function answer(value: boolean) {
    const nextScore = score + (value === question.expectedAnswer ? 1 : 0)
    setScore(nextScore)
    if (index >= questions.length - 1) {
      clearStoredQuizSession(sessionKey)
      navigate(`/app/quiz/result/demo-result?score=${nextScore}&total=${questions.length}`)
      return
    }
    setIndex(index + 1)
  }

  if (vocabularyQuery.isLoading || deckTermsQuery.isLoading) {
    return <Card className="font-black">{t('vocabulary.loading')}</Card>
  }

  const error =
    vocabularyQuery.error instanceof Error ? vocabularyQuery.error.message :
    deckTermsQuery.error instanceof Error ? deckTermsQuery.error.message :
    null

  if (error) {
    return <Card className="font-black text-danger">{error}</Card>
  }

  if (!question) {
    return (
      <Card className="text-center">
        <p className="text-xl font-black">{t('vocabulary.emptyTitle')}</p>
        <p className="mt-2 text-sm font-semibold text-muted-foreground">{t('vocabulary.emptyDescription')}</p>
      </Card>
    )
  }

  return (
    <>
      <PageHeader title={t('quiz.sessionTitle')} description={t('quiz.sessionDescription')} />
      <Progress value={((index + 1) / questions.length) * 100} />
      <Card className="mx-auto mt-6 max-w-2xl p-8 text-center">
        <p className="text-sm font-black uppercase text-muted-foreground">{t('quiz.question', { number: index + 1 })}</p>
        <CardTitle className="mt-6 text-4xl">{question.prompt}</CardTitle>
        <div className="mt-8 flex justify-center gap-3">
          <Button onClick={() => answer(true)}>{t('quiz.true')}</Button>
          <Button variant="secondary" onClick={() => answer(false)}>{t('quiz.false')}</Button>
        </div>
      </Card>
    </>
  )
}
