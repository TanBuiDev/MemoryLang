import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/input'
import { demoVocabulary } from '@/features/demo/demoData'
import { useI18n } from '@/i18n'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'
import type { VocabularyStatus } from '@/types/vocabulary.types'
import { speak } from '@/utils/audio'

const statusLabelKeys: Record<VocabularyStatus, string> = {
  new: 'vocabulary.statusNew',
  learning: 'vocabulary.statusLearning',
  familiar: 'vocabulary.statusFamiliar',
  memorized: 'vocabulary.statusMemorized',
  difficult: 'vocabulary.statusDifficult',
  need_review: 'vocabulary.statusNeedReview',
}

export function VocabularyListPage() {
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)
  const vocabularyQuery = useQuery({
    queryKey: ['vocabulary', user?.id],
    queryFn: () => vocabularyService.list(user!.id),
    enabled: shouldUseRemoteData,
  })
  const vocabulary = shouldUseRemoteData ? vocabularyQuery.data ?? [] : demoVocabulary

  return (
    <>
      <PageHeader title={t('vocabulary.title')} description={t('vocabulary.description')} actions={<Button asChild><Link to="/app/vocabulary/new">{t('vocabulary.add')}</Link></Button>} />
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <Input placeholder={t('vocabulary.search')} />
        <Select defaultValue="all"><option value="all">{t('vocabulary.allStatuses')}</option><option value="difficult">{t('vocabulary.statusDifficult')}</option><option value="need_review">{t('vocabulary.statusNeedReview')}</option></Select>
        <Select defaultValue="created"><option value="created">{t('vocabulary.sortCreated')}</option><option value="next_review">{t('vocabulary.sortReview')}</option><option value="wrong">{t('vocabulary.sortWrong')}</option></Select>
        <Select defaultValue="all"><option value="all">{t('vocabulary.allPartsOfSpeech')}</option><option value="noun">{t('vocabulary.noun')}</option><option value="idiom">{t('vocabulary.idiom')}</option></Select>
      </div>
      <div className="grid gap-3">
        {vocabularyQuery.isLoading ? <Card className="font-black">{t('vocabulary.loading')}</Card> : null}
        {vocabularyQuery.error ? <Card className="font-black text-danger">{vocabularyQuery.error.message}</Card> : null}
        {!vocabularyQuery.isLoading && vocabulary.length === 0 ? (
          <Card className="text-center">
            <p className="text-xl font-black">{t('vocabulary.emptyTitle')}</p>
            <p className="mt-2 text-sm font-semibold text-muted-foreground">{t('vocabulary.emptyDescription')}</p>
            <Button asChild className="mt-4"><Link to="/app/vocabulary/new">{t('vocabulary.add')}</Link></Button>
          </Card>
        ) : null}
        {vocabulary.map((item) => (
          <Card key={item.id} className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/app/vocabulary/${item.id}`} className="text-xl font-black underline">{item.source_text}</Link>
                <Badge>{t(statusLabelKeys[item.status])}</Badge>
                {item.part_of_speech ? <Badge className="bg-muted">{item.part_of_speech}</Badge> : null}
              </div>
              <p className="mt-1 font-mono text-sm">{item.ipa}</p>
              <p className="font-semibold text-muted-foreground">{item.meanings[0]?.text}</p>
              <div className="mt-2 flex flex-wrap gap-1">{item.tags.map((tag) => <Badge key={tag} className="bg-card">#{tag}</Badge>)}</div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => speak(item.source_text)}>{t('vocabulary.audio')}</Button>
              <Button asChild variant="secondary"><Link to={`/app/vocabulary/${item.id}/edit`}>{t('vocabulary.edit')}</Link></Button>
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}
