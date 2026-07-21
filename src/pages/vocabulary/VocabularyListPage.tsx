import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Volume2, Flag, SlidersHorizontal, ChevronDown } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { PageHeader } from '@/components/common/PageHeader'
import { AddVocabularyModal } from '@/components/vocabulary/AddVocabularyModal'
import { AddVocabularyModal as QuickAddVocabularyModal } from '@/components/layout/AddVocabularyModal'
import { FilterModal } from '@/components/vocabulary/FilterModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input, Label } from '@/components/ui/input'
import { buildLessonBatch } from '@/features/decks/bulkLessons'
import { demoVocabulary } from '@/features/demo/demoData'
import { useAudioPreload } from '@/hooks/useAudioPreload'
import { useDebounce } from '@/hooks/useDebounce'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useI18n } from '@/i18n'
import { studyLocalDb } from '@/services/local/studyLocalDb'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { deckService } from '@/services/supabase/deck.service'
import { isSubscriptionLimitError } from '@/services/supabase/subscription.errors'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
import type { Deck } from '@/types/deck.types'
import type { VocabularyItem, VocabularyItemType, VocabularyStatus } from '@/types/vocabulary.types'
import { speak } from '@/utils/audio'
import { filterActiveVocabulary } from '@/utils/vocabulary'

const statusLabelKeys: Record<VocabularyStatus, string> = {
  new: 'vocabulary.statusNew',
  learning: 'vocabulary.statusLearning',
  familiar: 'vocabulary.statusFamiliar',
  memorized: 'vocabulary.statusMemorized',
  difficult: 'vocabulary.statusDifficult',
  need_review: 'vocabulary.statusNeedReview',
}

const statusBorderClasses: Record<VocabularyStatus, string> = {
  new: 'border-l-slate-400',
  learning: 'border-l-blue-500',
  familiar: 'border-l-emerald-500',
  memorized: 'border-l-secondary',
  difficult: 'border-l-destructive',
  need_review: 'border-l-amber-500',
}

function parseFilterParams(params: URLSearchParams): {
  statuses: Set<VocabularyStatus>
  itemTypes: Set<VocabularyItemType>
  flagged: boolean
  noDeck: boolean
  deckId: string | null
} {
  const statuses = new Set<VocabularyStatus>(
    (params.get('statuses') ?? '').split(',').filter((s): s is VocabularyStatus =>
      ['new', 'learning', 'familiar', 'memorized', 'difficult', 'need_review'].includes(s)
    )
  )
  const itemTypes = new Set<VocabularyItemType>(
    (params.get('itemTypes') ?? '').split(',').filter((s): s is VocabularyItemType =>
      ['word', 'phrase', 'idiom', 'sentence'].includes(s)
    )
  )
  return {
    statuses,
    itemTypes,
    flagged: params.get('flagged') === '1',
    noDeck: params.get('noDeck') === '1',
    deckId: params.get('deckId') || null,
  }
}

function filterParamsToSearchParams(filters: {
  statuses: Set<VocabularyStatus>
  itemTypes: Set<VocabularyItemType>
  flagged: boolean
  noDeck: boolean
  deckId: string | null
}, prev: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(prev)
  if (filters.statuses.size > 0) next.set('statuses', [...filters.statuses].join(','))
  else next.delete('statuses')
  if (filters.itemTypes.size > 0) next.set('itemTypes', [...filters.itemTypes].join(','))
  else next.delete('itemTypes')
  if (filters.flagged) next.set('flagged', '1')
  else next.delete('flagged')
  if (filters.noDeck) next.set('noDeck', '1')
  else next.delete('noDeck')
  if (filters.deckId) next.set('deckId', filters.deckId)
  else next.delete('deckId')
  return next
}

export function VocabularyListPage() {
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)
  const queryClient = useQueryClient()
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)
  const vocabularyQuery = useQuery({
    queryKey: ['vocabulary', user?.id],
    queryFn: () => vocabularyService.list(user!.id),
    enabled: shouldUseRemoteData,
    staleTime: 5 * 60 * 1000,
  })
  const decksQuery = useQuery({
    queryKey: ['decks', user?.id],
    queryFn: () => deckService.list(user!.id),
    enabled: shouldUseRemoteData,
  })
  const [searchParams, setSearchParams] = useSearchParams()
  const [cachedVocabulary, setCachedVocabulary] = useState<VocabularyItem[]>([])
  const [filterOpen, setFilterOpen] = useState(false)
  const [isSortOpen, setIsSortOpen] = useState(false)
  const sortDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setIsSortOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filters = useMemo(() => parseFilterParams(searchParams), [searchParams])

  const setFilters = useCallback(
    (next: { statuses: Set<VocabularyStatus>; itemTypes: Set<VocabularyItemType>; flagged: boolean; noDeck: boolean; deckId: string | null }) => {
      setSearchParams((prev) => filterParamsToSearchParams(next, prev))
    },
    [setSearchParams]
  )

  const deckedTermIdsQuery = useQuery({
    queryKey: ['decked-term-ids', user?.id],
    queryFn: () => deckService.getDeckedTermIds(user!.id),
    enabled: shouldUseRemoteData && filters.noDeck,
  })
  const deckTermIdsQuery = useQuery({
    queryKey: ['deck-term-ids', filters.deckId],
    queryFn: async () => {
      if (!filters.deckId) return new Set<string>()
      const allDecks = decksQuery.data ?? []
      const descendantIds = deckService.collectDescendantIds(filters.deckId, allDecks)
      const allDeckIds = [filters.deckId, ...descendantIds]
      const termSets = await Promise.all(allDeckIds.map((deckId) => deckService.listTerms(deckId)))
      const result = new Set<string>()
      for (const terms of termSets) {
        for (const t of terms) {
          result.add(t.global_term_id ?? t.id)
        }
      }
      return result
    },
    enabled: shouldUseRemoteData && Boolean(filters.deckId) && decksQuery.isSuccess,
  })
  const [searchText, setSearchText] = useState(searchParams.get('q') ?? '')
  const debouncedSearch = useDebounce(searchText, 300)
  useEffect(() => {
    searchParams.get('q') !== debouncedSearch && setSearchParams((prev) => {
      if (!debouncedSearch) { prev.delete('q') } else { prev.set('q', debouncedSearch) }
      return prev
    })
  }, [debouncedSearch, searchParams, setSearchParams])
  const VALID_SORTS = ['newest', 'oldest', 'next_review', 'wrong', 'alpha'] as const
  const normalizeSort = (raw: string | null): string | null => {
    if (!raw) return null
    return VALID_SORTS.includes(raw as any) ? raw : null
  }
  const sortOrder = (normalizeSort(searchParams.get('sort')) as 'newest' | 'oldest' | 'next_review' | 'wrong' | 'alpha') || 
                    (normalizeSort(localStorage.getItem('vocab_list_sort')) as 'newest' | 'oldest' | 'next_review' | 'wrong' | 'alpha') || 
                    'newest'

  const setSortOrder = (value: 'newest' | 'oldest' | 'next_review' | 'wrong' | 'alpha') => {
    localStorage.setItem('vocab_list_sort', value)
    setSearchParams((prev) => {
      if (value === 'newest') { prev.delete('sort') } else { prev.set('sort', value) }
      return prev
    })
  }

  useEffect(() => {
    const savedSort = normalizeSort(localStorage.getItem('vocab_list_sort'))
    if (savedSort && !searchParams.has('sort') && savedSort !== 'newest') {
      setSearchParams((prev) => {
        prev.set('sort', savedSort)
        return prev
      }, { replace: true })
    }
  }, [])
  const rawVocabulary = filterActiveVocabulary(shouldUseRemoteData
    ? vocabularyQuery.data ?? cachedVocabulary
    : demoVocabulary).filter((v) => (v.item_type as string) !== 'grammar' && !v.tags?.some((t) => t === 'grammar' || t === 'pattern'))
  const vocabulary = useMemo(() => {
    const normalizedSearch = debouncedSearch.trim().toLowerCase()
    let filtered = rawVocabulary

    if (filters.statuses.size > 0) {
      filtered = filtered.filter((item) => filters.statuses.has(item.status))
    }
    if (filters.itemTypes.size > 0) {
      filtered = filtered.filter((item) => filters.itemTypes.has(item.item_type))
    }
    if (filters.flagged) {
      filtered = filtered.filter((item) => item.flagged)
    }
    if (filters.noDeck) {
      filtered = filtered.filter((item) => !deckedTermIdsQuery.data?.has(item.id))
    }
    if (filters.deckId && deckTermIdsQuery.data) {
      filtered = filtered.filter((item) => deckTermIdsQuery.data.has(item.global_term_id ?? item.id))
    }
    if (normalizedSearch) {
      filtered = filtered.filter((item) =>
        item.source_text.toLowerCase().includes(normalizedSearch),
      )
    }
    const sorted = [...filtered]
    if (sortOrder === 'alpha') {
      sorted.sort((a, b) => a.source_text.localeCompare(b.source_text))
    } else if (sortOrder === 'newest') {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else if (sortOrder === 'oldest') {
      sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    } else if (sortOrder === 'next_review') {
      sorted.sort((a, b) => (a.next_review_at ?? '').localeCompare(b.next_review_at ?? ''))
    } else if (sortOrder === 'wrong') {
      sorted.sort((a, b) => (b.wrong_count ?? 0) - (a.wrong_count ?? 0))
    }
    return sorted
  }, [debouncedSearch, filters, rawVocabulary, sortOrder, deckedTermIdsQuery.data])

  const vocabularyIds = useMemo(() => vocabulary.map((v) => v.id), [vocabulary])

  const online = useOnlineStatus()

  useEffect(() => {
    if (!online || !user) return
    void studyLocalDb.flushPendingMutations(
      user.id,
      (userId, payload) => vocabularyService.create(userId, {
        source_text: payload.source_text,
        source_language: payload.source_language,
        native_language: payload.native_language,
        item_type: payload.item_type,
        part_of_speech: payload.part_of_speech ?? undefined,
        ipa: payload.ipa ?? undefined,
        audio_url: payload.audio_url ?? undefined,
        image_url: payload.image_url ?? undefined,
        note: payload.note ?? undefined,
        meanings: payload.meanings,
        translation: payload.translation ?? undefined,
        examples: payload.examples,
        tags: payload.tags,
        deck_ids: [],
      }),
      (payload) => vocabularyService.update(payload.id, {
        source_text: payload.source_text,
        source_language: payload.source_language,
        native_language: payload.native_language,
        item_type: payload.item_type,
        status: payload.status,
        part_of_speech: payload.part_of_speech ?? undefined,
        ipa: payload.ipa ?? undefined,
        audio_url: payload.audio_url ?? undefined,
        image_url: payload.image_url ?? undefined,
        note: payload.note ?? undefined,
        meanings: payload.meanings,
        translation: payload.translation ?? undefined,
        examples: payload.examples,
        tags: payload.tags,
        deck_ids: [],
      }),
      (ids) => vocabularyService.removeMany(ids),
    ).then(() => {
      void queryClient.invalidateQueries({ queryKey: ['vocabulary', user.id] })
    })
  }, [online, user, queryClient])

  useEffect(() => {
    if (!shouldUseRemoteData || !user) return
    void studyLocalDb.getCachedVocabulary(user.id, null)
      .then(setCachedVocabulary)
      .catch(() => setCachedVocabulary([]))
  }, [shouldUseRemoteData, user])

  useEffect(() => {
    const data = vocabularyQuery.data
    if (!shouldUseRemoteData || !user || !data || data.length === 0) return
    void studyLocalDb.cacheVocabulary(user.id, null, data)
  }, [shouldUseRemoteData, user, vocabularyQuery.data])

  const containerRef = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState(window.innerWidth < 768 ? 1 : 2)

  useEffect(() => {
    const handleResize = () => {
      setColumns(window.innerWidth < 768 ? 1 : 2)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const rows = Math.ceil(vocabulary.length / columns)

  const virtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 180,
    overscan: 3,
  })

  const visibleAudioItems: Array<{ audioUrl?: string | null }> = []
  for (const virtualRow of virtualizer.getVirtualItems()) {
    const start = virtualRow.index * columns
    const rowItems = vocabulary.slice(start, start + columns)
    for (const item of rowItems) {
      if (visibleAudioItems.length >= 6) break
      if (item.audio_url) visibleAudioItems.push({ audioUrl: item.audio_url })
    }
    if (visibleAudioItems.length >= 6) break
  }
  useAudioPreload(visibleAudioItems, 6)

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [quickAddWord, setQuickAddWord] = useState<string | null>(null)
  const [quickAddModalOpen, setQuickAddModalOpen] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [pendingDelete, setPendingDelete] = useState<{ ids: string[]; word?: string } | null>(null)
  const [lessonModalOpen, setLessonModalOpen] = useState(false)
  const [wordsPerLesson, setWordsPerLesson] = useState('10')
  const [lessonFeedback, setLessonFeedback] = useState<{ createdDecks: Deck[]; partial: boolean } | null>(null)
  const parsedWordsPerLesson = Number(wordsPerLesson)
  const hasValidLessonSize = Number.isInteger(parsedWordsPerLesson) && parsedWordsPerLesson > 0
  const plannedLessons = useMemo(() => {
    if (!hasValidLessonSize || selectedIds.size === 0) return []
    try {
      return buildLessonBatch(Array.from(selectedIds), parsedWordsPerLesson, decksQuery.data ?? [])
    } catch {
      return []
    }
  }, [decksQuery.data, hasValidLessonSize, parsedWordsPerLesson, selectedIds])
  const canCreateLessons = shouldUseRemoteData
    && plannedLessons.length > 0
    && !decksQuery.isLoading
    && !decksQuery.isError

  const deleteVocabulary = useMutation({
    mutationFn: (ids: string[]) => vocabularyService.removeMany(ids),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['vocabulary', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['statistics', user?.id] }),
        useSubscriptionStore.getState().loadSubscription(),
      ])
    },
    onError: async (_error, ids) => {
      if (!user) return
      const now = new Date().toISOString()
      for (const id of ids) {
        const item = rawVocabulary.find((v) => v.id === id)
        if (item) {
          await studyLocalDb.enqueueMutation({
            id: `${id}-delete-${Date.now()}`,
            userId: user.id,
            type: 'delete',
            payload: item,
            createdAt: now,
          })
        }
      }
    },
  })
  const createLessonsMutation = useMutation({
    mutationFn: async () => {
      const result = await deckService.createLessonBatch({
        base: {
          user_id: user!.id,
          source_language: profile?.current_target_language ?? 'en',
          native_language: profile?.native_language ?? 'vi',
        },
        lessons: plannedLessons,
      })
      if (result.error && result.createdDecks.length === 0) throw result.error
      return result
    },
    onSuccess: async (result) => {
      setLessonModalOpen(false)
      setLessonFeedback({ createdDecks: result.createdDecks, partial: Boolean(result.error) })
      if (!result.error) exitSelectMode()
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['decks', user?.id] }),
        useSubscriptionStore.getState().loadSubscription(),
      ])
    },
  })

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === vocabulary.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(vocabulary.map((v) => v.id)))
    }
  }

  function enterSelectMode() {
    setSelectMode(true)
    setSelectedIds(new Set())
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  function requestDeleteSingle(id: string, word: string) {
    setPendingDelete({ ids: [id], word })
  }

  function requestDeleteSelected() {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    setPendingDelete({ ids })
  }

  function confirmDelete() {
    if (!pendingDelete) return
    deleteVocabulary.mutate(pendingDelete.ids)
    if (selectMode) exitSelectMode()
    setPendingDelete(null)
  }

  function cancelDelete() {
    setPendingDelete(null)
  }

  function openQuickAdd() {
    const term = searchText.trim()
    if (!term) return
    setQuickAddWord(term)
    setQuickAddModalOpen(true)
  }

  const hasActiveFilters = filters.statuses.size > 0 || filters.itemTypes.size > 0 || filters.flagged || filters.noDeck || filters.deckId !== null

  const headerActions = selectMode ? (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="ghost" onClick={exitSelectMode}>{t('actions.cancel')}</Button>
      <span className="self-center text-sm font-bold">{t('vocabulary.selected', { count: selectedIds.size })}</span>
      <Button
        variant="secondary"
        disabled={selectedIds.size === 0 || !shouldUseRemoteData}
        onClick={() => {
          createLessonsMutation.reset()
          setLessonFeedback(null)
          setLessonModalOpen(true)
        }}
      >
        {t('vocabulary.createLessons')}
      </Button>
      {profile?.is_admin && <Button variant="danger" disabled={selectedIds.size === 0} onClick={requestDeleteSelected}>{t('vocabulary.deleteSelected')}</Button>}
    </div>
  ) : (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant={hasActiveFilters ? 'secondary' : 'ghost'}
        onClick={() => setFilterOpen(true)}
        title={t('vocabulary.filter')}
        className={cn(
          hasActiveFilters ? 'text-secondary-foreground' : 'text-foreground'
        )}
      >
        <SlidersHorizontal className={cn("h-4 w-4", hasActiveFilters ? "text-secondary-foreground" : "text-foreground")} />
        {hasActiveFilters && <span className="ml-1.5 text-xs font-black">●</span>}
      </Button>
      <Button variant="ghost" disabled={!shouldUseRemoteData} onClick={enterSelectMode}>{t('vocabulary.select')}</Button>
      {profile?.is_admin && (
        <Button onClick={() => setAddModalOpen(true)}>{t('vocabulary.add')}</Button>
      )}
    </div>
  )

  return (
    <>
      <PageHeader title={t('vocabulary.title')} actions={headerActions} />
      {lessonFeedback ? (
        <Card className="mb-4">
          <p className="font-black">
            {t(lessonFeedback.partial ? 'vocabulary.lessonsPartiallyCreated' : 'vocabulary.lessonsCreated', {
              count: lessonFeedback.createdDecks.length,
            })}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/app/decks">{t('vocabulary.viewDecks')}</Link>
            </Button>
            <Button variant="ghost" onClick={() => setLessonFeedback(null)}>
              {t('vocabulary.dismissLessonFeedback')}
            </Button>
          </div>
        </Card>
      ) : null}
      {selectMode && vocabulary.length > 0 ? (
        <div className="mb-3">
          <Button variant="ghost" onClick={toggleSelectAll}>
            {selectedIds.size === vocabulary.length ? t('vocabulary.deselectAll') : t('vocabulary.selectAll')}
          </Button>
        </div>
      ) : null}
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Input
              placeholder={t('vocabulary.search')}
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  openQuickAdd()
                }
              }}
            />
          </div>
          <div className="w-full sm:w-48 relative" ref={sortDropdownRef}>
            <button
              type="button"
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="flex items-center justify-between w-full min-h-10 rounded-[var(--radius)] border-2 border-border bg-card px-3 py-2 text-sm font-semibold text-foreground shadow-[2px_2px_0_var(--border)] outline-none transition hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1px_1px_0_var(--border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_var(--border)]"
            >
              <span>
                {sortOrder === 'newest' && t('vocabulary.sortNewest')}
                {sortOrder === 'oldest' && t('vocabulary.sortOldest')}
                {sortOrder === 'alpha' && t('vocabulary.sortAlpha')}
                {sortOrder === 'next_review' && t('vocabulary.sortReview')}
                {sortOrder === 'wrong' && t('vocabulary.sortWrong')}
              </span>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", isSortOpen && "rotate-180")} />
            </button>
            {isSortOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-card border-2 border-border shadow-[3px_3px_0_var(--border)] rounded-[var(--radius)] overflow-hidden py-1 divide-y divide-border animate-in fade-in duration-100">
                {[
                  { value: 'newest', label: t('vocabulary.sortNewest') },
                  { value: 'oldest', label: t('vocabulary.sortOldest') },
                  { value: 'alpha', label: t('vocabulary.sortAlpha') },
                  { value: 'next_review', label: t('vocabulary.sortReview') },
                  { value: 'wrong', label: t('vocabulary.sortWrong') },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSortOrder(opt.value as any)
                      setIsSortOpen(false)
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-xs font-bold transition-colors cursor-pointer",
                      sortOrder === opt.value
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex overflow-x-auto pb-1.5 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:overflow-x-visible gap-1.5 scrollbar-none shrink-0 max-w-full">
          {hasActiveFilters && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
              <span className="whitespace-nowrap">
                {[
                  ...Array.from(filters.statuses).map((s) => t(statusLabelKeys[s])),
                  ...Array.from(filters.itemTypes).map((it) => t({
                    word: 'vocabulary.word',
                    phrase: 'vocabulary.phrase',
                    idiom: 'vocabulary.idiom',
                    sentence: 'vocabulary.sentence',
                  }[it])),
                  filters.noDeck ? t('vocabulary.filterNoDeck') : null,
                  filters.deckId ? deckService.getDeckPath(filters.deckId, decksQuery.data ?? []) : null,
                ].filter(Boolean).join(' · ')}
              </span>
            </div>
          )}
        </div>
      </div>
      {vocabularyQuery.isLoading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="neo-card p-5 bg-white border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-2xl animate-pulse space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="h-6 w-36 bg-slate-200 rounded-lg" />
                <div className="h-5 w-14 bg-purple-100 rounded-full" />
              </div>
              <div className="h-4 w-28 bg-purple-200/60 rounded-md" />
              <div className="h-4 w-3/4 bg-slate-100 rounded-md" />
            </div>
          ))}
        </div>
      ) : null}
      {vocabularyQuery.isError && cachedVocabulary.length === 0 ? (
        <Card className="text-center">
          <p className="text-xl font-black">{t('vocabulary.offlineTitle')}</p>
          <p className="mt-2 text-sm font-semibold text-muted-foreground">{t('vocabulary.offlineDescription')}</p>
        </Card>
      ) : null}
      {!vocabularyQuery.isLoading && !vocabularyQuery.isError && vocabulary.length === 0 && rawVocabulary.length === 0 && !debouncedSearch.trim() ? (
        <Card className="text-center">
          <p className="text-xl font-black">{t('vocabulary.emptyTitle')}</p>
          <p className="mt-2 text-sm font-semibold text-muted-foreground">{t('vocabulary.emptyDescription')}</p>
          {profile?.is_admin && <Button className="mt-4" onClick={() => setAddModalOpen(true)}>{t('vocabulary.add')}</Button>}
        </Card>
      ) : null}
      {!vocabularyQuery.isLoading && !vocabularyQuery.isError && vocabulary.length === 0 && debouncedSearch.trim() ? (
        <Card className="text-center">
          <p className="text-xl font-black">{t('vocabulary.notFoundTitle', { term: debouncedSearch.trim() })}</p>
          <p className="mt-2 text-sm font-semibold text-muted-foreground">{t('vocabulary.notFoundDescription')}</p>
          <div className="mt-4 flex flex-col items-center gap-2">
            <Button onClick={openQuickAdd}>{t('vocabulary.notFoundAdd')}</Button>
            <span className="text-xs text-muted-foreground font-semibold">{t('vocabulary.notFoundPressEnter')}</span>
          </div>
        </Card>
      ) : null}
      <div ref={containerRef} className="h-[calc(100vh-280px)] overflow-auto [scrollbar-gutter:stable] pr-2">
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const start = virtualRow.index * columns
            const rowItems = vocabulary.slice(start, start + columns)
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="grid gap-3 grid-cols-1 md:grid-cols-2 pb-3"
              >
                {rowItems.map((item) => (
                  <Card key={item.id} className={cn('neo-card p-4 sm:p-5 bg-white border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-2xl hover:translate-x-0.5 hover:translate-y-0.5 transition-all grid gap-3 md:grid-cols-[auto_1fr_auto] md:items-center border-l-6', statusBorderClasses[item.status])}>
                    {selectMode ? (
                      <input
                        key="check"
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="h-5 w-5 accent-slate-900 cursor-pointer"
                      />
                    ) : null}
                    <div key="body" className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link to={`/app/vocabulary/${item.id}`} state={{ vocabularyIds }} className="text-xl font-black text-slate-900 hover:text-purple-700 no-underline transition-colors">{item.source_text}</Link>
                        {item.flagged ? <Flag className="h-4 w-4 text-amber-500 fill-amber-400 shrink-0" /> : null}
                        <Badge className="bg-purple-100 text-purple-900 border border-slate-900 font-bold text-[11px]">{t(statusLabelKeys[item.status])}</Badge>
                        {item.part_of_speech
                          ? item.part_of_speech.split(', ').map((pos) => (
                              <Badge key={pos} className="bg-slate-100 text-slate-800 border border-slate-900 font-bold text-[11px]">{pos.trim()}</Badge>
                            ))
                          : null}
                        <button
                          type="button"
                          className="p-1.5 bg-[#fdc800] text-slate-900 border-2 border-slate-900 rounded-lg shadow-[2px_2px_0px_0px_#000] hover:bg-amber-300 transition-colors font-black flex items-center justify-center cursor-pointer ml-1"
                          onClick={() => speak(item.source_text, { audioUrl: item.audio_url, globalTermId: item.global_term_id })}
                          title="Phát âm"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {item.ipa && <p className="font-mono text-xs text-purple-700 font-bold">{item.ipa}</p>}
                      <div className="group relative">
                        <p className="font-semibold text-slate-600 text-xs sm:text-sm truncate">{item.meanings[0]?.text}</p>
                        {(item.meanings[0]?.text?.length ?? 0) > 50 ? (
                          <span className="absolute bottom-full left-0 mb-1 hidden group-hover:block border-2 border-slate-900 rounded-lg bg-amber-50 px-2 py-1 text-xs font-bold text-slate-900 whitespace-normal max-w-xs z-10 shadow-[2px_2px_0px_0px_#000] pointer-events-none">{item.meanings[0]?.text}</span>
                        ) : null}
                      </div>
                      {item.translation ? <p className="text-xs sm:text-sm text-emerald-700 font-black">{item.translation}</p> : null}
                      <div className="mt-1 flex flex-wrap gap-1">{item.tags.map((tag) => <Badge key={tag} className="bg-slate-100 text-slate-700 border border-slate-900 font-bold text-[10px]">#{tag}</Badge>)}</div>
                    </div>
                    <div key="actions" className="flex gap-2 ml-auto">
                      {selectMode ? null : (
                        <>
                          <Button asChild variant="secondary" className="neo-button text-xs font-black border-2 border-slate-900 shadow-[2px_2px_0px_0px_#000]"><Link to={`/app/vocabulary/${item.id}`} state={{ vocabularyIds }}>{t('vocabulary.view')}</Link></Button>
                          {profile?.is_admin && <Button variant="ghost" onClick={() => requestDeleteSingle(item.id, item.source_text)} className="text-rose-600 hover:text-rose-800 text-xs font-black">{t('vocabulary.delete')}</Button>}
                        </>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )
          })}
        </div>
      </div>
      <ConfirmModal
        open={lessonModalOpen}
        title={t('vocabulary.createLessonsTitle')}
        confirmLabel={t('vocabulary.confirmCreateLessons')}
        cancelLabel={t('actions.cancel')}
        variant="primary"
        confirmDisabled={!canCreateLessons || createLessonsMutation.isPending}
        onConfirm={() => createLessonsMutation.mutate()}
        onCancel={() => setLessonModalOpen(false)}
      >
        <Label htmlFor="words-per-lesson">{t('vocabulary.wordsPerLesson')}</Label>
        <Input
          id="words-per-lesson"
          className="mt-2"
          type="number"
          min={1}
          value={wordsPerLesson}
          onChange={(event) => setWordsPerLesson(event.target.value)}
        />
        {canCreateLessons ? (
          <p className="mt-3 font-black">{t('vocabulary.lessonProjection', { count: plannedLessons.length })}</p>
        ) : null}
        {createLessonsMutation.error instanceof Error ? (
          <p className="mt-3 text-sm font-black text-danger">
            {isSubscriptionLimitError(createLessonsMutation.error)
              ? `Bạn đã đạt giới hạn ${createLessonsMutation.error.limit} bộ thẻ của gói Free. Hãy nâng cấp Pro để tạo thêm.`
              : t('vocabulary.lessonCreateFailed')}
          </p>
        ) : null}
      </ConfirmModal>
      <ConfirmModal
        open={pendingDelete !== null}
        title={pendingDelete?.word ? t('vocabulary.deleteConfirmSingle', { word: pendingDelete.word }) : t('vocabulary.deleteConfirm', { count: pendingDelete?.ids.length ?? 0 })}
        confirmLabel={t('vocabulary.delete')}
        cancelLabel={t('actions.cancel')}
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
      <FilterModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onChange={setFilters}
        decks={(decksQuery.data ?? []).map((d) => ({ id: d.id, name: deckService.getDeckPath(d.id, decksQuery.data ?? []) }))}
      />
      {profile?.is_admin && <AddVocabularyModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />}
      <QuickAddVocabularyModal
        isOpen={quickAddModalOpen}
        onClose={() => {
          setQuickAddModalOpen(false)
          setQuickAddWord(null)
        }}
        initialWord={quickAddWord ?? undefined}
        onSuccess={() => {
          void queryClient.invalidateQueries({ queryKey: ['vocabulary', user?.id] })
          void useSubscriptionStore.getState().loadSubscription()
        }}
      />
    </>
  )
}
