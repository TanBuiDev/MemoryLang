import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface TagEditorProps {
  tags: string[]
  onChange: (tags: string[]) => void
}

export function TagEditor({ tags, onChange }: TagEditorProps) {
  const [input, setInput] = useState('')
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const addTag = () => {
    const trimmed = input.trim().toLowerCase()
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed])
    }
    setInput('')
  }

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
    if (e.key === 'Escape') {
      setEditing(false)
      setInput('')
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {tags.map((tag) => (
        <Badge key={tag} className="bg-card group flex items-center gap-0.5 pr-1">
          #{tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="ml-0.5 rounded-full hover:bg-destructive/20 p-0.5 opacity-60 hover:opacity-100 transition-opacity"
            aria-label={`Remove tag ${tag}`}
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}
      {editing ? (
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (!input) setEditing(false); else addTag() }}
          placeholder="Add tag..."
          className="text-xs px-2 py-1 border-2 border-border rounded bg-card min-w-[80px] max-w-[160px] outline-none focus:border-primary"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-muted-foreground hover:text-foreground border-2 border-dashed border-border rounded px-2 py-0.5 hover:border-primary transition-colors"
        >
          + tag
        </button>
      )}
    </div>
  )
}
