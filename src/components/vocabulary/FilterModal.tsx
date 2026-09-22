import { useEffect, useId, useRef, useState } from 'react'
import { X, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import { useI18n } from '@/i18n'
import { Select } from '@/components/ui/select'
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
  noDeck: boolean
  deckId: string | null
}

interface FilterModalProps {
  open: boolean
  onClose: () => void
  filters: FilterState
  onChange: (filters: FilterState) => void
  decks: Array<{ id: string; name: string }>
}

export function FilterModal({ open, onClose, filters, onChange, decks }: FilterModalProps) {
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

  const hasActiveFilters = draftFilters.statuses.size > 0 || draftFilters.itemTypes.size > 0 || draftFilters.flagged || draftFilters.noDeck || draftFilters.deckId !== null

  const resetFilters = () => {
    setDraftFilters({
      statuses: new Set(),
      itemTypes: new Set(),
      flagged: false,
      noDeck: false,
      deckId: null,
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
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bộ lọc"
            className="flex h-8 w-8 items-center justify-center rounded-md border-2 border-border bg-card hover:bg-muted shadow-[2px_2px_0_var(--border)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_var(--border)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto px-5 py-4 space-y-5">
          {/* Status section */}
          <fieldset>
            <legend className="text-xs uppercase font-black text-muted-foreground mb-2.5">
              {t('vocabulary.status')}
            </legend>
            <div className="space-y-1.5">
              {STATUS_OPTIONS.map((status) => (
                <label
                  key={status}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md border-2 border-border px-3 py-2 cursor-pointer transition-all',
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
                  <span className="text-sm font-bold">{t(statusLabelKeys[status])}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Item type section */}
          <fieldset>
            <legend className="text-xs uppercase font-black text-muted-foreground mb-2.5">
              {t('vocabulary.itemType')}
            </legend>
            <div className="space-y-1.5">
              {ITEM_TYPE_OPTIONS.map((type) => (
                <label
                  key={type}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md border-2 border-border px-3 py-2 cursor-pointer transition-all',
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

          {/* Flagged & No Deck section */}
          <fieldset>
            <legend className="text-xs uppercase font-black text-muted-foreground mb-2.5">
              Khác
            </legend>
            <div className="space-y-1.5">
              <label
                className={cn(
                  'flex items-center gap-2.5 rounded-md border-2 border-border px-3 py-2 cursor-pointer transition-all',
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
              <label
                className={cn(
                  'flex items-center gap-2.5 rounded-md border-2 border-border px-3 py-2 cursor-pointer transition-all',
                  draftFilters.noDeck ? 'bg-primary/10 border-primary' : 'bg-card hover:bg-muted'
                )}
              >
                <input
                  type="checkbox"
                  checked={draftFilters.noDeck}
                  onChange={() => setDraftFilters({ ...draftFilters, noDeck: !draftFilters.noDeck, deckId: null })}
                  className="h-4 w-4 accent-primary rounded"
                />
                <span className="text-sm font-bold">{t('vocabulary.filterNoDeck')}</span>
              </label>
            </div>
          </fieldset>

          {/* Deck filter */}
          {decks.length > 0 && (
            <fieldset>
              <legend className="text-xs uppercase font-black text-muted-foreground mb-2.5">
                {t('decks.title')}
              </legend>
              <Select
                value={draftFilters.deckId ?? ''}
                onChange={(val) => setDraftFilters({ ...draftFilters, deckId: val || null, noDeck: false })}
                options={[
                  { value: '', label: t('vocabulary.allDecks') },
                  ...decks.map((deck) => ({ value: deck.id, label: deck.name }))
                ]}
                placeholder={t('vocabulary.allDecks')}
              />
            </fieldset>
          )}
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
            {t('vocabulary.apply')}
          </Button>
        </div>
      </div>
    </div>
  )
}
