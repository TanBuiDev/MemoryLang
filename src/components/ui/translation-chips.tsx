import { type KeyboardEvent, useCallback, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

const MAX_VISIBLE = 5
const LONG_PRESS_MS = 500

export function splitTranslation(value: string): string[] {
  const result: string[] = []
  let current = ''
  let depth = 0
  
  for (let i = 0; i < value.length; i++) {
    const char = value[i]
    if (char === '(') {
      depth++
      current += char
    } else if (char === ')') {
      depth = Math.max(0, depth - 1)
      current += char
    } else if (depth === 0 && (char === '/' || char === ';' || char === ',' || char === '|' || char === '\n')) {
      const trimmed = current.trim()
      if (trimmed) {
        result.push(trimmed)
      }
      current = ''
    } else {
      current += char
    }
  }
  
  const trimmed = current.trim()
  if (trimmed) {
    result.push(trimmed)
  }
  
  return result
}

export function parseTranslationValue(value: string): { chips: string[]; draft: string } {
  if (!value.trim()) return { chips: [], draft: '' }
  
  const parts = value.split(' | ')
  const chipsPart = parts[0] || ''
  const draftPart = parts[1] || ''
  
  const chips = splitTranslation(chipsPart)
    
  return { chips, draft: draftPart }
}

export function cleanTranslationValue(value: string): string {
  if (!value.trim()) return ''
  const parts = value.split(' | ')
  const chipsPart = parts[0] || ''
  const chips = splitTranslation(chipsPart)
  return chips.join(' / ')
}

interface TranslationChipsProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function TranslationChips({ value, onChange, className }: TranslationChipsProps) {
  const { chips, draft } = parseTranslationValue(value)
  const [expanded, setExpanded] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chipsRef = useRef(chips)
  chipsRef.current = chips

  function emit(updatedChips: string[], updatedDraft: string) {
    const chipsStr = updatedChips.join(' / ')
    const combined = chipsStr + (updatedDraft !== undefined ? ' | ' + updatedDraft : '')
    onChange(combined)
  }

  function fillChipToTextarea(chipText: string, index: number) {
    emit(chipsRef.current, chipText)
    setHighlightedIndex(index)
    textareaRef.current?.focus()
  }

  const handlePointerDown = useCallback((chipText: string, index: number) => {
    longPressTimerRef.current = setTimeout(() => {
      fillChipToTextarea(chipText, index)
    }, LONG_PRESS_MS)
  }, [])

  const handlePointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  const handlePointerLeave = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  function addChip() {
    const text = draft.trim()
    let updatedChips = [...chips]

    if (highlightedIndex !== null && highlightedIndex >= 0 && highlightedIndex < chips.length) {
      if (!text) {
        // Delete the chip if cleared
        updatedChips = updatedChips.filter((_, i) => i !== highlightedIndex)
      } else {
        // Replace the chip being edited
        updatedChips[highlightedIndex] = text
      }
    } else {
      // Normal append behavior
      if (!text) return
      if (chips.includes(text)) {
        emit(chips, '')
        return
      }
      updatedChips.push(text)
    }

    emit(updatedChips, '')
    setHighlightedIndex(null)
    textareaRef.current?.focus()
  }

  function removeChip(index: number) {
    const updated = chips.filter((_, i) => i !== index)
    const isEditingCurrent = highlightedIndex === index
    const nextDraft = isEditingCurrent ? '' : draft
    emit(updated, nextDraft)
    
    if (isEditingCurrent) {
      setHighlightedIndex(null)
    } else if (highlightedIndex !== null && index < highlightedIndex) {
      setHighlightedIndex(highlightedIndex - 1)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      addChip()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setHighlightedIndex(null)
      emit(chips, '')
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(event) => emit(chips, event.target.value)}
        onKeyDown={handleKeyDown}
        className="min-h-10 w-full rounded-[var(--radius)] border-2 border-border bg-card px-3 py-2 text-sm font-semibold text-foreground shadow-[2px_2px_0_var(--border)] placeholder:text-muted-foreground transition focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0_var(--border)]"
        rows={1}
        placeholder="Bản dịch..."
      />
      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {(expanded ? chips : chips.slice(0, MAX_VISIBLE)).map((chip, index) => (
            <span
              key={`${chip}-${index}`}
              onPointerDown={() => handlePointerDown(chip, index)}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerLeave}
              className={cn(
                'inline-flex items-center gap-1 rounded-md border-2 px-2.5 py-1 text-xs font-black shadow-[2px_2px_0_var(--border)] select-none touch-none',
                highlightedIndex === index
                  ? 'border-emerald-500 bg-emerald-100 text-emerald-800'
                  : 'border-border bg-primary text-primary-foreground'
              )}
            >
              <button
                type="button"
                aria-label={`Remove ${chip}`}
                className="inline-flex h-4 w-4 items-center justify-center rounded-sm text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  removeChip(index)
                }}
              >
                <X size={12} />
              </button>
              {chip}
            </span>
          ))}
          {!expanded && chips.length > MAX_VISIBLE ? (
            <button
              type="button"
              className="inline-flex items-center rounded-md border-2 border-border bg-secondary px-2 py-1 text-xs font-black text-secondary-foreground shadow-[1px_1px_0_var(--border)] hover:bg-secondary/80"
              onClick={() => setExpanded(true)}
            >
              +{chips.length - MAX_VISIBLE} more
            </button>
          ) : null}
          {expanded && chips.length > MAX_VISIBLE ? (
            <button
              type="button"
              className="text-xs font-bold text-muted-foreground hover:text-foreground"
              onClick={() => setExpanded(false)}
            >
              Show less
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
