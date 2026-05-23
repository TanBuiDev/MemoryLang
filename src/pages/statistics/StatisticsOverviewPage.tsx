import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/common/PageHeader'
import { StatTile } from '@/components/common/StatTile'
import { Card, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { demoDecks, demoVocabulary } from '@/features/demo/demoData'
import { useI18n } from '@/i18n'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { deckService } from '@/services/supabase/deck.service'
import { statisticsService } from '@/services/supabase/statistics.service'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { filterActiveVocabulary } from '@/utils/vocabulary'

export function StatisticsOverviewPage() {
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)
  const statsQuery = useQuery({
    queryKey: ['statistics', user?.id],
    queryFn: () => statisticsService.getDashboardStats(user!.id),
    enabled: shouldUseRemoteData,
  })
  const decksQuery = useQuery({
    queryKey: ['decks', user?.id],
    queryFn: () => deckService.list(user!.id),
    enabled: shouldUseRemoteData,
  })
  const vocabularyQuery = useQuery({
    queryKey: ['vocabulary', user?.id],
    queryFn: () => vocabularyService.list(user!.id),
    enabled: shouldUseRemoteData,
  })
  const demoCorrect = demoVocabulary.reduce((sum, item) => sum + item.correct_count, 0)
  const demoWrong = demoVocabulary.reduce((sum, item) => sum + item.wrong_count, 0)
  const demoAccuracy = demoCorrect + demoWrong ? Math.round((demoCorrect / (demoCorrect + demoWrong)) * 100) : 0
  const stats = shouldUseRemoteData
    ? statsQuery.data ?? { totalVocabulary: 0, averageAccuracy: 0, deckCount: 0 }
    : { totalVocabulary: demoVocabulary.length, averageAccuracy: demoAccuracy, deckCount: demoDecks.length }
  const decks = shouldUseRemoteData ? decksQuery.data ?? [] : demoDecks
  const vocabulary = filterActiveVocabulary(shouldUseRemoteData ? vocabularyQuery.data ?? [] : demoVocabulary)
  const isLoading = shouldUseRemoteData && (statsQuery.isLoading || decksQuery.isLoading || vocabularyQuery.isLoading)
  const error =
    statsQuery.error instanceof Error ? statsQuery.error.message :
    decksQuery.error instanceof Error ? decksQuery.error.message :
    vocabularyQuery.error instanceof Error ? vocabularyQuery.error.message :
    null

  return (
    <>
      <PageHeader title={t('statistics.title')} description={t('statistics.description')} />
      {isLoading ? <Card className="mb-4 font-black">{t('vocabulary.loading')}</Card> : null}
      {error ? <Card className="mb-4 font-black text-danger">{error}</Card> : null}
      <div className="grid gap-4 md:grid-cols-4">
        <StatTile label={t('statistics.totalWords')} value={stats.totalVocabulary} />
        <StatTile label={t('statistics.accuracy')} value={`${stats.averageAccuracy}%`} />
        <StatTile label={t('statistics.decks')} value={stats.deckCount} />
        <StatTile label={t('statistics.studyStreak')} value={t('statistics.days', { count: shouldUseRemoteData ? 0 : 3 })} />
      </div>
      <Card className="mt-6">
        <CardTitle>{t('statistics.progressByDeck')}</CardTitle>
        <div className="mt-4 grid gap-4">
          {!isLoading && decks.length === 0 ? (
            <p className="rounded-md border-2 border-border bg-muted p-3 text-sm font-black text-muted-foreground">{t('decks.emptyTitle')}</p>
          ) : null}
          {decks.map((deck, index) => (
            <div key={deck.id}>
              <div className="mb-2 flex justify-between text-sm font-black"><span>{deck.name}</span><span>{shouldUseRemoteData ? (vocabulary.length ? Math.round(((deck.term_count ?? 0) / vocabulary.length) * 100) : 0) : index === 0 ? 55 : 25}%</span></div>
              <Progress value={shouldUseRemoteData ? (vocabulary.length ? Math.round(((deck.term_count ?? 0) / vocabulary.length) * 100) : 0) : index === 0 ? 55 : 25} />
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}
