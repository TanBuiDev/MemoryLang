import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, FolderOpen, Pencil, Plus, Library, Layers, Sparkles, Target, Trash2, ArrowRight, BookOpen } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input } from '@/components/ui/input'
import { demoDecks } from '@/features/demo/demoData'
import { useI18n } from '@/i18n'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { deckService } from '@/services/supabase/deck.service'
import { isSubscriptionLimitError } from '@/services/supabase/subscription.errors'
import { quizService } from '@/services/supabase/quiz.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
import { useStudyStore } from '@/stores/useStudyStore'
import { useQuizStore } from '@/stores/useQuizStore'
import { ProFeatureGate } from '@/components/common/ProFeatureGate'
import type { Deck } from '@/types/deck.types'
import { soundEffects } from '@/utils/soundEffects'
import { cn } from '@/utils/cn'

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
  const isAdmin = Boolean(profile?.is_admin)

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
      soundEffects.play('cardClick')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['decks', user?.id] }),
        useSubscriptionStore.getState().loadSubscription(),
      ])
      navigate(`/app/decks/${deck.id}`)
    },
  })
  const deleteMutation = useMutation({
    mutationFn: (deckId: string) => deckService.remove(deckId),
    onSuccess: async () => {
      setPendingDeleteId(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['decks', user?.id] }),
        useSubscriptionStore.getState().loadSubscription(),
      ])
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
  const canCreate = shouldUseRemoteData && !createMutation.isPending

  const { parents, standalone } = useMemo(() => {
    const parentMap = new Map<string, Deck>()
    const childMap = new Map<string, Deck[]>()
    const childDeckIds = new Set<string>()
    const standaloneDecks: Deck[] = []

    for (const deck of allDecks) {
      if (deck.parent_id) {
        childDeckIds.add(deck.id)
        const siblings = childMap.get(deck.parent_id) || []
        siblings.push(deck)
        childMap.set(deck.parent_id, siblings)
      }
    }

    for (const deck of allDecks) {
      if (childMap.has(deck.id)) {
        parentMap.set(deck.id, { ...deck, children: childMap.get(deck.id) })
      } else if (!deck.parent_id && !childDeckIds.has(deck.id)) {
        standaloneDecks.push(deck)
      }
    }

    return { parents: [...parentMap.values()], standalone: standaloneDecks }
  }, [allDecks])

  const renderDeckCard = (deck: Deck) => {
    const hasChildren = deck.children && deck.children.length > 0
    const isOwner = user && deck.user_id === user.id
    const childCount = deck.children?.length ?? 0

    return (
      <div
        key={deck.id}
        className={cn(
          "neo-card p-5 sm:p-6 border-3 border-slate-900 shadow-[5px_5px_0px_0px_#000] rounded-2xl transition-all flex flex-col justify-between gap-4",
          hasChildren ? "bg-amber-50/80 hover:bg-amber-100/80" : "bg-white hover:bg-slate-50"
        )}
      >
        {/* Header & Title section */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {editingId === deck.id ? (
                <div className="flex gap-2 items-center">
                  <Input 
                    value={editName} 
                    onChange={(e) => setEditName(e.target.value)} 
                    className="min-w-[180px] flex-1 font-bold text-sm h-9 border-2 border-slate-900" 
                    autoFocus
                    placeholder={t('decks.name')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') updateMutation.mutate({ id: deck.id, name: editName.trim() })
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                  />
                  <button 
                    type="button"
                    disabled={!editName.trim() || updateMutation.isPending} 
                    onClick={() => updateMutation.mutate({ id: deck.id, name: editName.trim() })}
                    className="neo-button h-9 px-3 bg-[#fdc800] text-slate-900 font-black text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-lg shrink-0"
                  >
                    {t('decks.saveEdit')}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="neo-button h-9 px-3 bg-slate-100 text-slate-900 font-bold text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-lg shrink-0"
                  >
                    {t('decks.cancelEdit')}
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {hasChildren ? (
                      <div className="w-8 h-8 rounded-lg bg-amber-400 border-2 border-slate-900 shadow-[1.5px_1.5px_0px_0px_#000] flex items-center justify-center shrink-0">
                        <FolderOpen size={18} className="text-slate-900" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-purple-100 border-2 border-slate-900 shadow-[1.5px_1.5px_0px_0px_#000] flex items-center justify-center shrink-0">
                        <Library size={18} className="text-purple-700" />
                      </div>
                    )}

                    <Link to={`/app/decks/${deck.id}`} className="hover:underline no-underline">
                      <h3 className="text-xl font-black text-slate-900 hover:text-purple-700 transition-colors">
                        {deck.name}
                      </h3>
                    </Link>

                    <Badge className={cn(
                      "font-black text-[11px] px-2.5 py-0.5 border border-slate-900",
                      deck.visibility === 'public' ? 'bg-emerald-200 text-emerald-950' : 'bg-slate-200 text-slate-800'
                    )}>
                      {deck.visibility === 'public' ? t('decks.public') : t('decks.private')}
                    </Badge>

                    {hasChildren && (
                      <Badge className="bg-amber-300 text-amber-950 font-black text-[11px] px-2.5 py-0.5 border border-slate-900">
                        {t('decks.childDecks', { count: childCount })}
                      </Badge>
                    )}

                    {shouldUseRemoteData && isOwner ? (
                      <button
                        type="button"
                        title={t('decks.edit')}
                        className="neo-button p-1.5 rounded-lg border-2 border-slate-900 bg-white hover:bg-amber-100 shadow-[1.5px_1.5px_0px_0px_#000] active:translate-y-0.5"
                        onClick={() => { setEditingId(deck.id); setEditName(deck.name) }}
                      >
                        <Pencil size={12} className="text-slate-900" />
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats Display */}
          <div className="neo-card p-3.5 bg-slate-900 text-white rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#fdc800]" />
              <span className="text-xs font-bold text-slate-300">Dung lượng:</span>
            </div>
            <span className="text-base sm:text-lg font-black text-[#fdc800]">
              {hasChildren ? t('decks.childDecks', { count: childCount }) : t('decks.words', { count: deck.term_count ?? 0 })}
            </span>
          </div>

          {shouldUseRemoteData && !hasChildren && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 px-1">
              <Target className="w-4 h-4 text-purple-600" />
              <span>{t('decks.quizAttempts', { count: attemptCounts[deck.id] ?? 0 })}</span>
            </div>
          )}
        </div>

        {/* Action Buttons Footer */}
        <div className="space-y-2 pt-2 border-t-2 border-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild className="neo-button bg-[#fdc800] hover:bg-amber-300 text-slate-900 font-black text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000]">
              <Link to={`/app/decks/${deck.id}`} onClick={() => soundEffects.play('cardClick')}>
                <span>{t('decks.open')}</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>

            {!hasChildren && (
              <>
                <Button asChild variant="secondary" className="neo-button bg-purple-100 hover:bg-purple-200 text-purple-950 font-bold text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000]">
                  <Link to="/app/study" onClick={() => { soundEffects.play('cardClick'); setSelectedDeckId(deck.id) }}>
                    {t('decks.study')}
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="neo-button bg-emerald-100 hover:bg-emerald-200 text-emerald-950 font-bold text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000]">
                  <Link to="/app/quiz" onClick={() => { soundEffects.play('cardClick'); setQuizDeckId(deck.id) }}>
                    {t('decks.quiz')}
                  </Link>
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            {shouldUseRemoteData && isAdmin && isOwner ? (
              <button
                type="button"
                onClick={() => toggleVisibilityMutation.mutate(deck)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
              >
                {deck.visibility === 'public' ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{deck.visibility === 'public' ? t('decks.makePrivate') : t('decks.makePublic')}</span>
              </button>
            ) : <div />}

            {shouldUseRemoteData && isOwner ? (
              <button
                type="button"
                onClick={() => setPendingDeleteId(deck.id)}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 ml-auto"
              >
                <Trash2 size={13} />
                <span>{t('vocabulary.delete')}</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Hero Welcome Banner */}
      <div className="neo-card p-6 sm:p-8 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000] rounded-full">
            <Sparkles className="w-4 h-4 text-amber-600 fill-amber-400" />
            <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
              Quản Lý Thẻ Từ Vựng
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            {t('decks.title')}
          </h1>
          <p className="text-xs sm:text-sm font-bold text-slate-600 leading-relaxed">
            {t('decks.description')}
          </p>
        </div>

        <ProFeatureGate feature="decks">
          <Button
            disabled={!canCreate}
            onClick={() => createMutation.mutate()}
            className="neo-button py-3 px-6 bg-[#fdc800] hover:bg-amber-300 text-slate-900 font-black text-sm border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-xl flex items-center gap-2 shrink-0 transition-all cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>{createMutation.isPending ? t('actions.saving') : t('decks.create')}</span>
          </Button>
        </ProFeatureGate>
      </div>

      {createMutation.error instanceof Error ? (
        <div className="neo-card p-4 bg-rose-100 border-3 border-slate-900 rounded-xl font-black text-rose-950 shadow-[3px_3px_0px_0px_#000]">
          {isSubscriptionLimitError(createMutation.error)
            ? `Bạn đã đạt giới hạn ${createMutation.error.limit} bộ thẻ của gói Free. Hãy nâng cấp Pro để tạo thêm.`
            : createMutation.error.message}
        </div>
      ) : null}

      {/* Main Grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {decksQuery.isLoading ? (
          <div className="col-span-full neo-card p-6 bg-white border-3 border-slate-900 rounded-2xl font-black animate-pulse text-center">
            {t('decks.loading')}
          </div>
        ) : null}

        {decksQuery.error ? (
          <div className="col-span-full neo-card p-6 bg-rose-100 border-3 border-slate-900 rounded-2xl font-black text-rose-950">
            {decksQuery.error.message}
          </div>
        ) : null}

        {!decksQuery.isLoading && allDecks.length === 0 ? (
          <div className="col-span-full neo-card p-8 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_0px_#000] rounded-2xl text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 border-3 border-slate-900 shadow-[3px_3px_0px_0px_#000] mx-auto flex items-center justify-center">
              <Layers className="w-7 h-7 text-amber-700" />
            </div>
            <h3 className="text-xl font-black text-slate-900">{t('decks.emptyTitle')}</h3>
            <p className="text-sm font-bold text-slate-600 max-w-md mx-auto">
              {t('decks.emptyDescription')}
            </p>
          </div>
        ) : null}

        {parents.map((deck) => renderDeckCard(deck))}
        {standalone.map((deck) => renderDeckCard(deck))}
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
    </div>
  )
}
