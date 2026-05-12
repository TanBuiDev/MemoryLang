import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input, Label, Textarea } from '@/components/ui/input'
import { demoDecks } from '@/features/demo/demoData'
import { useI18n } from '@/i18n'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { deckService } from '@/services/supabase/deck.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useStudyStore } from '@/stores/useStudyStore'

export function DeckListPage() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)
  const setSelectedDeckId = useStudyStore((state) => state.setSelectedDeckId)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)
  const decksQuery = useQuery({
    queryKey: ['decks', user?.id],
    queryFn: () => deckService.list(user!.id),
    enabled: shouldUseRemoteData,
  })
  const decks = shouldUseRemoteData ? decksQuery.data ?? [] : demoDecks
  const createMutation = useMutation({
    mutationFn: () => deckService.create({
      user_id: user!.id,
      name: name.trim(),
      description: description.trim() || undefined,
      source_language: profile?.current_target_language ?? 'en',
      native_language: profile?.native_language ?? 'vi',
    }),
    onSuccess: async () => {
      setName('')
      setDescription('')
      setShowCreate(false)
      await queryClient.invalidateQueries({ queryKey: ['decks', user?.id] })
    },
  })
  const deleteMutation = useMutation({
    mutationFn: (deckId: string) => deckService.remove(deckId),
    onSuccess: async () => {
      setPendingDeleteId(null)
      await queryClient.invalidateQueries({ queryKey: ['decks', user?.id] })
    },
  })
  const canCreate = shouldUseRemoteData && name.trim().length > 0

  return (
    <>
      <PageHeader title={t('decks.title')} description={t('decks.description')} actions={<Button onClick={() => setShowCreate((value) => !value)}>{t('decks.create')}</Button>} />
      {showCreate ? (
        <Card className="mb-4 max-w-2xl">
          <CardTitle>{t('decks.createTitle')}</CardTitle>
          <div className="mt-4 grid gap-3">
            <div>
              <Label>{t('decks.name')}</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t('decks.namePlaceholder')} />
            </div>
            <div>
              <Label>{t('decks.descriptionLabel')}</Label>
              <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t('decks.descriptionPlaceholder')} />
            </div>
            {createMutation.error instanceof Error ? <p className="text-sm font-black text-danger">{createMutation.error.message}</p> : null}
            {!shouldUseRemoteData ? <p className="text-sm font-black text-muted-foreground">{t('decks.demoCreateDisabled')}</p> : null}
            <div className="flex gap-2">
              <Button disabled={!canCreate || createMutation.isPending} onClick={() => createMutation.mutate()}>{createMutation.isPending ? t('actions.saving') : t('decks.create')}</Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>{t('actions.cancel')}</Button>
            </div>
          </div>
        </Card>
      ) : null}
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
              <Button asChild variant="secondary"><Link to="/app/study" onClick={() => setSelectedDeckId(deck.id)}>{t('decks.study')}</Link></Button>
              {shouldUseRemoteData ? <Button variant="ghost" onClick={() => setPendingDeleteId(deck.id)}>{t('vocabulary.delete')}</Button> : null}
            </div>
          </Card>
        ))}
      </div>
      <ConfirmModal
        open={Boolean(pendingDeleteId)}
        title={t('decks.deleteConfirm')}
        description={t('decks.deleteDescription')}
        confirmLabel={t('vocabulary.delete')}
        cancelLabel={t('actions.cancel')}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => pendingDeleteId ? deleteMutation.mutate(pendingDeleteId) : undefined}
      />
    </>
  )
}
