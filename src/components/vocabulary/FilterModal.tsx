import { useEffect, useId, useRef, useState } from 'react'
import { X, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import { useI18n } from '@/i18n'
import type { VocabularyItemType, VocabularyStatus } from '@/types/vocabulary.types'

const STATUS_OPTIONS: VocabularyStatus[] = ['new', 'learning', 'familiar', 'memorized', 'difficult', 'need_review']

const ITEM_TYPE_OPTIONS: VocabularyItemType[] = ['word', 'phrase', 'idiom', 'sentence']

const statusLabelKeys: Record<VocabularyStatus, string> = {
  new: 'vocabulary.statusNew',
  learning: 'vocabulary.statusLearning',
  familiar: 'vocabulary.statusFamiliar',
  memorized: 'vocabulary.statusMemorized',
  difficult: 'vocabulary.statusDifficult',
  need_review: 'vocabulary.statusNeedReview',
}

const itemTypeLabelKeys: Record<VocabularyItemType, string> = {
  word: 'vocabulary.word',
  phrase: 'vocabulary.phrase',
  idiom: 'vocabulary.idiom',
  sentence: 'vocabulary.sentence',
}

interface FilterState {
  statuses: Set<VocabularyStatus>
  itemTypes: Set<VocabularyItemType>
  flagged: boolean
  due: boolean
  noDeck: boolean
  deckId: string | null
}

interface FilterModalProps {
  open: boolean
  onClose: () => void
  filters: FilterState
  onChange: (filters: FilterState) => void
  getPreviewCount?: (filters: FilterState) => number | null
}

export function FilterModal({ open, onClose, filters, onChange, getPreviewCount }: FilterModalProps) {
  const { t } = useI18n()
  const sheetRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const [draftFilters, setDraftFilters] = useState<FilterState>(() => ({
    ...filters,
    statuses: new Set(filters.statuses),
    itemTypes: new Set(filters.itemTypes),
  }))

  useEffect(() => {
    if (!open) return
    setDraftFilters({
      ...filters,
      statuses: new Set(filters.statuses),
      itemTypes: new Set(filters.itemTypes),
    })
  }, [filters, open])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    sheetRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !sheetRef.current) return

      const focusable = Array.from(sheetRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'))
      if (focusable.length === 0) {
        e.preventDefault()
        sheetRef.current.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  const toggleStatus = (status: VocabularyStatus) => {
    const next = new Set(draftFilters.statuses)
    if (next.has(status)) next.delete(status)
    else next.add(status)
    setDraftFilters({ ...draftFilters, statuses: next })
  }

  const toggleItemType = (type: VocabularyItemType) => {
    const next = new Set(draftFilters.itemTypes)
    if (next.has(type)) next.delete(type)
    else next.add(type)
    setDraftFilters({ ...draftFilters, itemTypes: next })
  }

  const hasActiveFilters = draftFilters.statuses.size > 0 || draftFilters.itemTypes.size > 0 || draftFilters.flagged
  const previewCount = getPreviewCount?.(draftFilters)

  const resetFilters = () => {
    setDraftFilters({
      statuses: new Set(),
      itemTypes: new Set(),
      flagged: false,
      due: draftFilters.due,
      noDeck: draftFilters.noDeck,
      deckId: draftFilters.deckId,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overscroll-contain bg-black/40 backdrop-blur-sm">
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-lg animate-in slide-in-from-bottom duration-300 rounded-t-2xl border-x-2 border-t-2 border-border bg-background shadow-[0_-8px_30px_rgba(0,0,0,0.25)]"
      >
        <div className="flex items-center justify-between border-b-2 border-border px-5 py-3.5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
            <h2 id={titleId} className="text-lg font-black">{t('vocabulary.filter')}</h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            aria-label={t('vocabulary.closeFilters')}
            className="h-10 w-10 px-0"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>

        <div className="max-h-[65vh] space-y-5 overflow-y-auto overscroll-contain px-5 py-4">
          {/* Status section */}
          <fieldset>
            <legend className="text-xs uppercase font-black text-muted-foreground mb-2.5">
              {t('vocabulary.status')}
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {STATUS_OPTIONS.map((status) => (
                <label
                  key={status}
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md border-2 border-border px-3 py-2 transition-colors',
                    draftFilters.statuses.has(status)
                      ? 'bg-primary/10 border-primary'
                      : 'bg-card hover:bg-muted'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={draftFilters.statuses.has(status)}
                    onChange={() => toggleStatus(status)}
                    className="h-4 w-4 accent-primary rounded"
                  />
                  <span className="text-sm font-bold">{status === 'need_review' ? t('vocabulary.statusNeedReviewFilter') : t(statusLabelKeys[status])}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Item type section */}
          <fieldset>
            <legend className="text-xs uppercase font-black text-muted-foreground mb-2.5">
              {t('vocabulary.itemType')}
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {ITEM_TYPE_OPTIONS.map((type) => (
                <label
                  key={type}
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md border-2 border-border px-3 py-2 transition-colors',
                    draftFilters.itemTypes.has(type)
                      ? 'bg-primary/10 border-primary'
                      : 'bg-card hover:bg-muted'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={draftFilters.itemTypes.has(type)}
                    onChange={() => toggleItemType(type)}
                    className="h-4 w-4 accent-primary rounded"
                  />
                  <span className="text-sm font-bold">{t(itemTypeLabelKeys[type])}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Other learner conditions */}
          <fieldset>
            <legend className="text-xs uppercase font-black text-muted-foreground mb-2.5">
              {t('vocabulary.otherFilters')}
            </legend>
            <div className="space-y-1.5">
              <label
                className={cn(
                  'flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md border-2 border-border px-3 py-2 transition-colors',
                  draftFilters.flagged ? 'bg-primary/10 border-primary' : 'bg-card hover:bg-muted'
                )}
              >
                <input
                  type="checkbox"
                  checked={draftFilters.flagged}
                  onChange={() => setDraftFilters({ ...draftFilters, flagged: !draftFilters.flagged })}
                  className="h-4 w-4 accent-primary rounded"
                />
                <span className="text-sm font-bold">{t('vocabulary.filterFlagged')}</span>
              </label>
            </div>
          </fieldset>
        </div>

        {/* Bottom actions */}
        <div className="flex items-center gap-2.5 border-t-2 border-border px-5 py-3.5">
          {hasActiveFilters && (
            <Button type="button" variant="ghost" className="text-xs" onClick={resetFilters}>
              {t('vocabulary.reset')}
            </Button>
          )}
          <Button
            type="button"
            className="flex-1 text-sm"
            onClick={() => {
              onChange(draftFilters)
              onClose()
            }}
          >
            {previewCount == null
              ? t('vocabulary.applyFilters')
              : t('vocabulary.viewWords', { count: previewCount })}
          </Button>
        </div>
      </div>
    </div>
  )
}
