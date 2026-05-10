import { PageHeader } from '@/components/common/PageHeader'
import { StatTile } from '@/components/common/StatTile'
import { Card, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { demoDecks, demoVocabulary } from '@/features/demo/demoData'
import { useI18n } from '@/i18n'

export function StatisticsOverviewPage() {
  const { t } = useI18n()
  const correct = demoVocabulary.reduce((sum, item) => sum + item.correct_count, 0)
  const wrong = demoVocabulary.reduce((sum, item) => sum + item.wrong_count, 0)
  const accuracy = correct + wrong ? Math.round((correct / (correct + wrong)) * 100) : 0

  return (
    <>
      <PageHeader title={t('statistics.title')} description={t('statistics.description')} />
      <div className="grid gap-4 md:grid-cols-4">
        <StatTile label={t('statistics.totalWords')} value={demoVocabulary.length} />
        <StatTile label={t('statistics.accuracy')} value={`${accuracy}%`} />
        <StatTile label={t('statistics.decks')} value={demoDecks.length} />
        <StatTile label={t('statistics.studyStreak')} value={t('statistics.days', { count: 3 })} />
      </div>
      <Card className="mt-6">
        <CardTitle>{t('statistics.progressByDeck')}</CardTitle>
        <div className="mt-4 grid gap-4">
          {demoDecks.map((deck, index) => (
            <div key={deck.id}>
              <div className="mb-2 flex justify-between text-sm font-black"><span>{deck.name}</span><span>{index === 0 ? 55 : 25}%</span></div>
              <Progress value={index === 0 ? 55 : 25} />
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}
