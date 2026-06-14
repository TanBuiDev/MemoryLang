import { useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { getDemoQuestionsByPartId } from '@/features/listening/demoData'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function ListeningResultPage() {
  const { partId } = useParams<{ partId: string }>()
  const { t } = useI18n()
  const navigate = useNavigate()
  const questions = getDemoQuestionsByPartId(partId ?? '')

  const mockAnswers: Record<number, number> = {}
  const total = questions.length
  const correct = questions.filter((q) => mockAnswers[q.order] === q.correctIndex).length

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-black mb-4">{t('listening.score')}</h1>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="text-center">
          <p className="text-3xl font-black">{correct}/{total}</p>
          <p className="text-xs font-bold text-muted-foreground mt-1">{t('listening.score')}</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-black">{total > 0 ? Math.round((correct / total) * 100) : 0}%</p>
          <p className="text-xs font-bold text-muted-foreground mt-1">{t('listening.accuracy')}</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-black">{total - correct}</p>
          <p className="text-xs font-bold text-muted-foreground mt-1">{t('listening.wrong')}</p>
        </Card>
      </div>

      <div className="grid gap-2 mb-6">
        {questions.map((q, idx) => {
          const answered = mockAnswers[q.order]
          const isCorrect = answered === q.correctIndex
          return (
            <div key={q.id} className={`neo-card p-3 flex items-center justify-between gap-3 ${isCorrect ? 'border-success' : 'border-danger'}`}>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{idx + 1}. {q.questionText}</p>
                {answered !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    {t('listening.correct')}: {q.options[q.correctIndex]}
                  </p>
                )}
              </div>
              <span className={`text-sm font-black shrink-0 ${isCorrect ? 'text-success' : 'text-danger'}`}>
                {isCorrect ? '✓' : '✗'}
              </span>
            </div>
          )
        })}
      </div>

      <div className="flex gap-3">
        <Button onClick={() => navigate(-1)} variant="secondary">{t('listening.retry')}</Button>
        <Button onClick={() => navigate('/app/listening')} variant="ghost">{t('listening.backToList')}</Button>
      </div>
    </div>
  )
}
