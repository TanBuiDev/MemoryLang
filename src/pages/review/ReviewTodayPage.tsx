import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { demoVocabulary } from '@/features/demo/demoData'
import { useI18n } from '@/i18n'

export function ReviewTodayPage() {
  const { t } = useI18n()
  const due = demoVocabulary.filter((item) => item.next_review_at && new Date(item.next_review_at) <= new Date())
  const difficult = demoVocabulary.filter((item) => item.status === 'difficult')

  return (
    <>
      <PageHeader title={t('review.title')} description={t('review.description')} actions={<Button asChild><Link to="/app/study">{t('review.start')}</Link></Button>} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-black">{t('review.dueToday')}</h2>
          <div className="mt-4 grid gap-2">{due.map((item) => <Link key={item.id} to={`/app/vocabulary/${item.id}`} className="rounded-md border-2 border-border p-3 font-black">{item.source_text}</Link>)}</div>
        </Card>
        <Card>
          <h2 className="text-xl font-black">{t('review.difficultWords')}</h2>
          <div className="mt-4 grid gap-2">{difficult.map((item) => <Link key={item.id} to={`/app/vocabulary/${item.id}`} className="rounded-md border-2 border-border p-3 font-black">{item.source_text}</Link>)}</div>
        </Card>
      </div>
    </>
  )
}
