import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { StatTile } from '@/components/common/StatTile'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { demoDecks, demoVocabulary } from '@/features/demo/demoData'
import { useI18n } from '@/i18n'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { deckService } from '@/services/supabase/deck.service'
import { statisticsService } from '@/services/supabase/statistics.service'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { filterActiveVocabulary } from '@/utils/vocabulary'
import { isStatsApiConfigured, statsApiService } from '@/services/stats/statsApi.service'
import { StatsInsightsWidget } from './StatsInsightsWidget'

export function DashboardPage() {
  const profile = useAuthStore((state) => state.profile)
  const user = useAuthStore((state) => state.user)
  const { t } = useI18n()
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)
  const vocabularyQuery = useQuery({
    queryKey: ['vocabulary', user?.id],
    queryFn: () => vocabularyService.list(user!.id),
    enabled: shouldUseRemoteData,
  })
  const decksQuery = useQuery({
    queryKey: ['decks', user?.id],
    queryFn: () => deckService.list(user!.id),
    enabled: shouldUseRemoteData,
  })
  const statsQuery = useQuery({
    queryKey: ['statistics', user?.id],
    queryFn: () => statisticsService.getDashboardStats(user!.id),
    enabled: shouldUseRemoteData,
  })
  const statsApiQuery = useQuery({
    queryKey: ['stats-api', 'dashboard-insights', user?.id],
    queryFn: () => statsApiService.getDashboardInsights(),
    enabled: shouldUseRemoteData && isStatsApiConfigured,
  })
  const vocabulary = useMemo(
    () => filterActiveVocabulary(shouldUseRemoteData ? vocabularyQuery.data ?? [] : demoVocabulary),
    [shouldUseRemoteData, vocabularyQuery.data],
  )
  const decks = useMemo(
    () => shouldUseRemoteData ? decksQuery.data ?? [] : demoDecks,
    [decksQuery.data, shouldUseRemoteData],
  )
  const total = vocabulary.length
  const reviewDue = vocabulary.filter((item) => item.next_review_at && new Date(item.next_review_at) <= new Date()).length
  const memorized = vocabulary.filter((item) => item.status === 'memorized').length
  const difficult = vocabulary.filter((item) => item.status === 'difficult').length
  const totalAnswers = vocabulary.reduce((sum, item) => sum + item.correct_count + item.wrong_count, 0)
  const totalCorrect = vocabulary.reduce((sum, item) => sum + item.correct_count, 0)
  const demoAccuracy = totalAnswers ? Math.round((totalCorrect / totalAnswers) * 100) : 0
  const stats = shouldUseRemoteData
    ? statsQuery.data ?? { totalVocabulary: total, averageAccuracy: 0, deckCount: decks.length, quizCount: 0 }
    : { totalVocabulary: total, averageAccuracy: demoAccuracy, deckCount: decks.length, quizCount: 0 }
  const wordsReviewedToday = vocabulary.filter((item) => {
    if (!item.last_reviewed_at) return false
    return new Date(item.last_reviewed_at).toDateString() === new Date().toDateString()
  }).length
  const dailyGoal = profile?.daily_goal ?? 10
  const dailyProgress = dailyGoal ? Math.min(100, Math.round((wordsReviewedToday / dailyGoal) * 100)) : 0
  const learning = vocabulary.filter((item) => item.status === 'learning' || item.status === 'familiar').length
  const newWords = vocabulary.filter((item) => item.status === 'new').length
  const hardList = [...vocabulary]
    .filter((item) => item.status === 'difficult' || item.wrong_count > 0)
    .sort((a, b) => b.wrong_count - a.wrong_count)
    .slice(0, 5)
  const isLoading = shouldUseRemoteData && (vocabularyQuery.isLoading || decksQuery.isLoading || statsQuery.isLoading)
  const error =
    vocabularyQuery.error instanceof Error ? vocabularyQuery.error.message :
    decksQuery.error instanceof Error ? decksQuery.error.message :
    statsQuery.error instanceof Error ? statsQuery.error.message :
    null

  return (
    <>
      <PageHeader
        eyebrow={t('dashboard.eyebrow')}
        title={`${t('dashboard.welcome')}${profile?.display_name ? `, ${profile.display_name}` : ''}`}
        description={t('dashboard.description')}
        actions={<Button asChild><Link to="/app/study">{t('actions.startStudy')}</Link></Button>}
      />
      {isLoading ? <Card className="mb-4 font-black">{t('vocabulary.loading')}</Card> : null}
      {error ? <Card className="mb-4 font-black text-danger">{error}</Card> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label={t('dashboard.totalVocabulary')} value={total} />
        <StatTile label={t('dashboard.reviewDue')} value={reviewDue} />
        <StatTile label={t('dashboard.memorized')} value={memorized} />
        <StatTile label={t('statistics.accuracy')} value={`${stats.averageAccuracy}%`} />
      </div>
      {shouldUseRemoteData && isStatsApiConfigured ? (
        <StatsInsightsWidget
          data={statsApiQuery.data}
          error={statsApiQuery.error}
          isLoading={statsApiQuery.isLoading}
        />
      ) : null}
      <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardTitle>{t('dashboard.dailyGoal')}</CardTitle>
          <CardDescription className="mt-2">{t('dashboard.dailyGoalProgress', { reviewed: wordsReviewedToday, goal: dailyGoal })}</CardDescription>
          <div className="mt-4"><Progress value={dailyProgress} /></div>
          <div className="mt-4 flex flex-wrap gap-2">
            {profile?.is_admin && (
              <Button asChild><Link to="/app/vocabulary/new">{t('actions.addNewWord')}</Link></Button>
            )}
            <Button asChild variant="secondary"><Link to="/app/review">{t('actions.reviewToday')}</Link></Button>
          </div>
        </Card>
        <Card>
          <CardTitle>{t('dashboard.learningHealth')}</CardTitle>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-md border-2 border-border bg-muted p-3">
              <p className="text-xs font-black uppercase text-muted-foreground">{t('dashboard.newWords')}</p>
              <p className="mt-1 text-2xl font-black">{newWords}</p>
            </div>
            <div className="rounded-md border-2 border-border bg-muted p-3">
              <p className="text-xs font-black uppercase text-muted-foreground">{t('dashboard.learningWords')}</p>
              <p className="mt-1 text-2xl font-black">{learning}</p>
            </div>
            <div className="rounded-md border-2 border-border bg-muted p-3">
              <p className="text-xs font-black uppercase text-muted-foreground">{t('dashboard.difficult')}</p>
              <p className="mt-1 text-2xl font-black">{difficult}</p>
            </div>
            <div className="rounded-md border-2 border-border bg-muted p-3">
              <p className="text-xs font-black uppercase text-muted-foreground">{t('statistics.decks')}</p>
              <p className="mt-1 text-2xl font-black">{stats.deckCount}</p>
            </div>
          </div>
        </Card>
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{t('statistics.progressByDeck')}</CardTitle>
            <Button asChild variant="ghost"><Link to="/app/decks">{t('nav.decks')}</Link></Button>
          </div>
          <div className="mt-4 grid gap-4">
            {!isLoading && decks.length === 0 ? (
              <p className="rounded-md border-2 border-border bg-muted p-3 text-sm font-black text-muted-foreground">{t('dashboard.noDecks')}</p>
            ) : null}
            {decks.slice(0, 5).map((deck) => {
              const progress = total ? Math.round(((deck.term_count ?? 0) / total) * 100) : 0
              return (
                <Link key={deck.id} to={`/app/decks/${deck.id}`} className="block rounded-md border-2 border-border bg-muted p-3">
                  <div className="mb-2 flex justify-between gap-3 text-sm font-black">
                    <span>{deck.name}</span>
                    <span className="text-muted-foreground">{t('dashboard.terms', { count: deck.term_count ?? 0 })}</span>
                  </div>
                  <Progress value={progress} />
                </Link>
              )
            })}
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{t('dashboard.needsAttention')}</CardTitle>
            <Button asChild variant="ghost"><Link to="/app/vocabulary">{t('nav.vocabulary')}</Link></Button>
          </div>
          <div className="mt-4 grid gap-3">
            {hardList.length === 0 ? (
              <p className="rounded-md border-2 border-border bg-muted p-3 text-sm font-black text-muted-foreground">{t('dashboard.noDifficultWords')}</p>
            ) : null}
            {hardList.map((item) => (
              <Link key={item.id} to={`/app/vocabulary/${item.id}`} className="flex items-center justify-between gap-3 rounded-md border-2 border-border bg-muted p-3 font-black">
                <span>{item.source_text}</span>
                <span className="text-sm text-muted-foreground">{t('dashboard.wrongCount', { count: item.wrong_count })}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}
