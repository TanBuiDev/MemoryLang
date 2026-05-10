import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Label, Select, Textarea } from '@/components/ui/input'
import { demoVocabulary } from '@/features/demo/demoData'
import { useI18n } from '@/i18n'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'
import type { VocabularyStatus } from '@/types/vocabulary.types'

const statusLabelKeys: Record<VocabularyStatus, string> = {
  new: 'vocabulary.statusNew',
  learning: 'vocabulary.statusLearning',
  familiar: 'vocabulary.statusFamiliar',
  memorized: 'vocabulary.statusMemorized',
  difficult: 'vocabulary.statusDifficult',
  need_review: 'vocabulary.statusNeedReview',
}

export function EditVocabularyPage() {
  const { id } = useParams()
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)
  const vocabularyQuery = useQuery({
    queryKey: ['vocabulary', id],
    queryFn: () => vocabularyService.get(id!),
    enabled: shouldUseRemoteData && Boolean(id),
  })
  const item = shouldUseRemoteData ? vocabularyQuery.data : demoVocabulary.find((entry) => entry.id === id) ?? demoVocabulary[0]

  if (shouldUseRemoteData && vocabularyQuery.isLoading) {
    return <Card className="font-black">{t('vocabulary.loading')}</Card>
  }

  if (vocabularyQuery.error) {
    return <Card className="font-black text-danger">{vocabularyQuery.error.message}</Card>
  }

  if (!item) {
    return (
      <Card className="text-center">
        <p className="text-xl font-black">{t('vocabulary.emptyTitle')}</p>
        <p className="mt-2 text-sm font-semibold text-muted-foreground">{t('vocabulary.emptyDescription')}</p>
        <Button asChild className="mt-4"><Link to="/app/vocabulary">{t('actions.cancel')}</Link></Button>
      </Card>
    )
  }

  return (
    <>
      <PageHeader title={t('vocabulary.editTitle')} description={t('vocabulary.editDescription')} />
      <Card>
        <form className="grid gap-4 md:grid-cols-2">
          <div><Label>{t('vocabulary.sourceText')}</Label><Input defaultValue={item.source_text} /></div>
          <div><Label>{t('vocabulary.status')}</Label><Select defaultValue={item.status}>{Object.entries(statusLabelKeys).map(([value, labelKey]) => <option key={value} value={value}>{t(labelKey)}</option>)}</Select></div>
          <div><Label>{t('vocabulary.ipa')}</Label><Input defaultValue={item.ipa ?? ''} /></div>
          <div><Label>{t('vocabulary.partOfSpeech')}</Label><Input defaultValue={item.part_of_speech ?? ''} /></div>
          <div className="md:col-span-2"><Label>{t('vocabulary.meaning')}</Label><Textarea defaultValue={item.meanings[0]?.text ?? ''} /></div>
          <div className="md:col-span-2"><Label>{t('vocabulary.translation')}</Label><Textarea defaultValue={item.translation ?? ''} /></div>
          <div className="md:col-span-2"><Label>{t('vocabulary.example')}</Label><Textarea defaultValue={item.examples[0]?.sentence ?? ''} /></div>
          <div className="md:col-span-2"><Label>{t('vocabulary.note')}</Label><Textarea defaultValue={item.note ?? ''} /></div>
          <div className="flex gap-2 md:col-span-2">
            <Button asChild><Link to={`/app/vocabulary/${item.id}`}>{t('actions.saveChanges')}</Link></Button>
            <Button asChild variant="ghost"><Link to="/app/vocabulary">{t('actions.cancel')}</Link></Button>
          </div>
        </form>
      </Card>
    </>
  )
}
