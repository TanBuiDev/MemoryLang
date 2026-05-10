import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { demoVocabulary } from '@/features/demo/demoData'
import { generateTrueFalseQuestions } from '@/features/quiz/trueFalseQuiz'
import { useI18n } from '@/i18n'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useQuizStore } from '@/stores/useQuizStore'

export function QuizSessionPage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const questionCount = useQuizStore((state) => state.questionCount)
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)
  const vocabularyQuery = useQuery({
    queryKey: ['vocabulary', user?.id],
    queryFn: () => vocabularyService.list(user!.id),
    enabled: shouldUseRemoteData,
  })
  const vocabulary = useMemo(
    () => shouldUseRemoteData ? vocabularyQuery.data ?? [] : demoVocabulary,
    [shouldUseRemoteData, vocabularyQuery.data],
  )
  const questions = useMemo(() => generateTrueFalseQuestions(vocabulary, questionCount), [questionCount, vocabulary])
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const question = questions[index]

  function answer(value: boolean) {
    const nextScore = score + (value === question.expectedAnswer ? 1 : 0)
    setScore(nextScore)
    if (index >= questions.length - 1) {
      navigate(`/app/quiz/result/demo-result?score=${nextScore}&total=${questions.length}`)
      return
    }
    setIndex(index + 1)
  }

  if (vocabularyQuery.isLoading) {
    return <Card className="font-black">{t('vocabulary.loading')}</Card>
  }

  if (vocabularyQuery.error) {
    return <Card className="font-black text-danger">{vocabularyQuery.error.message}</Card>
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
