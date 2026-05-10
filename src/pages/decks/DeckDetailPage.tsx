import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { demoDecks, demoVocabulary } from '@/features/demo/demoData'
import { useI18n } from '@/i18n'

export function DeckDetailPage() {
  const { id } = useParams()
  const { t } = useI18n()
  const deck = demoDecks.find((item) => item.id === id) ?? demoDecks[0]

  return (
    <>
      <PageHeader title={deck.name} description={deck.description ?? t('decks.fallbackDescription')} actions={<Button asChild><Link to="/app/study">{t('decks.startFlashcard')}</Link></Button>} />
      <div className="mb-4 flex gap-2"><Badge>{t('decks.languagePair', { source: deck.source_language, native: deck.native_language })}</Badge><Badge>{t('decks.terms', { count: deck.term_count ?? 0 })}</Badge></div>
      <div className="grid gap-3">
        {demoVocabulary.map((item) => (
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
