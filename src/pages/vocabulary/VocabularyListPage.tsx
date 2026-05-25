import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Volume2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input, Label, Select } from '@/components/ui/input'
import { buildLessonBatch } from '@/features/decks/bulkLessons'
import { demoVocabulary } from '@/features/demo/demoData'
import { useDebounce } from '@/hooks/useDebounce'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useI18n } from '@/i18n'
import { studyLocalDb } from '@/services/local/studyLocalDb'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { deckService } from '@/services/supabase/deck.service'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'
import type { Deck } from '@/types/deck.types'
import type { VocabularyItem, VocabularyStatus } from '@/types/vocabulary.types'
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

const statusFilterOptions: Array<VocabularyStatus | 'all'> = ['all', 'new', 'learning', 'familiar', 'memorized', 'difficult', 'need_review']

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
  const filterStatus = (searchParams.get('status') as VocabularyStatus | 'all') || 'all'
  const setFilterStatus = (value: VocabularyStatus | 'all') => {
    setSearchParams((prev) => {
      if (value === 'all') { prev.delete('status') } else { prev.set('status', value) }
      return prev
    })
  }
  const [searchText, setSearchText] = useState(searchParams.get('q') ?? '')
  const debouncedSearch = useDebounce(searchText, 300)
  useEffect(() => {
    searchParams.get('q') !== debouncedSearch && setSearchParams((prev) => {
      if (!debouncedSearch) { prev.delete('q') } else { prev.set('q', debouncedSearch) }
      return prev
    })
  }, [debouncedSearch, searchParams, setSearchParams])
  const sortOrder = (searchParams.get('sort') as 'created' | 'next_review' | 'wrong' | 'alpha') || 'created'
  const setSortOrder = (value: 'created' | 'next_review' | 'wrong' | 'alpha') => {
    setSearchParams((prev) => {
      if (value === 'created') { prev.delete('sort') } else { prev.set('sort', value) }
      return prev
    })
  }
  const rawVocabulary = filterActiveVocabulary(shouldUseRemoteData
    ? vocabularyQuery.data ?? cachedVocabulary
    : demoVocabulary)
  const vocabulary = useMemo(() => {
    const normalizedSearch = debouncedSearch.trim().toLowerCase()
    let filtered = filterStatus === 'all'
      ? rawVocabulary
      : rawVocabulary.filter((item) => item.status === filterStatus)
    if (normalizedSearch) {
      filtered = filtered.filter((item) =>
        item.source_text.toLowerCase().includes(normalizedSearch),
      )
    }
    const sorted = [...filtered]
    if (sortOrder === 'alpha') {
      sorted.sort((a, b) => a.source_text.localeCompare(b.source_text))
    } else if (sortOrder === 'next_review') {
      sorted.sort((a, b) => (a.next_review_at ?? '').localeCompare(b.next_review_at ?? ''))
    } else if (sortOrder === 'wrong') {
      sorted.sort((a, b) => (b.wrong_count ?? 0) - (a.wrong_count ?? 0))
    }
    return sorted
  }, [debouncedSearch, filterStatus, rawVocabulary, sortOrder])

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
        pronunciation_text: payload.pronunciation_text ?? undefined,
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
        pronunciation_text: payload.pronunciation_text ?? undefined,
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
  const columns = 2
  const rows = Math.ceil(vocabulary.length / columns)

  const virtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 180,
    overscan: 3,
  })

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
      await queryClient.invalidateQueries({ queryKey: ['decks', user?.id] })
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

  const headerActions = selectMode ? (
    <div className="flex gap-2">
      <Button variant="ghost" onClick={exitSelectMode}>{t('actions.cancel')}</Button>
      <span className="self-center text-sm font-bold">{t('vocabulary.selected', { count: selectedIds.size })}</span>
      <Button
        variant="secondary"
        disabled={selectedIds.size === 0 || !shouldUseRemoteData}
        onClick={() => {
          createLessonsMutation.reset()
          setLessonModalOpen(true)
        }}
      >
        {t('vocabulary.createLessons')}
      </Button>
      <Button variant="danger" disabled={selectedIds.size === 0} onClick={requestDeleteSelected}>{t('vocabulary.deleteSelected')}</Button>
    </div>
  ) : (
    <div className="flex gap-2">
      <Button variant="ghost" disabled={!shouldUseRemoteData} onClick={enterSelectMode}>{t('vocabulary.select')}</Button>
      <Button asChild><Link to="/app/vocabulary/new">{t('vocabulary.add')}</Link></Button>
    </div>
  )

  return (
    <>
      <PageHeader title={t('vocabulary.title')} description={t('vocabulary.description')} actions={headerActions} />
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
      <div className="mb-4 grid gap-3 md:grid-cols-[2fr_auto_1fr]">
        <Input placeholder={t('vocabulary.search')} value={searchText} onChange={(event) => setSearchText(event.target.value)} />
        <div className="flex flex-wrap gap-1">
          {statusFilterOptions.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(status)}
              className={[
                'neo-button min-h-10 rounded-md border-2 border-border px-3 py-2 text-sm font-black',
                filterStatus === status
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-foreground hover:bg-muted',
              ].join(' ')}
            >
              {status === 'all' ? t('vocabulary.filterAll') : t(statusLabelKeys[status])}
            </button>
          ))}
        </div>
        <Select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)}>
          <option value="created">{t('vocabulary.sortCreated')}</option>
          <option value="alpha">{t('vocabulary.sortAlpha')}</option>
          <option value="next_review">{t('vocabulary.sortReview')}</option>
          <option value="wrong">{t('vocabulary.sortWrong')}</option>
        </Select>
      </div>
      {vocabularyQuery.isLoading ? <Card className="font-black">{t('vocabulary.loading')}</Card> : null}
      {vocabularyQuery.isError && cachedVocabulary.length === 0 ? (
        <Card className="text-center">
          <p className="text-xl font-black">{t('vocabulary.offlineTitle')}</p>
          <p className="mt-2 text-sm font-semibold text-muted-foreground">{t('vocabulary.offlineDescription')}</p>
        </Card>
      ) : null}
      {!vocabularyQuery.isLoading && !vocabularyQuery.isError && vocabulary.length === 0 ? (
        <Card className="text-center">
          <p className="text-xl font-black">{t('vocabulary.emptyTitle')}</p>
          <p className="mt-2 text-sm font-semibold text-muted-foreground">{t('vocabulary.emptyDescription')}</p>
          <Button asChild className="mt-4"><Link to="/app/vocabulary/new">{t('vocabulary.add')}</Link></Button>
        </Card>
      ) : null}
      <div ref={containerRef} className="h-[calc(100vh-280px)] overflow-auto">
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
                  <Card key={item.id} className={`grid gap-3 md:grid-cols-[auto_1fr_auto] md:items-center border-l-4 ${statusBorderClasses[item.status]}`}>
                    {selectMode ? (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="h-5 w-5 accent-primary"
                      />
                    ) : null}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link to={`/app/vocabulary/${item.id}`} className="text-xl font-black underline">{item.source_text}</Link>
                        <Badge>{t(statusLabelKeys[item.status])}</Badge>
                        {item.part_of_speech ? <Badge className="bg-muted">{item.part_of_speech}</Badge> : null}
                        <Button variant="ghost" className="h-6 min-h-0 w-6 p-0" onClick={() => speak(item.source_text)}><Volume2 className="h-4 w-4" /></Button>
                      </div>
                      <p className="mt-1 font-mono text-sm">{item.ipa}</p>
                      <p className="font-semibold text-muted-foreground">{item.meanings[0]?.text}</p>
                      {item.translation ? <p className="text-sm text-primary font-bold">{item.translation}</p> : null}
                      <div className="mt-2 flex flex-wrap gap-1">{item.tags.map((tag) => <Badge key={tag} className="bg-card">#{tag}</Badge>)}</div>
                    </div>
                    <div className="flex gap-2 ml-auto">
                      {selectMode ? null : (
                        <>
                          <Button asChild variant="secondary"><Link to={`/app/vocabulary/${item.id}/edit`}>{t('vocabulary.edit')}</Link></Button>
                          <Button variant="ghost" onClick={() => requestDeleteSingle(item.id, item.source_text)} className="text-danger">{t('vocabulary.delete')}</Button>
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
          <p className="mt-3 text-sm font-black text-danger">{t('vocabulary.lessonCreateFailed')}</p>
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
    </>
  )
}
