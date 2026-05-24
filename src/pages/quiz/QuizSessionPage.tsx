/* eslint-disable react-hooks/set-state-in-effect */
import { useQuery } from '@tanstack/react-query'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { getDemoVocabularyForDeck } from '@/features/demo/demoData'
import {
  buildQuizSessionStorageKey,
  clearStoredQuizSession,
  readActiveQuizSessionStorageKey,
  readStoredQuizSession,
  type StoredQuizSession,
  writeStoredQuizSession,
} from '@/features/quiz/sessionPersistence'
import { generateTranslationQuestions, isTranslationAnswerCorrect } from '@/features/quiz/translationInputQuiz'
import { useI18n } from '@/i18n'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { deckService } from '@/services/supabase/deck.service'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useQuizStore } from '@/stores/useQuizStore'
import { filterActiveVocabulary } from '@/utils/vocabulary'

function appendUnique(ids: string[], id: string) {
  return ids.includes(id) ? ids : [...ids, id]
}

export function QuizSessionPage() {
  const navigate = useNavigate()
  const { sessionId } = useParams()
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const { questionCount, selectedDeckId } = useQuizStore()
  const quizType = 'translation_input' as const
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
  const [session, setSession] = useState<StoredQuizSession | null>(() => readStoredQuizSession(sessionKey))
  const [answerText, setAnswerText] = useState('')
  const [isIncorrect, setIsIncorrect] = useState(false)
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
  const sourceVocabulary = useMemo(() => {
    const source = shouldUseRemoteData
      ? selectedDeckId
        ? deckTermsQuery.data ?? []
        : vocabularyQuery.data ?? []
      : getDemoVocabularyForDeck(selectedDeckId)
    return filterActiveVocabulary(source)
  }, [deckTermsQuery.data, selectedDeckId, shouldUseRemoteData, vocabularyQuery.data])
  const generatedQuestions = useMemo(
    () => generateTranslationQuestions(sourceVocabulary, questionCount),
    [questionCount, sourceVocabulary],
  )
  const sourceQuery = selectedDeckId ? deckTermsQuery : vocabularyQuery
  const isSourceReady = shouldUseRemoteData ? sourceQuery.isSuccess : true

  useEffect(() => {
    if (session || !isSourceReady || generatedQuestions.length === 0) return
    const initialSession: StoredQuizSession = {
      questions: generatedQuestions,
      index: 0,
      score: 0,
      revealedQuestionIds: [],
      completedQuestionIds: [],
    }
    writeStoredQuizSession(sessionKey, initialSession)
    setSession(initialSession)
  }, [generatedQuestions, isSourceReady, session, sessionKey])

  useEffect(() => {
    if (!session) return
    writeStoredQuizSession(sessionKey, session)
  }, [session, sessionKey])

  const question = session?.questions[session.index]
  const isRevealed = question ? session?.revealedQuestionIds.includes(question.id) ?? false : false

  function revealAnswer() {
    if (!session || !question) return
    setSession({
      ...session,
      revealedQuestionIds: appendUnique(session.revealedQuestionIds, question.id),
    })
  }

  function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!session || !question) return

    if (!isTranslationAnswerCorrect(answerText, question.expectedTranslation)) {
      setIsIncorrect(true)
      return
    }

    const completedQuestionIds = appendUnique(session.completedQuestionIds, question.id)
    const nextScore = session.score + (isRevealed ? 0 : 1)
    if (session.index >= session.questions.length - 1) {
      clearStoredQuizSession(sessionKey)
      navigate(`/app/quiz/result/demo-result?score=${nextScore}&total=${session.questions.length}`)
      return
    }

    setSession({
      ...session,
      index: session.index + 1,
      score: nextScore,
      completedQuestionIds,
    })
    setAnswerText('')
    setIsIncorrect(false)
  }

  if (shouldUseRemoteData && sourceQuery.isLoading && !session) {
    return <Card className="font-black">{t('vocabulary.loading')}</Card>
  }

  if (shouldUseRemoteData && sourceQuery.isError && !session) {
    return (
      <Card className="flex flex-wrap items-center justify-between gap-3 font-black text-danger">
        <p>{t('quiz.loadError')}</p>
        <Button variant="ghost" onClick={() => sourceQuery.refetch()}>{t('quiz.retryLoad')}</Button>
      </Card>
    )
  }

  if (!question && generatedQuestions.length > 0) {
    return <Card className="font-black">{t('vocabulary.loading')}</Card>
  }

  if (!question) {
    const emptyMessage = sourceVocabulary.length === 0 ? t('quiz.noVocabulary') : t('quiz.noTranslatedVocabulary')
    return <Card className="text-center text-xl font-black">{emptyMessage}</Card>
  }

  return (
    <>
      <PageHeader title={t('quiz.sessionTitle')} description={t('quiz.sessionDescription')} />
      <Progress value={((session.index + 1) / session.questions.length) * 100} />
      <Card className="mx-auto mt-6 max-w-2xl p-8">
        <p className="text-center text-sm font-black uppercase text-muted-foreground">{t('quiz.question', { number: session.index + 1 })}</p>
        <CardTitle className="mt-6 text-center text-4xl">{question.sourceText}</CardTitle>
        <div className="mt-3 flex flex-wrap justify-center gap-2 text-sm font-black text-muted-foreground">
          {question.ipa ? <span className="rounded-md border-2 border-border bg-background px-3 py-1">{question.ipa}</span> : null}
          {question.partOfSpeech ? <span className="rounded-md border-2 border-border bg-background px-3 py-1">{question.partOfSpeech}</span> : null}
        </div>
        <form className="mt-8 grid gap-4" onSubmit={submitAnswer}>
          <div>
            <Label htmlFor="translation-answer">{t('quiz.answerLabel')}</Label>
            <Input
              id="translation-answer"
              autoComplete="off"
              autoFocus
              value={answerText}
              onChange={(event) => setAnswerText(event.target.value)}
            />
          </div>
          {isIncorrect ? <p aria-live="polite" className="font-black text-danger">{t('quiz.incorrect')}</p> : null}
          {isRevealed ? (
            <div className="rounded-md border-2 border-border bg-primary p-3 shadow-[2px_2px_0_var(--border)]">
              <p className="text-xs font-black uppercase">{t('quiz.expectedTranslation')}</p>
              <p className="mt-1 text-lg font-black">{question.expectedTranslation}</p>
              <p className="mt-2 text-sm font-bold">{t('quiz.revealedNotice')}</p>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button type="submit">{t('quiz.checkAnswer')}</Button>
            {isIncorrect && !isRevealed ? <Button type="button" variant="ghost" onClick={revealAnswer}>{t('quiz.revealAnswer')}</Button> : null}
          </div>
        </form>
      </Card>
    </>
  )
}
