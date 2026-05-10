import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { demoDecks, demoVocabulary } from '@/features/demo/demoData'
import { useI18n } from '@/i18n'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { deckService } from '@/services/supabase/deck.service'
import { useAuthStore } from '@/stores/useAuthStore'

export function DeckDetailPage() {
  const { id } = useParams()
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)
  const deckQuery = useQuery({
    queryKey: ['deck', id],
    queryFn: () => deckService.get(id!),
    enabled: shouldUseRemoteData && Boolean(id),
  })
  const termsQuery = useQuery({
    queryKey: ['deck-terms', id],
    queryFn: () => deckService.listTerms(id!),
    enabled: shouldUseRemoteData && Boolean(id),
  })
  const deck = shouldUseRemoteData ? deckQuery.data : demoDecks.find((item) => item.id === id) ?? demoDecks[0]
  const vocabulary = shouldUseRemoteData ? termsQuery.data ?? [] : demoVocabulary

  if (shouldUseRemoteData && (deckQuery.isLoading || termsQuery.isLoading)) {
    return <Card className="font-black">{t('decks.loading')}</Card>
  }

  const error =
    deckQuery.error instanceof Error ? deckQuery.error.message :
    termsQuery.error instanceof Error ? termsQuery.error.message :
    null

  if (error) {
    return <Card className="font-black text-danger">{error}</Card>
  }

  if (!deck) {
    return (
      <Card className="text-center">
        <p className="text-xl font-black">{t('decks.emptyTitle')}</p>
        <p className="mt-2 text-sm font-semibold text-muted-foreground">{t('decks.emptyDescription')}</p>
      </Card>
    )
  }

  return (
    <>
      <PageHeader title={deck.name} description={deck.description ?? t('decks.fallbackDescription')} actions={<Button asChild><Link to="/app/study">{t('decks.startFlashcard')}</Link></Button>} />
      <div className="mb-4 flex gap-2"><Badge>{t('decks.languagePair', { source: deck.source_language, native: deck.native_language })}</Badge><Badge>{t('decks.terms', { count: deck.term_count ?? 0 })}</Badge></div>
      <div className="grid gap-3">
        {vocabulary.length === 0 ? <Card className="font-black text-muted-foreground">{t('vocabulary.emptyTitle')}</Card> : null}
        {vocabulary.map((item) => (
          <Card key={item.id} className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <p className="text-xl font-black">{item.source_text}</p>
              <p className="font-semibold text-muted-foreground">{item.meanings[0]?.text}</p>
            </div>
            <Button asChild variant="ghost"><Link to={`/app/vocabulary/${item.id}`}>{t('decks.view')}</Link></Button>
          </Card>
        ))}
      </div>
    </>
  )
}
