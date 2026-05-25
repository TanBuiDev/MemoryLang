import { type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

const MAX_VISIBLE = 5

function parseChips(value: string): string[] {
  if (!value.trim()) return []
  return value.split(/[\/,;\n]+/).map((s) => s.trim()).filter(Boolean)
}

function joinChips(chips: string[]): string {
  return chips.join(' / ')
}

interface TranslationChipsProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function TranslationChips({ value, onChange, className }: TranslationChipsProps) {
  const [chips, setChips] = useState<string[]>(() => parseChips(value))
  const [draft, setDraft] = useState('')
  const [expanded, setExpanded] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const parsed = parseChips(value)
    const current = joinChips(chips)
    if (joinChips(parsed) !== current) {
      setChips(parsed)
      setExpanded(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function emit(updated: string[]) {
    setChips(updated)
    onChange(joinChips(updated))
  }

  function addChip() {
    const text = draft.trim()
    if (!text) return
    if (chips.includes(text)) {
      setDraft('')
      return
    }
    emit([...chips, text])
    setDraft('')
    textareaRef.current?.focus()
  }

  function removeChip(index: number) {
    emit(chips.filter((_, i) => i !== index))
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      addChip()
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        className="min-h-10 w-full rounded-[var(--radius)] border-2 border-border bg-card px-3 py-2 text-sm font-semibold text-foreground shadow-[2px_2px_0_var(--border)] placeholder:text-muted-foreground transition focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0_var(--border)]"
        rows={1}
      />
      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {(expanded ? chips : chips.slice(0, MAX_VISIBLE)).map((chip, index) => (
            <span
              key={`${chip}-${index}`}
              className="inline-flex items-center gap-1 rounded-md border-2 border-border bg-primary px-2.5 py-1 text-xs font-black text-primary-foreground shadow-[2px_2px_0_var(--border)]"
            >
              {chip}
              <button
                type="button"
                aria-label={`Remove ${chip}`}
                className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-sm text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                onClick={() => removeChip(index)}
              >
                <X size={12} />
              </button>
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
