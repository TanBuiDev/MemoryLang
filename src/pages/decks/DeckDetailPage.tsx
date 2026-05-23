import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Label, Select } from '@/components/ui/input'
import { demoDecks, demoVocabulary } from '@/features/demo/demoData'
import { useI18n } from '@/i18n'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { deckService } from '@/services/supabase/deck.service'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useStudyStore } from '@/stores/useStudyStore'
import { filterActiveVocabulary } from '@/utils/vocabulary'

export function DeckDetailPage() {
  const { id } = useParams()
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const setSelectedDeckId = useStudyStore((state) => state.setSelectedDeckId)
  const [selectedTermId, setSelectedTermId] = useState('')
  const [pendingRemoveTermId, setPendingRemoveTermId] = useState<string | null>(null)
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
  const allVocabularyQuery = useQuery({
    queryKey: ['vocabulary', user?.id],
    queryFn: () => vocabularyService.list(user!.id),
    enabled: shouldUseRemoteData && Boolean(user),
  })
  const deck = shouldUseRemoteData ? deckQuery.data : demoDecks.find((item) => item.id === id) ?? demoDecks[0]
  const vocabulary = useMemo(
    () => shouldUseRemoteData ? termsQuery.data ?? [] : demoVocabulary,
    [shouldUseRemoteData, termsQuery.data],
  )
  const availableVocabulary = useMemo(() => {
    const deckTermIds = new Set(vocabulary.map((item) => item.id))
    return filterActiveVocabulary(allVocabularyQuery.data ?? []).filter((item) => !deckTermIds.has(item.id))
  }, [allVocabularyQuery.data, vocabulary])
  const addTermMutation = useMutation({
    mutationFn: () => deckService.addTerm(id!, selectedTermId),
    onSuccess: async () => {
      setSelectedTermId('')
      await queryClient.invalidateQueries({ queryKey: ['deck-terms', id] })
      await queryClient.invalidateQueries({ queryKey: ['decks', user?.id] })
    },
  })
  const removeTermMutation = useMutation({
    mutationFn: (termId: string) => deckService.removeTerm(id!, termId),
    onSuccess: async () => {
      setPendingRemoveTermId(null)
      await queryClient.invalidateQueries({ queryKey: ['deck-terms', id] })
      await queryClient.invalidateQueries({ queryKey: ['decks', user?.id] })
    },
  })

  if (shouldUseRemoteData && (deckQuery.isLoading || termsQuery.isLoading || allVocabularyQuery.isLoading)) {
    return <Card className="font-black">{t('decks.loading')}</Card>
  }

  const error =
    deckQuery.error instanceof Error ? deckQuery.error.message :
    termsQuery.error instanceof Error ? termsQuery.error.message :
    allVocabularyQuery.error instanceof Error ? allVocabularyQuery.error.message :
    addTermMutation.error instanceof Error ? addTermMutation.error.message :
    removeTermMutation.error instanceof Error ? removeTermMutation.error.message :
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
      <PageHeader title={deck.name} description={deck.description ?? t('decks.fallbackDescription')} actions={<Button asChild><Link to="/app/study" onClick={() => setSelectedDeckId(deck.id)}>{t('decks.startFlashcard')}</Link></Button>} />
      <div className="mb-4 flex gap-2"><Badge>{t('decks.languagePair', { source: deck.source_language, native: deck.native_language })}</Badge><Badge>{t('decks.terms', { count: deck.term_count ?? 0 })}</Badge></div>
      {shouldUseRemoteData ? (
        <Card className="mb-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <Label>{t('decks.addTerm')}</Label>
              <Select value={selectedTermId} onChange={(event) => setSelectedTermId(event.target.value)}>
                <option value="">{availableVocabulary.length === 0 ? t('decks.noAvailableTerms') : t('decks.chooseTerm')}</option>
                {availableVocabulary.map((item) => <option key={item.id} value={item.id}>{item.source_text}</option>)}
              </Select>
            </div>
            <Button disabled={!selectedTermId || addTermMutation.isPending} onClick={() => addTermMutation.mutate()}>{t('decks.addTerm')}</Button>
          </div>
        </Card>
      ) : null}
      <div className="grid gap-3">
        {vocabulary.length === 0 ? <Card className="font-black text-muted-foreground">{t('vocabulary.emptyTitle')}</Card> : null}
        {vocabulary.map((item) => (
          <Card key={item.id} className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <p className="text-xl font-black">{item.source_text}</p>
              <p className="font-semibold text-muted-foreground">{item.meanings[0]?.text}</p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="ghost"><Link to={`/app/vocabulary/${item.id}`}>{t('decks.view')}</Link></Button>
              {shouldUseRemoteData ? <Button variant="secondary" onClick={() => setPendingRemoveTermId(item.id)}>{t('decks.removeFromDeck')}</Button> : null}
            </div>
          </Card>
        ))}
      </div>
      <ConfirmModal
        open={Boolean(pendingRemoveTermId)}
        title={t('decks.removeTermConfirm')}
        confirmLabel={t('decks.removeFromDeck')}
        cancelLabel={t('actions.cancel')}
        onCancel={() => setPendingRemoveTermId(null)}
        onConfirm={() => pendingRemoveTermId ? removeTermMutation.mutate(pendingRemoveTermId) : undefined}
      />
    </>
  )
}
