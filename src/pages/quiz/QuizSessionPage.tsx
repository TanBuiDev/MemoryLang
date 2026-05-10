import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { demoVocabulary } from '@/features/demo/demoData'
import { generateTrueFalseQuestions } from '@/features/quiz/trueFalseQuiz'
import { useI18n } from '@/i18n'
import { useQuizStore } from '@/stores/useQuizStore'

export function QuizSessionPage() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const questionCount = useQuizStore((state) => state.questionCount)
  const questions = useMemo(() => generateTrueFalseQuestions(demoVocabulary, questionCount), [questionCount])
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
