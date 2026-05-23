import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Volume2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input, Select } from '@/components/ui/input'
import { demoVocabulary } from '@/features/demo/demoData'
import { useI18n } from '@/i18n'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'
import type { VocabularyStatus } from '@/types/vocabulary.types'
import { speak } from '@/utils/audio'

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
  const queryClient = useQueryClient()
  const shouldUseRemoteData = isSupabaseConfigured && Boolean(user)
  const vocabularyQuery = useQuery({
    queryKey: ['vocabulary', user?.id],
    queryFn: () => vocabularyService.list(user!.id),
    enabled: shouldUseRemoteData,
  })
  const rawVocabulary = shouldUseRemoteData ? vocabularyQuery.data ?? [] : demoVocabulary
  const vocabulary = filterStatus === 'all' ? rawVocabulary : rawVocabulary.filter((item) => item.status === filterStatus)

  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [pendingDelete, setPendingDelete] = useState<{ ids: string[]; word?: string } | null>(null)
  const [filterStatus, setFilterStatus] = useState<VocabularyStatus | 'all'>('all')

  const deleteVocabulary = useMutation({
    mutationFn: (ids: string[]) => vocabularyService.removeMany(ids),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['vocabulary', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['statistics', user?.id] }),
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

  const headerActions = selectMode ? (
    <div className="flex gap-2">
      <Button variant="ghost" onClick={exitSelectMode}>{t('actions.cancel')}</Button>
      <span className="self-center text-sm font-bold">{t('vocabulary.selected', { count: selectedIds.size })}</span>
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
      {selectMode && vocabulary.length > 0 ? (
        <div className="mb-3">
          <Button variant="ghost" onClick={toggleSelectAll}>
            {selectedIds.size === vocabulary.length ? t('vocabulary.deselectAll') : t('vocabulary.selectAll')}
          </Button>
        </div>
      ) : null}
      <div className="mb-4 grid gap-3 md:grid-cols-[2fr_auto_1fr]">
        <Input placeholder={t('vocabulary.search')} />
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
        <Select defaultValue="created">
          <option value="created">{t('vocabulary.sortCreated')}</option>
          <option value="next_review">{t('vocabulary.sortReview')}</option>
          <option value="wrong">{t('vocabulary.sortWrong')}</option>
        </Select>
      </div>
      <div className="grid gap-3">
        {vocabularyQuery.isLoading ? <Card className="font-black">{t('vocabulary.loading')}</Card> : null}
        {vocabularyQuery.error ? <Card className="font-black text-danger">{vocabularyQuery.error.message}</Card> : null}
        {!vocabularyQuery.isLoading && vocabulary.length === 0 ? (
          <Card className="text-center">
            <p className="text-xl font-black">{t('vocabulary.emptyTitle')}</p>
            <p className="mt-2 text-sm font-semibold text-muted-foreground">{t('vocabulary.emptyDescription')}</p>
            <Button asChild className="mt-4"><Link to="/app/vocabulary/new">{t('vocabulary.add')}</Link></Button>
          </Card>
        ) : null}
        {vocabulary.map((item) => (
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
                  <Button variant="ghost" disabled={!shouldUseRemoteData} onClick={() => requestDeleteSingle(item.id, item.source_text)} className="text-danger">{t('vocabulary.delete')}</Button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>
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
