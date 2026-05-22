import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'

interface ConfirmModalProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  children?: ReactNode
  confirmDisabled?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  children,
  confirmDisabled,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div
        ref={dialogRef}
        className={cn(
          'neo-card relative z-10 w-full max-w-sm p-6',
          'bg-card text-card-foreground',
        )}
      >
        <h2 className="text-xl font-black">{title}</h2>
        {description ? <p className="mt-2 text-sm font-semibold text-muted-foreground">{description}</p> : null}
        {children ? <div className="mt-4">{children}</div> : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={variant} onClick={onConfirm} disabled={confirmDisabled}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}
