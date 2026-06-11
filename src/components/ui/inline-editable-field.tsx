import { useState, useRef, useEffect } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { Input, Textarea, Select } from '@/components/ui/input'
import { cn } from '@/utils/cn'

interface InlineEditableFieldProps {
  value: string
  onSave: (newValue: string) => void | Promise<void>
  type?: 'input' | 'textarea' | 'select' | 'custom'
  options?: { value: string; label: string }[]
  placeholder?: string
  displayValue?: React.ReactNode
  className?: string
  editClassName?: string
  renderCustomInput?: (
    value: string,
    onChange: (val: string) => void,
    save: () => void,
    cancel: () => void
  ) => React.ReactNode
}

export function InlineEditableField({
  value,
  onSave,
  type = 'input',
  options = [],
  placeholder = '',
  displayValue,
  className,
  editClassName,
  renderCustomInput,
}: InlineEditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [newValue, setNewValue] = useState(value)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null)

  useEffect(() => {
    setNewValue(value)
  }, [value])

  useEffect(() => {
    if (isEditing && type !== 'custom') {
      inputRef.current?.focus()
    }
  }, [isEditing, type])

  const handleSave = async () => {
    const trimmed = typeof newValue === 'string' ? newValue.trim() : newValue
    if (trimmed !== value) {
      await onSave(trimmed)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setNewValue(value)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type === 'input') {
      e.preventDefault()
      void handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    } else if ((e.ctrlKey || e.metaKey) && e.key === 's' && type === 'textarea') {
      e.preventDefault()
      void handleSave()
    }
  }

  if (isEditing) {
    return (
      <div className={cn('flex items-start gap-2 w-full', editClassName)} onKeyDown={handleKeyDown}>
        <div className="flex-1 w-full">
          {type === 'input' && (
            <Input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onBlur={(e) => {
                // Wait a tiny bit in case they clicked the save/cancel buttons
                const relatedTarget = e.relatedTarget as HTMLElement
                if (relatedTarget?.closest('.inline-edit-btn')) return
                void handleSave()
              }}
              placeholder={placeholder}
            />
          )}
          {type === 'textarea' && (
            <Textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onBlur={(e) => {
                const relatedTarget = e.relatedTarget as HTMLElement
                if (relatedTarget?.closest('.inline-edit-btn')) return
                void handleSave()
              }}
              placeholder={placeholder}
            />
          )}
          {type === 'select' && (
            <Select
              ref={inputRef as React.RefObject<HTMLSelectElement>}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onBlur={(e) => {
                const relatedTarget = e.relatedTarget as HTMLElement
                if (relatedTarget?.closest('.inline-edit-btn')) return
                void handleSave()
              }}
            >
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          )}
          {type === 'custom' && renderCustomInput && (
            renderCustomInput(newValue, setNewValue, handleSave, handleCancel)
          )}
        </div>
        {type !== 'custom' && (
          <div className="flex gap-1 shrink-0 mt-1.5">
            <button
              type="button"
              tabIndex={-1}
              className="inline-edit-btn p-1.5 rounded-md border-2 border-border bg-emerald-400 text-foreground hover:bg-emerald-500 shadow-[1px_1px_0_var(--border)] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none transition-all cursor-pointer"
              onMouseDown={(e) => {
                e.preventDefault()
                void handleSave()
              }}
            >
              <Check size={12} className="stroke-[3]" />
            </button>
            <button
              type="button"
              tabIndex={-1}
              className="inline-edit-btn p-1.5 rounded-md border-2 border-border bg-rose-400 text-foreground hover:bg-rose-500 shadow-[1px_1px_0_var(--border)] active:translate-x-[0.5px] active:translate-y-[0.5px] active:shadow-none transition-all cursor-pointer"
              onMouseDown={(e) => {
                e.preventDefault()
                handleCancel()
              }}
            >
              <X size={12} className="stroke-[3]" />
            </button>
          </div>
        )}
      </div>
    )
  }

  const renderVal = displayValue || value || placeholder

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={cn(
        'group relative flex items-center justify-between rounded-md cursor-pointer border-2 border-transparent hover:border-dashed hover:border-slate-400 hover:bg-slate-50/50 p-1 -m-1 transition-all w-full min-h-[1.75rem]',
        !value && 'text-muted-foreground italic',
        className
      )}
    >
      <div className="flex-1 pr-6">{renderVal}</div>
      <span className="absolute right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-foreground">
        <Pencil size={12} />
      </span>
    </div>
  )
}
