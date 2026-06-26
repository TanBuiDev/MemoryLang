import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { AddVocabularyForm } from '@/components/vocabulary/AddVocabularyForm'
import { useI18n } from '@/i18n'
import { cn } from '@/utils/cn'

interface AddVocabularyModalProps {
  open: boolean
  onClose: () => void
}

export function AddVocabularyModal({ open, onClose }: AddVocabularyModalProps) {
  const { t } = useI18n()
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialogRef.current?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key !== 'Tab' || !dialogRef.current) return

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'))
      if (focusable.length === 0) {
        e.preventDefault()
        dialogRef.current.focus()
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
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('vocabulary.addTitle')}
        tabIndex={-1}
        className={cn(
          'neo-card relative z-10 w-full max-w-4xl mx-4 p-6',
          'bg-card text-card-foreground',
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black">{t('vocabulary.addTitle')}</h2>
          <Button variant="ghost" onClick={onClose} aria-label={t('actions.cancel')}>
            {t('actions.cancel')}
          </Button>
        </div>
        <AddVocabularyForm onSuccess={onClose} />
      </div>
    </div>
  )
}
