import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Label, Select, Textarea } from '@/components/ui/input'
import { demoVocabulary } from '@/features/demo/demoData'
import { useI18n } from '@/i18n'
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
  const item = demoVocabulary.find((entry) => entry.id === id) ?? demoVocabulary[0]

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
          <div className="md:col-span-2"><Label>{t('vocabulary.example')}</Label><Textarea defaultValue={item.examples[0]?.sentence ?? ''} /></div>
          <div className="md:col-span-2"><Label>{t('vocabulary.translation')}</Label><Textarea defaultValue={item.examples[0]?.translation ?? ''} /></div>
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
