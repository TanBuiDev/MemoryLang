import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FolderOpen, Pencil, Trash2, Plus, ChevronLeft } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input, Label, Select } from '@/components/ui/input'
import { demoDecks, demoVocabulary } from '@/features/demo/demoData'
import { useI18n } from '@/i18n'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { deckService } from '@/services/supabase/deck.service'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useStudyStore } from '@/stores/useStudyStore'
import { useQuizStore } from '@/stores/useQuizStore'
import { filterActiveVocabulary } from '@/utils/vocabulary'

export function DeckDetailPage() {
  const { id } = useParams()
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const setSelectedDeckId = useStudyStore((state) => state.setSelectedDeckId)
  const setQuizDeckId = useQuizStore((state) => state.setSelectedDeckId)
  const [selectedTermId, setSelectedTermId] = useState('')
  const [pendingRemoveTermId, setPendingRemoveTermId] = useState<string | null>(null)
  const [editingDeck, setEditingDeck] = useState(false)
  const [editName, setEditName] = useState('')
  const [isCreatingChild, setIsCreatingChild] = useState(false)
  const [newChildName, setNewChildName] = useState('')
  const [editingChildId, setEditingChildId] = useState<string | null>(null)
  const [editChildName, setEditChildName] = useState('')
  const [pendingDeleteChildId, setPendingDeleteChildId] = useState<string | null>(null)
  const [filterNoDeck, setFilterNoDeck] = useState(false)
  const [bulkSelectMode, setBulkSelectMode] = useState(false)
  const [selectedAvailableIds, setSelectedAvailableIds] = useState<Set<string>>(new Set())
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
  const deckedTermIdsQuery = useQuery({
    queryKey: ['decked-term-ids', user?.id],
    queryFn: () => deckService.getDeckedTermIds(user!.id),
    enabled: shouldUseRemoteData && Boolean(user) && filterNoDeck,
  })
  const childrenQuery = useQuery({
    queryKey: ['deck-children', id],
    queryFn: async () => {
      const all = await deckService.list(user!.id)
      return all.filter((d) => d.parent_id === id)
    },
    enabled: shouldUseRemoteData && Boolean(id),
  })
  const deck = shouldUseRemoteData ? deckQuery.data : demoDecks.find((item) => item.id === id) ?? demoDecks[0]
  const vocabulary = useMemo(
    () => shouldUseRemoteData ? termsQuery.data ?? [] : demoVocabulary,
    [shouldUseRemoteData, termsQuery.data],
  )
  const availableVocabulary = useMemo(() => {
    const deckTermIds = new Set(vocabulary.map((item) => item.id))
    let result = filterActiveVocabulary(allVocabularyQuery.data ?? []).filter((item) => !deckTermIds.has(item.id))
    if (filterNoDeck && deckedTermIdsQuery.data) {
      result = result.filter((item) => !deckedTermIdsQuery.data.has(item.id))
    }
    return result
  }, [allVocabularyQuery.data, vocabulary, filterNoDeck, deckedTermIdsQuery.data])
  const addTermMutation = useMutation({
    mutationFn: () => deckService.addTerm(id!, selectedTermId),
    onSuccess: async () => {
      setSelectedTermId('')
      await queryClient.invalidateQueries({ queryKey: ['deck-terms', id] })
      await queryClient.invalidateQueries({ queryKey: ['decks', user?.id] })
    },
  })
  const batchAddMutation = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selectedAvailableIds)
      await Promise.all(ids.map((termId) => deckService.addTerm(id!, termId)))
    },
    onSuccess: async () => {
      setSelectedAvailableIds(new Set())
      setBulkSelectMode(false)
      await queryClient.invalidateQueries({ queryKey: ['deck-terms', id] })
      await queryClient.invalidateQueries({ queryKey: ['decks', user?.id] })
    },
  })
  const updateDeckMutation = useMutation({
    mutationFn: () => deckService.update(id!, { name: editName.trim(), user_id: user!.id }),
    onSuccess: async () => {
      setEditingDeck(false)
      await queryClient.invalidateQueries({ queryKey: ['deck', id] })
      await queryClient.invalidateQueries({ queryKey: ['decks', user?.id] })
    },
  })

  const createChildMutation = useMutation({
    mutationFn: async (name: string) => {
      return deckService.create({
        user_id: user!.id,
        name: name,
        parent_id: id,
        source_language: deck!.source_language,
        native_language: deck!.native_language,
        visibility: deck!.visibility
      })
    },
    onSuccess: async () => {
      setIsCreatingChild(false)
      setNewChildName('')
      await queryClient.invalidateQueries({ queryKey: ['deck-children', id] })
      await queryClient.invalidateQueries({ queryKey: ['decks', user?.id] })
    }
  })

  const updateChildMutation = useMutation({
    mutationFn: async ({ childId, name }: { childId: string; name: string }) => {
      return deckService.update(childId, { name, user_id: user!.id })
    },
    onSuccess: async () => {
      setEditingChildId(null)
      setEditChildName('')
      await queryClient.invalidateQueries({ queryKey: ['deck-children', id] })
      await queryClient.invalidateQueries({ queryKey: ['decks', user?.id] })
    }
  })

  const deleteChildMutation = useMutation({
    mutationFn: (childId: string) => deckService.remove(childId),
    onSuccess: async () => {
      setPendingDeleteChildId(null)
      await queryClient.invalidateQueries({ queryKey: ['deck-children', id] })
      await queryClient.invalidateQueries({ queryKey: ['decks', user?.id] })
    }
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
    batchAddMutation.error instanceof Error ? batchAddMutation.error.message :
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

  const parentId = deck?.parent_id

  return (
    <>
      {parentId ? (
        <div className="mb-4">
          <Link 
            to={`/app/decks/${parentId}`} 
            className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground bg-[#1c293c]/5 hover:bg-[#1c293c]/10 px-2.5 py-1.5 rounded transition-all no-underline border-2 border-border shadow-[1px_1px_0_#1c293c]"
          >
            <ChevronLeft size={14} className="stroke-[2.5px]" />
            <span>{t('actions.back')}</span>
          </Link>
        </div>
      ) : null}
      <PageHeader 
        title={
          <div className="flex items-center gap-2 flex-wrap">
            <span>{deck.name}</span>
            {shouldUseRemoteData ? (
              <button 
                type="button" 
                title={t('decks.edit')}
                className="inline-flex h-7 w-7 items-center justify-center rounded border-2 border-border bg-secondary text-secondary-foreground opacity-60 shadow-[1px_1px_0_var(--border)] hover:opacity-100 transition-all active:translate-y-0.5 active:shadow-none"
                onClick={() => { setEditingDeck(true); setEditName(deck.name) }}
              >
                <Pencil size={14} />
              </button>
            ) : null}
          </div>
        } 
        description={undefined} 
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/app/study" onClick={() => setSelectedDeckId(deck.id)}>
                {t('decks.startFlashcard')}
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/app/quiz" onClick={() => setQuizDeckId(deck.id)}>
                {t('decks.quiz')}
              </Link>
            </Button>
          </div>
        } 
      />
      {editingDeck ? (
        <Card className="mb-4 max-w-2xl">
          <CardTitle>{t('decks.editTitle')}</CardTitle>
          <div className="mt-4 grid gap-3">
            <div>
              <Label>{t('decks.name')}</Label>
              <Input 
                value={editName} 
                onChange={(event) => setEditName(event.target.value)} 
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && editName.trim()) updateDeckMutation.mutate()
                  if (e.key === 'Escape') setEditingDeck(false)
                }}
              />
            </div>
            {updateDeckMutation.error instanceof Error ? <p className="text-sm font-black text-danger">{updateDeckMutation.error.message}</p> : null}
            <div className="flex gap-2">
              <Button disabled={!editName.trim() || updateDeckMutation.isPending} onClick={() => updateDeckMutation.mutate()}>{t('actions.saveChanges')}</Button>
              <Button variant="ghost" onClick={() => setEditingDeck(false)}>{t('actions.cancel')}</Button>
            </div>
          </div>
        </Card>
      ) : null}
      
      {!(childrenQuery.data && childrenQuery.data.length > 0) && (
        <div className="mb-4 flex gap-2">
          <Badge className="bg-primary/10 text-primary font-bold">
            {t('decks.words', { count: vocabulary.length })}
          </Badge>
        </div>
      )}

      {childrenQuery.data && (childrenQuery.data.length > 0 || !deck.parent_id) ? (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <FolderOpen size={18} className="text-amber-500" />
            <h2 className="text-lg font-black">{t('decks.childDecks', { count: childrenQuery.data.length })}</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {childrenQuery.data.map((child) => (
              <Card key={child.id}>
                <div className="flex items-start justify-between gap-3 w-full">
                  <div className="flex-1 min-w-0">
                    {editingChildId === child.id ? (
                      <div className="flex gap-2 items-center w-full">
                        <Input 
                          value={editChildName} 
                          onChange={(e) => setEditChildName(e.target.value)} 
                          className="min-w-[120px] flex-1 font-bold h-8 text-xs" 
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && editChildName.trim()) updateChildMutation.mutate({ childId: child.id, name: editChildName.trim() })
                            if (e.key === 'Escape') setEditingChildId(null)
                          }}
                        />
                        <button
                          type="button"
                          disabled={!editChildName.trim() || updateChildMutation.isPending}
                          onClick={() => updateChildMutation.mutate({ childId: child.id, name: editChildName.trim() })}
                          className="inline-flex h-8 items-center justify-center rounded border-2 border-border bg-primary text-primary-foreground font-black text-xs px-2.5 shadow-[1px_1px_0_var(--border)] hover:bg-[#ffe05c] transition-all active:translate-y-0.5 active:shadow-none disabled:opacity-50"
                        >
                          {t('actions.save')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingChildId(null)}
                          className="inline-flex h-8 items-center justify-center rounded border-2 border-border bg-card text-foreground font-black text-xs px-2.5 shadow-[1px_1px_0_var(--border)] hover:bg-muted transition-all active:translate-y-0.5 active:shadow-none"
                        >
                          {t('actions.cancel')}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2 w-full">
                        <Link to={`/app/decks/${child.id}`} className="hover:underline">
                          <CardTitle>{child.name}</CardTitle>
                        </Link>
                        {shouldUseRemoteData ? (
                          <div className="flex gap-1 shrink-0">
                            <button type="button" title={t('decks.edit')}
                              className="inline-flex h-6 w-6 items-center justify-center rounded border-2 border-border bg-secondary text-secondary-foreground opacity-60 shadow-[1px_1px_0_var(--border)] hover:opacity-100 transition-all active:translate-y-0.5 active:shadow-none"
                              onClick={() => { setEditingChildId(child.id); setEditChildName(child.name) }}
                            >
                              <Pencil size={11} />
                            </button>
                            <button type="button" title={t('vocabulary.delete')}
                              className="inline-flex h-6 w-6 items-center justify-center rounded border-2 border-border bg-danger text-white opacity-60 shadow-[1px_1px_0_var(--border)] hover:opacity-100 transition-all active:translate-y-0.5 active:shadow-none"
                              onClick={() => setPendingDeleteChildId(child.id)}
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-2xl font-bold">{t('decks.words', { count: child.term_count ?? 0 })}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild variant="secondary"><Link to={`/app/decks/${child.id}`}>{t('decks.open')}</Link></Button>
                  <Button asChild variant="secondary"><Link to="/app/study" onClick={() => setSelectedDeckId(child.id)}>{t('decks.study')}</Link></Button>
                  <Button asChild variant="secondary"><Link to="/app/quiz" onClick={() => setQuizDeckId(child.id)}>{t('decks.quiz')}</Link></Button>
                </div>
              </Card>
            ))}

            {/* Card Thêm bộ con mới */}
            {shouldUseRemoteData && (
              isCreatingChild ? (
                <Card className="border-dashed bg-card/50">
                  <CardTitle className="text-sm font-black text-muted-foreground mb-3">{t('decks.createChildTitle')}</CardTitle>
                  <div className="grid gap-2">
                    <Input 
                      value={newChildName} 
                      onChange={(e) => setNewChildName(e.target.value)} 
                      placeholder={t('decks.childDeckTitle')} 
                      className="text-xs h-8 font-bold"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newChildName.trim()) createChildMutation.mutate(newChildName.trim())
                        if (e.key === 'Escape') setIsCreatingChild(false)
                      }}
                    />
                    <div className="flex gap-1.5 mt-1">
                      <button
                        type="button"
                        disabled={!newChildName.trim() || createChildMutation.isPending}
                        onClick={() => createChildMutation.mutate(newChildName.trim())}
                        className="inline-flex h-8 items-center justify-center rounded border-2 border-border bg-primary text-primary-foreground font-black text-xs px-3 shadow-[1px_1px_0_var(--border)] hover:bg-[#ffe05c] transition-all active:translate-y-0.5 active:shadow-none disabled:opacity-50"
                      >
                        {t('actions.save')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCreatingChild(false)}
                        className="inline-flex h-8 items-center justify-center rounded border-2 border-border bg-card text-foreground font-black text-xs px-3 shadow-[1px_1px_0_var(--border)] hover:bg-muted transition-all active:translate-y-0.5 active:shadow-none"
                      >
                        {t('actions.cancel')}
                      </button>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card 
                  className="border-dashed hover:bg-muted/10 border-muted-foreground/30 cursor-pointer flex flex-col items-center justify-center min-h-[140px] text-muted-foreground hover:text-foreground transition-all"
                  onClick={() => { setIsCreatingChild(true); setNewChildName('') }}
                >
                  <Plus size={20} className="mb-1" />
                  <span className="text-xs font-bold">{t('decks.addChild')}</span>
                </Card>
              )
            )}
          </div>
        </div>
      ) : null}
      {shouldUseRemoteData && !(childrenQuery.data && childrenQuery.data.length > 0) ? (
        <Card className="mb-4">
          {!bulkSelectMode ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-end gap-3 w-full">
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs font-black uppercase text-muted-foreground mb-1.5 block">{t('decks.addTerm')}</Label>
                  <Select value={selectedTermId} onChange={(event) => setSelectedTermId(event.target.value)}>
                    <option value="">{availableVocabulary.length === 0 ? t('decks.noAvailableTerms') : t('decks.chooseTerm')}</option>
                    {availableVocabulary.map((item) => <option key={item.id} value={item.id}>{item.source_text}</option>)}
                  </Select>
                </div>
                <Button 
                  disabled={!selectedTermId || addTermMutation.isPending} 
                  onClick={() => addTermMutation.mutate()}
                  className="min-h-10 px-6 shrink-0"
                >
                  {addTermMutation.isPending ? t('actions.saving') : t('decks.addTerm')}
                </Button>
                <Button 
                  variant="ghost" 
                  disabled={availableVocabulary.length === 0} 
                  onClick={() => { setSelectedAvailableIds(new Set()); setBulkSelectMode(true) }}
                  className="min-h-10 px-4 shrink-0"
                >
                  {t('decks.bulkAdd')}
                </Button>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
                <input
                  type="checkbox"
                  checked={filterNoDeck}
                  onChange={(event) => setFilterNoDeck(event.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-xs font-bold">{t('decks.filterNoDeck')}</span>
              </label>
            </div>
          ) : (
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Button variant="ghost" onClick={() => setBulkSelectMode(false)}>{t('actions.cancel')}</Button>
                <span className="text-xs font-bold">{t('vocabulary.selected', { count: selectedAvailableIds.size })}</span>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (selectedAvailableIds.size === availableVocabulary.length) {
                      setSelectedAvailableIds(new Set())
                    } else {
                      setSelectedAvailableIds(new Set(availableVocabulary.map((v) => v.id)))
                    }
                  }}
                >
                  {selectedAvailableIds.size === availableVocabulary.length ? t('vocabulary.deselectAll') : t('vocabulary.selectAll')}
                </Button>
                <div className="flex-1" />
                <Button
                  disabled={selectedAvailableIds.size === 0 || batchAddMutation.isPending}
                  onClick={() => batchAddMutation.mutate()}
                >
                  {batchAddMutation.isPending ? t('actions.saving') : t('decks.addSelected')}
                </Button>
              </div>
              <label className="mb-2 flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filterNoDeck}
                  onChange={(event) => setFilterNoDeck(event.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-xs font-bold">{t('decks.filterNoDeck')}</span>
              </label>
              <div className="max-h-96 overflow-auto grid gap-2">
                {availableVocabulary.length === 0 ? <p className="text-sm font-bold text-muted-foreground">{t('decks.noAvailableTerms')}</p> : null}
                {availableVocabulary.map((item) => (
                  <label key={item.id} className="flex items-center gap-2 rounded-md border-2 border-border bg-card p-3 cursor-pointer select-none hover:bg-muted/50">
                    <input
                      type="checkbox"
                      checked={selectedAvailableIds.has(item.id)}
                      onChange={() => {
                        setSelectedAvailableIds((prev) => {
                          const next = new Set(prev)
                          if (next.has(item.id)) next.delete(item.id)
                          else next.add(item.id)
                          return next
                        })
                      }}
                      className="h-4 w-4 accent-primary"
                    />
                    <div>
                      <p className="font-black">{item.source_text}</p>
                      <p className="text-xs font-semibold text-muted-foreground">{item.meanings[0]?.text}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </Card>
      ) : null}
      {!(childrenQuery.data && childrenQuery.data.length > 0) && (
        <div className="grid gap-3">
          {vocabulary.length === 0 ? <Card className="font-black text-muted-foreground">{t('vocabulary.emptyTitle')}</Card> : null}
          {vocabulary.map((item) => (
            <Card key={item.id} className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <p className="text-xl font-black">{item.source_text}</p>
                <p className="font-semibold text-muted-foreground">{item.meanings[0]?.text}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="ghost"><Link to={`/app/vocabulary/${item.id}`}>{t('decks.view')}</Link></Button>
                {shouldUseRemoteData ? <Button variant="secondary" onClick={() => setPendingRemoveTermId(item.id)}>{t('decks.removeFromDeck')}</Button> : null}
              </div>
            </Card>
          ))}
        </div>
      )}
      <ConfirmModal
        open={Boolean(pendingRemoveTermId)}
        title={t('decks.removeTermConfirm')}
        confirmLabel={t('decks.removeFromDeck')}
        cancelLabel={t('actions.cancel')}
        onCancel={() => setPendingRemoveTermId(null)}
        onConfirm={() => pendingRemoveTermId ? removeTermMutation.mutate(pendingRemoveTermId) : undefined}
      />
      <ConfirmModal
        open={Boolean(pendingDeleteChildId)}
        title={t('decks.deleteChildConfirmTitle')}
        description={t('decks.deleteChildConfirmDesc')}
        confirmLabel={t('vocabulary.delete')}
        cancelLabel={t('actions.cancel')}
        variant="danger"
        confirmDisabled={deleteChildMutation.isPending}
        onConfirm={() => {
          if (pendingDeleteChildId) deleteChildMutation.mutate(pendingDeleteChildId)
        }}
        onCancel={() => setPendingDeleteChildId(null)}
      />
    </>
  )
}
