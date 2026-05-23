import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { StatTile } from '@/components/common/StatTile'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { demoVocabulary } from '@/features/demo/demoData'
import { useI18n } from '@/i18n'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { filterActiveVocabulary } from '@/utils/vocabulary'

export function StudyResultPage() {
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)
  const vocabularyQuery = useQuery({
    queryKey: ['vocabulary', user?.id],
    queryFn: () => vocabularyService.list(user!.id),
    enabled: shouldUseRemoteData,
  })
  const vocabulary = filterActiveVocabulary(shouldUseRemoteData ? vocabularyQuery.data ?? [] : demoVocabulary)

  return (
    <>
      <PageHeader title={t('study.resultTitle')} description={t('study.resultDescription')} actions={<Button asChild><Link to="/app/study">{t('study.studyAgain')}</Link></Button>} />
      {vocabularyQuery.isLoading ? <Card className="mb-4 font-black">{t('vocabulary.loading')}</Card> : null}
      {vocabularyQuery.error ? <Card className="mb-4 font-black text-danger">{vocabularyQuery.error.message}</Card> : null}
      <div className="grid gap-4 md:grid-cols-4">
        <StatTile label={t('study.viewedCards')} value={vocabulary.length} />
        <StatTile label={t('study.known')} value={shouldUseRemoteData ? 0 : 2} />
        <StatTile label={t('study.difficult')} value={shouldUseRemoteData ? vocabulary.filter((item) => item.status === 'difficult').length : 1} />
        <StatTile label={t('study.timeSpent')} value={shouldUseRemoteData ? '0m' : '4m'} />
      </div>
    </>
  )
}
