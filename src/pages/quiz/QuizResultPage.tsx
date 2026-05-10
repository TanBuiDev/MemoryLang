import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { StatTile } from '@/components/common/StatTile'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'

export function QuizResultPage() {
  const { t } = useI18n()
  const [params] = useSearchParams()
  const score = Number(params.get('score') ?? 0)
  const total = Number(params.get('total') ?? 1)

  return (
    <>
      <PageHeader title={t('quiz.resultTitle')} description={t('quiz.resultDescription')} actions={<Button asChild><Link to="/app/quiz">{t('quiz.retry')}</Link></Button>} />
      <div className="grid gap-4 md:grid-cols-3">
        <StatTile label={t('quiz.score')} value={`${score}/${total}`} />
        <StatTile label={t('quiz.accuracy')} value={`${Math.round((score / total) * 100)}%`} />
        <StatTile label={t('quiz.wrongAnswers')} value={total - score} />
      </div>
    </>
  )
}
