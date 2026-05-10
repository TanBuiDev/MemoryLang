import { useQuery } from '@tanstack/react-query'
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
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'

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
  const vocabulary = shouldUseRemoteData ? vocabularyQuery.data ?? [] : demoVocabulary
  const decks = shouldUseRemoteData ? decksQuery.data ?? [] : demoDecks
  const total = vocabulary.length
  const reviewDue = vocabulary.filter((item) => item.next_review_at && new Date(item.next_review_at) <= new Date()).length
  const memorized = vocabulary.filter((item) => item.status === 'memorized').length
  const difficult = vocabulary.filter((item) => item.status === 'difficult').length
  const wordsReviewedToday = vocabulary.filter((item) => {
    if (!item.last_reviewed_at) return false
    return new Date(item.last_reviewed_at).toDateString() === new Date().toDateString()
  }).length
  const dailyGoal = profile?.daily_goal ?? 10
  const dailyProgress = dailyGoal ? Math.min(100, Math.round((wordsReviewedToday / dailyGoal) * 100)) : 0

  return (
    <>
      <PageHeader
        eyebrow={t('dashboard.eyebrow')}
        title={`${t('dashboard.welcome')}${profile?.display_name ? `, ${profile.display_name}` : ''}`}
        description={t('dashboard.description')}
        actions={<Button asChild><Link to="/app/study">{t('actions.startStudy')}</Link></Button>}
      />
      <div className="grid gap-4 md:grid-cols-4">
        <StatTile label={t('dashboard.totalVocabulary')} value={total} />
        <StatTile label={t('dashboard.reviewDue')} value={reviewDue} />
        <StatTile label={t('dashboard.memorized')} value={memorized} />
        <StatTile label={t('dashboard.difficult')} value={difficult} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardTitle>{t('dashboard.dailyGoal')}</CardTitle>
          <CardDescription className="mt-2">{t('dashboard.dailyGoalProgress', { reviewed: wordsReviewedToday, goal: dailyGoal })}</CardDescription>
          <div className="mt-4"><Progress value={dailyProgress} /></div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild><Link to="/app/vocabulary/new">{t('actions.addNewWord')}</Link></Button>
            <Button asChild variant="secondary"><Link to="/app/review">{t('actions.reviewToday')}</Link></Button>
          </div>
        </Card>
        <Card>
          <CardTitle>{t('dashboard.recentDecks')}</CardTitle>
          <div className="mt-4 grid gap-3">
            {decks.length === 0 ? (
              <p className="rounded-md border-2 border-border bg-muted p-3 text-sm font-black text-muted-foreground">
                {t('dashboard.noDecks')}
              </p>
            ) : null}
            {decks.map((deck) => (
              <Link key={deck.id} to={`/app/decks/${deck.id}`} className="rounded-md border-2 border-border bg-muted p-3 font-black">
                {deck.name}<span className="ml-2 text-sm text-muted-foreground">{t('dashboard.terms', { count: deck.term_count ?? 0 })}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}
