import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FolderOpen, Pencil, Trash2, Plus, ChevronLeft, BookOpen, PlusCircle, Eye } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input, Label } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { demoDecks, demoVocabulary } from '@/features/demo/demoData'
import { useI18n } from '@/i18n'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { deckService } from '@/services/supabase/deck.service'
import { isSubscriptionLimitError } from '@/services/supabase/subscription.errors'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
import { useStudyStore } from '@/stores/useStudyStore'
import { useQuizStore } from '@/stores/useQuizStore'
import { filterActiveVocabulary } from '@/utils/vocabulary'
import { soundEffects } from '@/utils/soundEffects'
import { cn } from '@/utils/cn'

export function DeckDetailPage() {
  const { id } = useParams()
  const { t } = useI18n()
  const navigate = useNavigate()
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

  const selectOptions = useMemo(() => {
    return availableVocabulary.map((item) => ({
      value: item.id,
      label: `${item.source_text} — ${item.meanings[0]?.text ?? ''}`,
    }))
  }, [availableVocabulary])

  const addTermMutation = useMutation({
    mutationFn: () => deckService.addTerm(id!, selectedTermId),
    onSuccess: async () => {
      soundEffects.play('cardClick')
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
      soundEffects.play('cardClick')
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
      soundEffects.play('cardClick')
      setIsCreatingChild(false)
      setNewChildName('')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['deck-children', id] }),
        queryClient.invalidateQueries({ queryKey: ['decks', user?.id] }),
        useSubscriptionStore.getState().loadSubscription(),
      ])
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['deck-children', id] }),
        queryClient.invalidateQueries({ queryKey: ['decks', user?.id] }),
        useSubscriptionStore.getState().loadSubscription(),
      ])
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

  const handleBack = () => {
    soundEffects.play('cardClick')
    if (deck?.parent_id) {
      navigate(`/app/decks/${deck.parent_id}`)
    } else {
      navigate('/app/decks')
    }
  }

  if (shouldUseRemoteData && (deckQuery.isLoading || termsQuery.isLoading || allVocabularyQuery.isLoading)) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <div className="h-40 bg-white border-3 border-slate-900 rounded-2xl animate-pulse" />
        <div className="h-24 bg-white border-3 border-slate-900 rounded-2xl animate-pulse" />
      </div>
    )
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
    return (
      <div className="max-w-xl mx-auto neo-card p-6 bg-rose-100 border-3 border-slate-900 rounded-2xl font-black text-rose-950 shadow-[4px_4px_0px_0px_#000]">
        {error}
      </div>
    )
  }

  if (!deck) {
    return (
      <div className="max-w-xl mx-auto neo-card p-8 bg-white border-4 border-slate-900 rounded-2xl text-center space-y-3 shadow-[6px_6px_0px_0px_#000]">
        <p className="text-xl font-black text-slate-900">{t('decks.emptyTitle')}</p>
        <p className="text-sm font-bold text-slate-600">{t('decks.emptyDescription')}</p>
        <Button onClick={handleBack} className="mt-4 neo-button bg-[#fdc800] text-slate-900 font-black border-2 border-slate-900">
          Quay lại danh sách
        </Button>
      </div>
    )
  }

  const parentId = deck?.parent_id

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Back Button / Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="neo-button p-2.5 rounded-xl border-2 border-slate-900 bg-white hover:bg-amber-100 active:neo-button-active transition shadow-[2px_2px_0px_0px_#000]"
        >
          <ChevronLeft className="w-5 h-5 text-slate-900" />
        </button>
        <div className="flex items-center gap-2">
          <Badge className="bg-purple-600 text-white font-black text-xs px-3 py-1 border border-slate-900">
            {parentId ? 'Bộ Thẻ Con' : 'Bộ Thẻ Chính'}
          </Badge>
          <span className="text-xs font-bold text-slate-500">
            {parentId ? 'Thuộc bộ thẻ cha' : 'Quản lý bài học & từ vựng'}
          </span>
        </div>
      </div>

      {/* Main Header Banner */}
      <div className="neo-card p-6 sm:p-8 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                {deck.name}
              </h1>

              {shouldUseRemoteData ? (
                <button
                  type="button"
                  title={t('decks.edit')}
                  className="neo-button p-2 rounded-lg border-2 border-slate-900 bg-amber-100 hover:bg-amber-200 shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5"
                  onClick={() => { setEditingDeck(true); setEditName(deck.name) }}
                >
                  <Pencil size={14} className="text-slate-900" />
                </button>
              ) : null}

              <Badge className={cn(
                "font-black text-xs px-3 py-1 border border-slate-900",
                deck.visibility === 'public' ? 'bg-emerald-200 text-emerald-950' : 'bg-slate-200 text-slate-800'
              )}>
                {deck.visibility === 'public' ? t('decks.public') : t('decks.private')}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-950 px-2.5 py-1 rounded-md border border-slate-900">
                <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                {t('decks.words', { count: vocabulary.length })}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button asChild className="neo-button bg-[#fdc800] hover:bg-amber-300 text-slate-900 font-black text-xs sm:text-sm border-2 border-slate-900 shadow-[3px_3px_0px_0px_#000]">
              <Link to="/app/study" onClick={() => { soundEffects.play('cardClick'); setSelectedDeckId(deck.id) }}>
                {t('decks.startFlashcard')}
              </Link>
            </Button>
            <Button asChild variant="secondary" className="neo-button bg-purple-100 hover:bg-purple-200 text-purple-950 font-bold text-xs sm:text-sm border-2 border-slate-900 shadow-[3px_3px_0px_0px_#000]">
              <Link to="/app/quiz" onClick={() => { soundEffects.play('cardClick'); setQuizDeckId(deck.id) }}>
                {t('decks.quiz')}
              </Link>
            </Button>
          </div>
        </div>

        {editingDeck && (
          <div className="pt-4 border-t-2 border-slate-200 space-y-3">
            <h3 className="text-sm font-black text-slate-900">{t('decks.editTitle')}</h3>
            <div className="flex gap-2">
              <Input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                className="font-bold border-2 border-slate-900"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && editName.trim()) updateDeckMutation.mutate()
                  if (e.key === 'Escape') setEditingDeck(false)
                }}
              />
              <Button
                disabled={!editName.trim() || updateDeckMutation.isPending}
                onClick={() => updateDeckMutation.mutate()}
                className="neo-button bg-[#fdc800] text-slate-900 font-black border-2 border-slate-900 shrink-0"
              >
                {t('actions.saveChanges')}
              </Button>
              <Button variant="ghost" onClick={() => setEditingDeck(false)} className="shrink-0 font-bold">
                {t('actions.cancel')}
              </Button>
            </div>
            {updateDeckMutation.error instanceof Error ? (
              <p className="text-xs font-black text-rose-600">{updateDeckMutation.error.message}</p>
            ) : null}
          </div>
        )}
      </div>

      {/* Child Decks Grid (If Parent Deck) */}
      {childrenQuery.data && (childrenQuery.data.length > 0 || !deck.parent_id) ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FolderOpen size={20} className="text-amber-600" />
            <h2 className="text-lg font-black text-slate-900">
              {t('decks.childDecks', { count: childrenQuery.data.length })}
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {childrenQuery.data.map((child) => (
              <div
                key={child.id}
                className="neo-card p-5 bg-amber-50/90 hover:bg-amber-100 border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-2xl space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  {editingChildId === child.id ? (
                    <div className="flex gap-2 items-center">
                      <Input
                        value={editChildName}
                        onChange={(e) => setEditChildName(e.target.value)}
                        className="font-bold h-8 text-xs border-2 border-slate-900"
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
                        className="neo-button h-8 px-2.5 bg-[#fdc800] text-slate-900 font-black text-xs border-2 border-slate-900 rounded-lg shrink-0"
                      >
                        {t('actions.save')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingChildId(null)}
                        className="neo-button h-8 px-2.5 bg-slate-100 text-slate-900 font-bold text-xs border-2 border-slate-900 rounded-lg shrink-0"
                      >
                        {t('actions.cancel')}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <Link to={`/app/decks/${child.id}`} onClick={() => soundEffects.play('cardClick')} className="hover:underline no-underline">
                        <h3 className="text-lg font-black text-slate-900 hover:text-purple-700 transition-colors">
                          {child.name}
                        </h3>
                      </Link>

                      {shouldUseRemoteData ? (
                        <div className="flex gap-1 shrink-0">
                          <button
                            type="button"
                            title={t('decks.edit')}
                            className="neo-button p-1.5 rounded-lg border-2 border-slate-900 bg-white hover:bg-amber-100 shadow-[1.5px_1.5px_0px_0px_#000]"
                            onClick={() => { setEditingChildId(child.id); setEditChildName(child.name) }}
                          >
                            <Pencil size={11} className="text-slate-900" />
                          </button>
                          <button
                            type="button"
                            title={t('vocabulary.delete')}
                            className="neo-button p-1.5 rounded-lg border-2 border-slate-900 bg-rose-100 hover:bg-rose-200 shadow-[1.5px_1.5px_0px_0px_#000]"
                            onClick={() => setPendingDeleteChildId(child.id)}
                          >
                            <Trash2 size={11} className="text-rose-700" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )}

                  <Badge className="bg-slate-900 text-[#fdc800] font-black text-xs border border-slate-900">
                    {t('decks.words', { count: child.term_count ?? 0 })}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-300">
                  <Button asChild className="neo-button bg-[#fdc800] hover:bg-amber-300 text-slate-900 font-black text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000]">
                    <Link to={`/app/decks/${child.id}`} onClick={() => soundEffects.play('cardClick')}>
                      {t('decks.open')}
                    </Link>
                  </Button>
                  <Button asChild variant="secondary" className="neo-button bg-purple-100 text-purple-950 font-bold text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000]">
                    <Link to="/app/study" onClick={() => { soundEffects.play('cardClick'); setSelectedDeckId(child.id) }}>
                      {t('decks.study')}
                    </Link>
                  </Button>
                </div>
              </div>
            ))}

            {/* Create Child Deck Card */}
            {shouldUseRemoteData && (
              isCreatingChild ? (
                <div className="neo-card p-5 bg-white border-3 border-dashed border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-2xl space-y-3">
                  <h3 className="text-xs font-black uppercase text-slate-700">{t('decks.createChildTitle')}</h3>
                  <Input
                    value={newChildName}
                    onChange={(e) => setNewChildName(e.target.value)}
                    placeholder={t('decks.childDeckTitle')}
                    className="text-xs h-9 font-bold border-2 border-slate-900"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newChildName.trim()) createChildMutation.mutate(newChildName.trim())
                      if (e.key === 'Escape') setIsCreatingChild(false)
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!newChildName.trim() || createChildMutation.isPending}
                      onClick={() => createChildMutation.mutate(newChildName.trim())}
                      className="neo-button py-1.5 px-3 bg-[#fdc800] text-slate-900 font-black text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-lg disabled:opacity-50"
                    >
                      {t('actions.save')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreatingChild(false)}
                      className="neo-button py-1.5 px-3 bg-slate-100 text-slate-900 font-bold text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-lg"
                    >
                      {t('actions.cancel')}
                    </button>
                  </div>
                  {createChildMutation.error instanceof Error ? (
                    <p className="text-xs font-black text-rose-600">
                      {isSubscriptionLimitError(createChildMutation.error)
                        ? `Bạn đã đạt giới hạn ${createChildMutation.error.limit} bộ thẻ của gói Free. Hãy nâng cấp Pro để tạo thêm.`
                        : createChildMutation.error.message}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div
                  className="neo-card p-5 bg-amber-50/50 hover:bg-amber-100/60 border-3 border-dashed border-slate-900 shadow-[3px_3px_0px_0px_#000] rounded-2xl cursor-pointer flex flex-col items-center justify-center min-h-[130px] transition-all group"
                  onClick={() => { soundEffects.play('cardClick'); setIsCreatingChild(true); setNewChildName('') }}
                >
                  <div className="w-10 h-10 rounded-full bg-[#fdc800] border-2 border-slate-900 shadow-[1.5px_1.5px_0px_0px_#000] flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                    <Plus size={20} className="text-slate-900 stroke-[3px]" />
                  </div>
                  <span className="text-xs font-black text-slate-900">{t('decks.addChild')}</span>
                </div>
              )
            )}
          </div>
        </div>
      ) : null}

      {/* Add Terms Section (Only for decks without children) */}
      {shouldUseRemoteData && !(childrenQuery.data && childrenQuery.data.length > 0) ? (
        <div className="neo-card p-6 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-2xl space-y-4">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-purple-700" />
            <span>Thêm Từ Vựng Vào Bộ Thẻ này</span>
          </h2>

          {!bulkSelectMode ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                <div className="flex-1">
                  <Label className="text-xs font-black uppercase text-slate-700 mb-1.5 block">
                    {t('decks.addTerm')}
                  </Label>
                  {/* Custom Neobrutalism Select component strictly compliant with AGENTS.md rules */}
                  <Select
                    value={selectedTermId}
                    onChange={(val) => setSelectedTermId(val)}
                    options={selectOptions}
                    placeholder={availableVocabulary.length === 0 ? t('decks.noAvailableTerms') : t('decks.chooseTerm')}
                    disabled={availableVocabulary.length === 0}
                  />
                </div>

                <Button
                  disabled={!selectedTermId || addTermMutation.isPending}
                  onClick={() => addTermMutation.mutate()}
                  className="neo-button min-h-10 px-6 bg-[#fdc800] text-slate-900 font-black border-2 border-slate-900 shadow-[3px_3px_0px_0px_#000] shrink-0"
                >
                  {addTermMutation.isPending ? t('actions.saving') : t('decks.addTerm')}
                </Button>

                <Button
                  variant="ghost"
                  disabled={availableVocabulary.length === 0}
                  onClick={() => { soundEffects.play('cardClick'); setSelectedAvailableIds(new Set()); setBulkSelectMode(true) }}
                  className="neo-button min-h-10 px-4 bg-purple-100 text-purple-950 font-bold border-2 border-slate-900 shadow-[3px_3px_0px_0px_#000] shrink-0"
                >
                  {t('decks.bulkAdd')}
                </Button>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
                <input
                  type="checkbox"
                  checked={filterNoDeck}
                  onChange={(event) => setFilterNoDeck(event.target.checked)}
                  className="h-4 w-4 accent-purple-600 rounded border-2 border-slate-900"
                />
                <span className="text-xs font-bold text-slate-700">{t('decks.filterNoDeck')}</span>
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 pb-2 border-b-2 border-slate-200">
                <Button variant="ghost" onClick={() => setBulkSelectMode(false)} className="font-bold text-xs">
                  {t('actions.cancel')}
                </Button>
                <Badge className="bg-purple-600 text-white font-black text-xs">
                  {t('vocabulary.selected', { count: selectedAvailableIds.size })}
                </Badge>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (selectedAvailableIds.size === availableVocabulary.length) {
                      setSelectedAvailableIds(new Set())
                    } else {
                      setSelectedAvailableIds(new Set(availableVocabulary.map((v) => v.id)))
                    }
                  }}
                  className="font-bold text-xs"
                >
                  {selectedAvailableIds.size === availableVocabulary.length ? t('vocabulary.deselectAll') : t('vocabulary.selectAll')}
                </Button>
                <div className="flex-1" />
                <Button
                  disabled={selectedAvailableIds.size === 0 || batchAddMutation.isPending}
                  onClick={() => batchAddMutation.mutate()}
                  className="neo-button bg-[#fdc800] text-slate-900 font-black text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000]"
                >
                  {batchAddMutation.isPending ? t('actions.saving') : t('decks.addSelected')}
                </Button>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filterNoDeck}
                  onChange={(event) => setFilterNoDeck(event.target.checked)}
                  className="h-4 w-4 accent-purple-600 rounded border-2 border-slate-900"
                />
                <span className="text-xs font-bold text-slate-700">{t('decks.filterNoDeck')}</span>
              </label>

              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {availableVocabulary.length === 0 ? (
                  <p className="text-sm font-bold text-slate-500 py-4 text-center">{t('decks.noAvailableTerms')}</p>
                ) : null}

                {availableVocabulary.map((item) => {
                  const isChecked = selectedAvailableIds.has(item.id)
                  return (
                    <label
                      key={item.id}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border-2 border-slate-900 p-3 cursor-pointer select-none transition-all",
                        isChecked ? "bg-amber-100 shadow-[2px_2px_0px_0px_#000]" : "bg-slate-50 hover:bg-slate-100"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setSelectedAvailableIds((prev) => {
                            const next = new Set(prev)
                            if (next.has(item.id)) next.delete(item.id)
                            else next.add(item.id)
                            return next
                          })
                        }}
                        className="h-4 w-4 accent-purple-600"
                      />
                      <div>
                        <p className="font-black text-slate-900 text-sm">{item.source_text}</p>
                        <p className="text-xs font-semibold text-slate-600">{item.meanings[0]?.text}</p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Vocabulary Terms List */}
      {!(childrenQuery.data && childrenQuery.data.length > 0) && (
        <div className="space-y-3">
          <h2 className="text-lg font-black text-slate-900 flex items-center justify-between">
            <span>Danh Sách Từ Vựng Trong Bộ ({vocabulary.length})</span>
          </h2>

          {vocabulary.length === 0 ? (
            <div className="neo-card p-6 bg-white border-3 border-slate-900 rounded-2xl text-center font-bold text-slate-500 shadow-[4px_4px_0px_0px_#000]">
              {t('vocabulary.emptyTitle')}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {vocabulary.map((item) => (
              <div
                key={item.id}
                className="neo-card p-4 bg-white border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-2xl flex items-center justify-between gap-3 group hover:bg-amber-50/60 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-base font-black text-slate-900 group-hover:text-purple-700 transition-colors">
                    {item.source_text}
                  </p>
                  {item.ipa && (
                    <p className="text-xs font-bold text-purple-600 font-mono">
                      /{item.ipa}/
                    </p>
                  )}
                  <p className="text-xs font-bold text-slate-600 truncate mt-0.5">
                    {item.meanings[0]?.text}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button asChild variant="ghost" className="neo-button p-2 bg-slate-100 hover:bg-amber-100 text-slate-900 font-bold border-2 border-slate-900 rounded-lg shadow-[1.5px_1.5px_0px_0px_#000]">
                    <Link to={`/app/vocabulary/${item.id}`} onClick={() => soundEffects.play('cardClick')} title={t('decks.view')}>
                      <Eye className="w-4 h-4" />
                    </Link>
                  </Button>

                  {shouldUseRemoteData ? (
                    <button
                      type="button"
                      onClick={() => setPendingRemoveTermId(item.id)}
                      title={t('decks.removeFromDeck')}
                      className="neo-button p-2 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold border-2 border-slate-900 rounded-lg shadow-[1.5px_1.5px_0px_0px_#000]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm Modals */}
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
      {deleteChildMutation.error instanceof Error ? (
        <div className="neo-card p-4 bg-rose-100 border-3 border-slate-900 rounded-xl font-black text-rose-950">
          {deleteChildMutation.error.message}
        </div>
      ) : null}
    </div>
  )
}
