import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { StatTile } from '@/components/common/StatTile'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { demoVocabulary } from '@/features/demo/demoData'
import { useI18n } from '@/i18n'
import type { VocabularyItemType, VocabularyStatus } from '@/types/vocabulary.types'
import { speak } from '@/utils/audio'

const itemTypeLabelKeys: Record<VocabularyItemType, string> = {
  word: 'vocabulary.word',
  phrase: 'vocabulary.phrase',
  idiom: 'vocabulary.idiom',
  sentence: 'vocabulary.sentence',
}

const statusLabelKeys: Record<VocabularyStatus, string> = {
  new: 'vocabulary.statusNew',
  learning: 'vocabulary.statusLearning',
  familiar: 'vocabulary.statusFamiliar',
  memorized: 'vocabulary.statusMemorized',
  difficult: 'vocabulary.statusDifficult',
  need_review: 'vocabulary.statusNeedReview',
}

export function VocabularyDetailPage() {
  const { id } = useParams()
  const { t } = useI18n()
  const item = demoVocabulary.find((entry) => entry.id === id) ?? demoVocabulary[0]

  return (
    <>
      <PageHeader title={item.source_text} description={item.meanings[0]?.text ?? t('vocabulary.detailFallback')} actions={<Button asChild><Link to={`/app/vocabulary/${item.id}/edit`}>{t('vocabulary.edit')}</Link></Button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge>{t(itemTypeLabelKeys[item.item_type])}</Badge><Badge>{t(statusLabelKeys[item.status])}</Badge>{item.part_of_speech ? <Badge>{item.part_of_speech}</Badge> : null}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <Card>
          <p className="font-mono text-xl font-black">{item.ipa}</p>
          <Button className="mt-4" onClick={() => speak(item.source_text)}>{t('actions.playAudio')}</Button>
          <CardTitle className="mt-6">{t('vocabulary.examples')}</CardTitle>
          {item.examples.map((example) => <p key={example.sentence} className="mt-2 font-semibold">{example.sentence}<br /><span className="text-muted-foreground">{example.translation}</span></p>)}
          <CardTitle className="mt-6">{t('vocabulary.notes')}</CardTitle>
          <p className="mt-2 font-semibold text-muted-foreground">{item.note ?? t('vocabulary.noNotes')}</p>
        </Card>
        <div className="grid gap-4">
          <StatTile label={t('vocabulary.views')} value={item.view_count} />
          <StatTile label={t('vocabulary.correct')} value={item.correct_count} />
          <StatTile label={t('vocabulary.wrong')} value={item.wrong_count} />
          <StatTile label={t('vocabulary.nextReview')} value={item.next_review_at ? new Date(item.next_review_at).toLocaleDateString() : t('vocabulary.unscheduled')} />
        </div>
      </div>
    </>
  )
}
