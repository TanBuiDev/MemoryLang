import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/i18n'

interface DeckOption {
  id: string
  name: string
  parentId: string | null
}

interface DeckFilterPickerProps {
  decks: DeckOption[]
  deckId: string | null
  noDeck: boolean
  onChange: (selection: { deckId: string | null; noDeck: boolean }) => void
}

const normalizeDeckSearch = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .toLocaleLowerCase()

export function DeckFilterPicker({ decks, deckId, noDeck, onChange }: DeckFilterPickerProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  const deckPaths = useMemo(() => {
    const byId = new Map(decks.map((deck) => [deck.id, deck]))
    return decks.map((deck) => {
      const names = [deck.name]
      let parentId = deck.parentId
      const visited = new Set([deck.id])
      while (parentId && !visited.has(parentId)) {
        visited.add(parentId)
        const parent = byId.get(parentId)
        if (!parent) break
        names.unshift(parent.name)
        parentId = parent.parentId
      }
      return { ...deck, path: names.join(' › '), depth: names.length - 1 }
    }).sort((a, b) => a.path.localeCompare(b.path, 'vi'))
  }, [decks])

  const selectedDeck = deckPaths.find((deck) => deck.id === deckId)
  const selectionLabel = noDeck
    ? t('vocabulary.filterNoDeck')
    : deckId ? selectedDeck?.path ?? t('vocabulary.unknownDeck') : t('vocabulary.allDecks')
  const visibleDecks = deckPaths.filter((deck) => normalizeDeckSearch(deck.path).includes(normalizeDeckSearch(query.trim())))

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        rootRef.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const choose = (next: { deckId: string | null; noDeck: boolean }) => {
    onChange(next)
    setOpen(false)
    setQuery('')
    rootRef.current?.querySelector('button')?.focus()
  }

  return (
    <div ref={rootRef} className="relative min-w-0 w-full sm:w-64">
      <Button
        type="button"
        variant={deckId || noDeck ? 'secondary' : 'ghost'}
        aria-label={`${t('vocabulary.deckFilter')}: ${selectionLabel}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="w-full min-w-0 justify-between gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <FolderOpen aria-hidden="true" className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-left">{t('vocabulary.deckFilter')}: {selectionLabel}</span>
        <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0" />
      </Button>
      {open && (
        <div
          role="dialog"
          aria-labelledby={titleId}
          className="absolute left-0 top-full z-50 mt-2 w-full min-w-64 rounded-xl border-2 border-border bg-card p-2 shadow-[4px_4px_0_var(--border)]"
        >
          <p id={titleId} className="px-2 pb-2 text-sm font-black">{t('vocabulary.chooseDeck')}</p>
          <Input
            type="search"
            name="deck-filter-search"
            autoComplete="off"
            aria-label={t('vocabulary.searchDecks')}
            placeholder={t('vocabulary.searchDecks')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="mb-2 focus-visible:outline-2 focus-visible:outline-primary"
          />
          <div className="max-h-64 space-y-1 overflow-y-auto overscroll-contain">
            <Button type="button" variant="ghost" aria-pressed={!deckId && !noDeck} onClick={() => choose({ deckId: null, noDeck: false })} className="w-full justify-between text-left focus-visible:outline-2 focus-visible:outline-primary">
              {t('vocabulary.allDecks')}
              {!deckId && !noDeck && <Check aria-hidden="true" className="h-4 w-4" />}
            </Button>
            <Button type="button" variant="ghost" aria-pressed={noDeck} onClick={() => choose({ deckId: null, noDeck: true })} className="w-full justify-between text-left focus-visible:outline-2 focus-visible:outline-primary">
              {t('vocabulary.filterNoDeck')}
              {noDeck && <Check aria-hidden="true" className="h-4 w-4" />}
            </Button>
            {visibleDecks.map((deck) => (
              <Button
                key={deck.id}
                type="button"
                variant="ghost"
                aria-label={deck.path}
                aria-pressed={deckId === deck.id}
                onClick={() => choose({ deckId: deck.id, noDeck: false })}
                className="w-full min-w-0 justify-between text-left focus-visible:outline-2 focus-visible:outline-primary"
              >
                <span className="min-w-0 truncate" style={{ paddingLeft: `${Math.min(deck.depth, 4) * 12}px` }}>{deck.name}</span>
                {deckId === deck.id && <Check aria-hidden="true" className="h-4 w-4 shrink-0" />}
              </Button>
            ))}
            {visibleDecks.length === 0 && <p className="px-2 py-3 text-sm font-semibold text-muted-foreground">{t('vocabulary.noDeckMatches')}</p>}
          </div>
          {selectedDeck && <p className="border-t border-border px-2 pt-2 text-xs font-semibold text-muted-foreground">{t('vocabulary.includesChildDecks')}</p>}
        </div>
      )}
    </div>
  )
}
