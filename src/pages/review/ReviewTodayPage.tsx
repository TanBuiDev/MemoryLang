import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { demoVocabulary } from '@/features/demo/demoData'
import { useI18n } from '@/i18n'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useStudyStore } from '@/stores/useStudyStore'
import { filterActiveVocabulary } from '@/utils/vocabulary'

export function ReviewTodayPage() {
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const setSelectedDeckId = useStudyStore((state) => state.setSelectedDeckId)
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)
  const vocabularyQuery = useQuery({
    queryKey: ['vocabulary', user?.id],
    queryFn: () => vocabularyService.list(user!.id),
    enabled: shouldUseRemoteData,
  })
  const vocabulary = filterActiveVocabulary(shouldUseRemoteData ? vocabularyQuery.data ?? [] : demoVocabulary)
  const due = vocabulary.filter((item) => item.next_review_at && new Date(item.next_review_at) <= new Date())
  const difficult = vocabulary.filter((item) => item.status === 'difficult')
  const isLoading = shouldUseRemoteData && vocabularyQuery.isLoading
  const error = vocabularyQuery.error instanceof Error ? vocabularyQuery.error.message : null

  return (
    <>
      <PageHeader title={t('review.title')} description={t('review.description')} actions={<Button asChild><Link to="/app/study/session/review-session" onClick={() => setSelectedDeckId(null)}>{t('review.start')}</Link></Button>} />
      <div className="grid gap-4 lg:grid-cols-2">
        {isLoading ? <Card className="font-black lg:col-span-2">{t('vocabulary.loading')}</Card> : null}
        {error ? <Card className="font-black text-danger lg:col-span-2">{error}</Card> : null}
        <Card>
          <h2 className="text-xl font-black">{t('review.dueToday')}</h2>
          <div className="mt-4 grid gap-2">
            {!isLoading && due.length === 0 ? <p className="rounded-md border-2 border-border bg-muted p-3 text-sm font-black text-muted-foreground">{t('vocabulary.emptyTitle')}</p> : null}
            {due.map((item) => <Link key={item.id} to={`/app/vocabulary/${item.id}`} className="rounded-md border-2 border-border p-3 font-black">{item.source_text}</Link>)}
          </div>
        </Card>
        <Card>
          <h2 className="text-xl font-black">{t('review.difficultWords')}</h2>
          <div className="mt-4 grid gap-2">
            {!isLoading && difficult.length === 0 ? <p className="rounded-md border-2 border-border bg-muted p-3 text-sm font-black text-muted-foreground">{t('vocabulary.emptyTitle')}</p> : null}
            {difficult.map((item) => <Link key={item.id} to={`/app/vocabulary/${item.id}`} className="rounded-md border-2 border-border p-3 font-black">{item.source_text}</Link>)}
          </div>
        </Card>
      </div>
    </>
  )
}
