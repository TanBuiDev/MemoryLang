import { useState, useRef, useEffect } from 'react'
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
  fullWidth?: boolean
  disabled?: boolean
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
  fullWidth = true,
  disabled = false,
  renderCustomInput,
}: InlineEditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [newValue, setNewValue] = useState(value)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync external value prop to internal edit state
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
      setIsEditing(false)
      try {
        await onSave(trimmed)
      } catch {
        setNewValue(trimmed)
        setIsEditing(true)
      }
    } else {
      setIsEditing(false)
    }
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
      <div className={cn(fullWidth ? 'w-full' : 'w-fit', editClassName)} onKeyDown={handleKeyDown}>
        {type === 'input' && (
          <Input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onBlur={() => void handleSave()}
            placeholder={placeholder}
            size={newValue ? newValue.length + 1 : 4}
            className={cn(fullWidth ? "w-full" : "w-auto max-w-full", className)}
          />
        )}
        {type === 'textarea' && (
          <Textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onBlur={() => void handleSave()}
            placeholder={placeholder}
            className={cn("w-full", className)}
          />
        )}
        {type === 'select' && (
          <Select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onBlur={() => void handleSave()}
            className={cn("w-full", className)}
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
    )
  }

  const renderVal = displayValue || value || placeholder

  return (
    <div
      onClick={() => !disabled && setIsEditing(true)}
      className={cn(
        'group relative flex items-center justify-between rounded-md min-h-7 transition-all',
        !disabled ? 'cursor-pointer border-2 border-transparent hover:border-dashed hover:border-slate-400 hover:bg-slate-50/50 p-1 -m-1' : '',
        fullWidth ? 'w-full' : 'w-fit',
        !value && 'text-muted-foreground italic',
        className
      )}
    >
      <div className="flex-1 min-w-0 wrap-break-word">{renderVal}</div>
    </div>
  )
}
