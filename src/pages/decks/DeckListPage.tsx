import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input } from '@/components/ui/input'
import { demoDecks } from '@/features/demo/demoData'
import { useI18n } from '@/i18n'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { deckService } from '@/services/supabase/deck.service'
import { quizService } from '@/services/supabase/quiz.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useStudyStore } from '@/stores/useStudyStore'
import { useQuizStore } from '@/stores/useQuizStore'

export function DeckListPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)
  const setSelectedDeckId = useStudyStore((state) => state.setSelectedDeckId)
  const setQuizDeckId = useQuizStore((state) => state.setSelectedDeckId)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)
  const decksQuery = useQuery({
    queryKey: ['decks', user?.id],
    queryFn: () => deckService.list(user!.id),
    enabled: shouldUseRemoteData,
  })
  const decks = shouldUseRemoteData ? decksQuery.data ?? [] : demoDecks
  const attemptCountsQuery = useQuery({
    queryKey: ['quiz-attempt-counts', user?.id],
    queryFn: () => quizService.getAttemptCounts(user!.id),
    enabled: shouldUseRemoteData,
  })
  const attemptCounts = attemptCountsQuery.data ?? {}
  const createMutation = useMutation({
    mutationFn: async () => {
      const deck = await deckService.create({
        user_id: user!.id,
        name: t('decks.createTitle'),
        source_language: profile?.current_target_language ?? 'en',
        native_language: profile?.native_language ?? 'vi',
      })
      return deck
    },
    onSuccess: async (deck) => {
      await queryClient.invalidateQueries({ queryKey: ['decks', user?.id] })
      navigate(`/app/decks/${deck.id}`)
    },
  })
  const deleteMutation = useMutation({
    mutationFn: (deckId: string) => deckService.remove(deckId),
    onSuccess: async () => {
      setPendingDeleteId(null)
      await queryClient.invalidateQueries({ queryKey: ['decks', user?.id] })
    },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, name: newName }: { id: string; name: string }) => deckService.update(id, { name: newName, user_id: user!.id }),
    onSuccess: async () => {
      setEditingId(null)
      await queryClient.invalidateQueries({ queryKey: ['decks', user?.id] })
    },
  })
  const canCreate = shouldUseRemoteData && !createMutation.isPending

  return (
    <>
      <PageHeader title={t('decks.title')} description={t('decks.description')} actions={<Button disabled={!canCreate} onClick={() => createMutation.mutate()}>{createMutation.isPending ? t('actions.saving') : t('decks.create')}</Button>} />
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
                {editingId === deck.id ? (
                  <div className="flex gap-2 items-center">
                    <Input
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      className="min-w-[200px]"
                      autoFocus
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') updateMutation.mutate({ id: deck.id, name: editName.trim() })
                        if (event.key === 'Escape') setEditingId(null)
                      }}
                    />
                    <Button variant="primary" className="text-xs" disabled={!editName.trim() || updateMutation.isPending} onClick={() => updateMutation.mutate({ id: deck.id, name: editName.trim() })}>{t('decks.saveEdit')}</Button>
                    <Button variant="ghost" className="text-xs" onClick={() => setEditingId(null)}>{t('decks.cancelEdit')}</Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <CardTitle>{deck.name}</CardTitle>
                    {shouldUseRemoteData ? (
                      <button
                        type="button"
                        title={t('decks.edit')}
                        className="inline-flex h-6 w-6 items-center justify-center rounded border-2 border-border bg-secondary text-secondary-foreground opacity-60 shadow-[1px_1px_0_var(--border)] hover:opacity-100"
                        onClick={() => { setEditingId(deck.id); setEditName(deck.name) }}
                      >
                        <Pencil size={12} />
                      </button>
                    ) : null}
                  </div>
                )}
                <CardDescription className="mt-2">{deck.description}</CardDescription>
              </div>
            </div>
            <p className="mt-4 text-3xl font-black">{t('decks.words', { count: deck.term_count ?? 0 })}</p>
            {shouldUseRemoteData ? (
              <p className="mt-1 text-sm font-bold text-muted-foreground">{t('decks.quizAttempts', { count: attemptCounts[deck.id] ?? 0 })}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild><Link to={`/app/decks/${deck.id}`}>{t('decks.open')}</Link></Button>
              <Button asChild variant="secondary"><Link to="/app/study" onClick={() => setSelectedDeckId(deck.id)}>{t('decks.study')}</Link></Button>
              <Button asChild variant="secondary"><Link to="/app/quiz" onClick={() => setQuizDeckId(deck.id)}>{t('decks.quiz')}</Link></Button>
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
