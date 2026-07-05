import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Eye, EyeOff, FolderOpen, Pencil } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge } from '@/components/ui/badge'
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
import type { Deck } from '@/types/deck.types'

function DeckCard({ deck, children, isChild, shouldUseRemoteData, profile, attemptCounts, editingId, setEditingId, editName, setEditName, updateMutation, setPendingDeleteId, setSelectedDeckId, setQuizDeckId, navigate, queryClient, user, toggleVisibility, t }: {
  deck: Deck
  children?: Deck[]
  isChild?: boolean
  shouldUseRemoteData: boolean
  profile: { is_admin?: boolean } | null
  attemptCounts: Record<string, number>
  editingId: string | null
  setEditingId: (id: string | null) => void
  editName: string
  setEditName: (name: string) => void
  updateMutation: any
  setPendingDeleteId: (id: string | null) => void
  setSelectedDeckId: (id: string) => void
  setQuizDeckId: (id: string) => void
  navigate: (path: string) => void
  queryClient: any
  user: { id: string } | null
  toggleVisibility: (deck: Deck) => void
  t: (key: string, params?: Record<string, string | number>) => string
}) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = children && children.length > 0
  const isAdmin = Boolean(profile?.is_admin)
  const isOwner = user && deck.user_id === user.id
  const childCount = children?.length ?? 0

  return (
    <>
      <Card className={isChild ? 'ml-6 border-l-4 border-l-secondary/50' : ''}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
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
              <div className="flex items-center gap-1.5 flex-wrap">
                {hasChildren && (
                  <button
                    type="button"
                    onClick={() => setExpanded(!expanded)}
                    className="inline-flex h-6 w-6 items-center justify-center rounded border-2 border-border bg-muted shadow-[1px_1px_0_var(--border)] hover:bg-slate-200 transition-colors"
                  >
                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                )}
                {hasChildren && <FolderOpen size={16} className="text-amber-500" />}
                <CardTitle>{deck.name}</CardTitle>
                <Badge className={deck.visibility === 'public' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-muted text-muted-foreground font-bold'}>
                  {deck.visibility === 'public' ? t('decks.public') : t('decks.private')}
                </Badge>
                {hasChildren && (
                  <Badge className="bg-amber-100 text-amber-800 font-bold">{t('decks.childDecks', { count: childCount })}</Badge>
                )}
                {shouldUseRemoteData && isOwner ? (
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
        <p className="mt-4 text-3xl font-black">{hasChildren ? t('decks.childDecks', { count: childCount }) : t('decks.words', { count: deck.term_count ?? 0 })}</p>
        {shouldUseRemoteData && !hasChildren ? (
          <p className="mt-1 text-sm font-bold text-muted-foreground">{t('decks.quizAttempts', { count: attemptCounts[deck.id] ?? 0 })}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {hasChildren ? (
            <Button variant="primary" onClick={() => setExpanded(!expanded)}>
              {expanded ? t('decks.collapse') : t('decks.expand')}
            </Button>
          ) : (
            <>
              <Button asChild><Link to={`/app/decks/${deck.id}`}>{t('decks.open')}</Link></Button>
              <Button asChild variant="secondary"><Link to="/app/study" onClick={() => setSelectedDeckId(deck.id)}>{t('decks.study')}</Link></Button>
              <Button asChild variant="secondary"><Link to="/app/quiz" onClick={() => setQuizDeckId(deck.id)}>{t('decks.quiz')}</Link></Button>
            </>
          )}
          {shouldUseRemoteData && isAdmin && isOwner ? (
            <Button
              variant="ghost"
              onClick={() => toggleVisibility(deck)}
              title={deck.visibility === 'public' ? t('decks.makePrivate') : t('decks.makePublic')}
            >
              {deck.visibility === 'public' ? <EyeOff size={14} className="mr-1" /> : <Eye size={14} className="mr-1" />}
              {deck.visibility === 'public' ? t('decks.makePrivate') : t('decks.makePublic')}
            </Button>
          ) : null}
          {shouldUseRemoteData && isOwner ? <Button variant="ghost" onClick={() => setPendingDeleteId(deck.id)}>{t('vocabulary.delete')}</Button> : null}
        </div>
      </Card>
      {hasChildren && expanded && (
        <div className="flex flex-col gap-4 mt-2">
          {children!.map((child) => (
            <DeckCard
              key={child.id}
              deck={child}
              isChild
              shouldUseRemoteData={shouldUseRemoteData}
              profile={profile}
              attemptCounts={attemptCounts}
              editingId={editingId}
              setEditingId={setEditingId}
              editName={editName}
              setEditName={setEditName}
              updateMutation={updateMutation}
              setPendingDeleteId={setPendingDeleteId}
              setSelectedDeckId={setSelectedDeckId}
              setQuizDeckId={setQuizDeckId}
              navigate={navigate}
              queryClient={queryClient}
              user={user}
              toggleVisibility={toggleVisibility}
              t={t}
            />
          ))}
        </div>
      )}
    </>
  )
}

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
  const allDecks = shouldUseRemoteData ? decksQuery.data ?? [] : demoDecks
  const attemptCountsQuery = useQuery({
    queryKey: ['quiz-attempt-counts', user?.id],
    queryFn: () => quizService.getAttemptCounts(user!.id),
    enabled: shouldUseRemoteData,
  })
  const attemptCounts = attemptCountsQuery.data ?? {}

  const { parents, standalone } = useMemo(() => {
    const parents: Deck[] = []
    const childMap = new Map<string, Deck[]>()
    const standalone: Deck[] = []

    for (const deck of allDecks) {
      if (deck.parent_id) {
        const siblings = childMap.get(deck.parent_id) || []
        siblings.push(deck)
        childMap.set(deck.parent_id, siblings)
      } else {
        const children = allDecks.filter((d) => d.parent_id === deck.id)
        if (children.length > 0) {
          parents.push({ ...deck, children })
        } else {
          standalone.push(deck)
        }
      }
    }

    return { parents, standalone }
  }, [allDecks])

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
  const toggleVisibilityMutation = useMutation({
    mutationFn: async (deck: Deck) => {
      const newVisibility = deck.visibility === 'public' ? 'private' : 'public'
      return deckService.update(deck.id, { visibility: newVisibility, user_id: user!.id })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['decks', user?.id] })
    },
  })

  const toggleVisibility = (deck: Deck) => toggleVisibilityMutation.mutate(deck)
  const canCreate = shouldUseRemoteData && !createMutation.isPending

  return (
    <>
      <PageHeader title={t('decks.title')} description={t('decks.description')} actions={<Button disabled={!canCreate} onClick={() => createMutation.mutate()}>{createMutation.isPending ? t('actions.saving') : t('decks.create')}</Button>} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {decksQuery.isLoading ? <Card className="font-black">{t('decks.loading')}</Card> : null}
        {decksQuery.error ? <Card className="font-black text-danger">{decksQuery.error.message}</Card> : null}
        {!decksQuery.isLoading && allDecks.length === 0 ? (
          <Card className="md:col-span-2 xl:col-span-3">
            <CardTitle>{t('decks.emptyTitle')}</CardTitle>
            <CardDescription className="mt-2">{t('decks.emptyDescription')}</CardDescription>
          </Card>
        ) : null}

        {parents.map((deck) => (
          <DeckCard
            key={deck.id}
            deck={deck}
            children={deck.children}
            shouldUseRemoteData={shouldUseRemoteData}
            profile={profile}
            attemptCounts={attemptCounts}
            editingId={editingId}
            setEditingId={setEditingId}
            editName={editName}
            setEditName={setEditName}
            updateMutation={updateMutation}
            setPendingDeleteId={setPendingDeleteId}
            setSelectedDeckId={setSelectedDeckId}
            setQuizDeckId={setQuizDeckId}
            navigate={navigate}
            queryClient={queryClient}
            user={user}
            toggleVisibility={toggleVisibility}
            t={t}
          />
        ))}

        {standalone.map((deck) => (
          <DeckCard
            key={deck.id}
            deck={deck}
            shouldUseRemoteData={shouldUseRemoteData}
            profile={profile}
            attemptCounts={attemptCounts}
            editingId={editingId}
            setEditingId={setEditingId}
            editName={editName}
            setEditName={setEditName}
            updateMutation={updateMutation}
            setPendingDeleteId={setPendingDeleteId}
            setSelectedDeckId={setSelectedDeckId}
            setQuizDeckId={setQuizDeckId}
            navigate={navigate}
            queryClient={queryClient}
            user={user}
            toggleVisibility={toggleVisibility}
            t={t}
          />
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
