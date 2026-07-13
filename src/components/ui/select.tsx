import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Check } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
  id?: string
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Chọn một tùy chọn...',
  className,
  disabled = false,
  id
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSelect = (val: string) => {
    onChange(val)
    setIsOpen(false)
  }

  return (
    <div 
      ref={containerRef} 
      className={cn("relative w-full select-none", className)}
    >
      {/* Hidden native select for accessibility and testing */}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="sr-only"
        tabIndex={-1}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between text-sm font-bold px-3 py-2 border-2 border-border rounded bg-card hover:bg-muted/10 transition-all text-left",
          "shadow-[2px_2px_0px_#1c293c] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#1c293c] active:translate-y-0.5 active:shadow-none",
          isOpen && "bg-white rounded-b-none border-b-0 shadow-none translate-y-0 hover:translate-y-0 hover:shadow-none",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none shadow-none translate-y-0"
        )}
      >
        <span className={cn(!selectedOption && "text-muted-foreground/60")}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Options List Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full bg-background border-2 border-t-0 border-border rounded-b shadow-[3px_3px_0px_#1c293c] z-[99999] max-h-60 overflow-y-auto animate-in fade-in duration-150">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground font-semibold text-center bg-card">
              Không có tùy chọn nào
            </div>
          ) : (
            options.map((opt) => {
              const isSelected = opt.value === value
              return (
                <div
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    "px-3 py-2 text-xs font-bold text-foreground cursor-pointer transition-all hover:bg-primary/20 flex items-center justify-between border-b border-border last:border-b-0",
                    isSelected && "bg-primary/15 font-black"
                  )}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3px] text-primary" />}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
