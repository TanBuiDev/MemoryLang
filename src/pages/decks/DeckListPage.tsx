import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { demoDecks } from '@/features/demo/demoData'
import { useI18n } from '@/i18n'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { deckService } from '@/services/supabase/deck.service'
import { useAuthStore } from '@/stores/useAuthStore'

export function DeckListPage() {
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)
  const decksQuery = useQuery({
    queryKey: ['decks', user?.id],
    queryFn: () => deckService.list(user!.id),
    enabled: shouldUseRemoteData,
  })
  const decks = shouldUseRemoteData ? decksQuery.data ?? [] : demoDecks

  return (
    <>
      <PageHeader title={t('decks.title')} description={t('decks.description')} actions={<Button>{t('decks.create')}</Button>} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {decksQuery.isLoading ? <Card className="font-black">{t('decks.loading')}</Card> : null}
        {decksQuery.error ? <Card className="font-black text-danger">{decksQuery.error.message}</Card> : null}
        {!decksQuery.isLoading && decks.length === 0 ? (
          <Card className="md:col-span-2 xl:col-span-3">
            <CardTitle>{t('decks.emptyTitle')}</CardTitle>
            <CardDescription className="mt-2">{t('decks.emptyDescription')}</CardDescription>
          </Card>
        ) : null}
        {decks.map((deck) => (
          <Card key={deck.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>{deck.name}</CardTitle>
                <CardDescription className="mt-2">{deck.description}</CardDescription>
              </div>
              <Badge>{deck.source_language}/{deck.native_language}</Badge>
            </div>
            <p className="mt-4 text-3xl font-black">{t('decks.words', { count: deck.term_count ?? 0 })}</p>
            <div className="mt-4 flex gap-2">
              <Button asChild><Link to={`/app/decks/${deck.id}`}>{t('decks.open')}</Link></Button>
              <Button asChild variant="secondary"><Link to="/app/study">{t('decks.study')}</Link></Button>
            </div>
          </Card>
        ))}
      </div>
    </>
  )
}
