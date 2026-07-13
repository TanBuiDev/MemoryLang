import { useEffect, useRef } from 'react'
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
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  if (!open) return null

  const toggleStatus = (status: VocabularyStatus) => {
    const next = new Set(filters.statuses)
    if (next.has(status)) next.delete(status)
    else next.add(status)
    onChange({ ...filters, statuses: next })
  }

  const toggleItemType = (type: VocabularyItemType) => {
    const next = new Set(filters.itemTypes)
    if (next.has(type)) next.delete(type)
    else next.add(type)
    onChange({ ...filters, itemTypes: next })
  }

  const hasActiveFilters = filters.statuses.size > 0 || filters.itemTypes.size > 0 || filters.flagged || filters.noDeck || filters.deckId !== null

  const resetFilters = () => {
    onChange({
      statuses: new Set(),
      itemTypes: new Set(),
      flagged: false,
      noDeck: false,
      deckId: null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
      <div
        ref={sheetRef}
        className="w-full max-w-lg animate-in slide-in-from-bottom duration-300 rounded-t-2xl border-x-2 border-t-2 border-border bg-background shadow-[0_-8px_30px_rgba(0,0,0,0.25)]"
      >
        <div className="flex items-center justify-between border-b-2 border-border px-5 py-3.5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-black">{t('vocabulary.filter')}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
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
                    filters.statuses.has(status)
                      ? 'bg-primary/10 border-primary'
                      : 'bg-card hover:bg-muted'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={filters.statuses.has(status)}
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
                    filters.itemTypes.has(type)
                      ? 'bg-primary/10 border-primary'
                      : 'bg-card hover:bg-muted'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={filters.itemTypes.has(type)}
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
                  filters.flagged ? 'bg-primary/10 border-primary' : 'bg-card hover:bg-muted'
                )}
              >
                <input
                  type="checkbox"
                  checked={filters.flagged}
                  onChange={() => onChange({ ...filters, flagged: !filters.flagged })}
                  className="h-4 w-4 accent-primary rounded"
                />
                <span className="text-sm font-bold">{t('vocabulary.filterFlagged')}</span>
              </label>
              <label
                className={cn(
                  'flex items-center gap-2.5 rounded-md border-2 border-border px-3 py-2 cursor-pointer transition-all',
                  filters.noDeck ? 'bg-primary/10 border-primary' : 'bg-card hover:bg-muted'
                )}
              >
                <input
                  type="checkbox"
                  checked={filters.noDeck}
                  onChange={() => onChange({ ...filters, noDeck: !filters.noDeck })}
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
                value={filters.deckId ?? ''}
                onChange={(val) => onChange({ ...filters, deckId: val || null })}
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
          <Button type="button" className="flex-1 text-sm" onClick={onClose}>
            {t('vocabulary.apply')}
          </Button>
        </div>
      </div>
    </div>
  )
}
