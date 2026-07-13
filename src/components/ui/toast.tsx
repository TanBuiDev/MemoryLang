import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Bell, CheckCircle, Info, X, XCircle } from 'lucide-react'
import { cn } from '@/utils/cn'

export type ToastType = 'info' | 'success' | 'warning' | 'error'

interface ToastItem {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

// Tránh circular dependency — dùng event emitter đơn giản
type ToastListener = (toast: ToastItem) => void
const listeners: Set<ToastListener> = new Set()

let toastIdCounter = 0

/**
 * Hàm global để hiển thị toast từ bất kỳ đâu trong app.
 */
export function showToast(options: Omit<ToastItem, 'id'>) {
  const toast: ToastItem = { ...options, id: `toast-${++toastIdCounter}` }
  listeners.forEach((fn) => fn(toast))
}

const iconMap: Record<ToastType, typeof Info> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
}

const accentMap: Record<ToastType, string> = {
  info: 'border-blue-400 bg-blue-50',
  success: 'border-emerald-400 bg-emerald-50',
  warning: 'border-amber-400 bg-amber-50',
  error: 'border-rose-400 bg-rose-50',
}

const iconColorMap: Record<ToastType, string> = {
  info: 'text-blue-600',
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  error: 'text-rose-600',
}

function SingleToast({
  toast,
  onDismiss,
}: {
  toast: ToastItem
  onDismiss: (id: string) => void
}) {
  const [isExiting, setIsExiting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)
  const Icon = iconMap[toast.type]

  const dismiss = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => onDismiss(toast.id), 200)
  }, [onDismiss, toast.id])

  useEffect(() => {
    const duration = toast.duration ?? 5000
    if (duration > 0) {
      timerRef.current = setTimeout(dismiss, duration)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [dismiss, toast.duration])

  return (
    <div
      className={cn(
        'w-80 max-w-[calc(100vw-2rem)] border-3 border-border rounded-lg shadow-[4px_4px_0px_#000] p-3 flex gap-3 items-start transition-all duration-200',
        accentMap[toast.type],
        isExiting ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0',
      )}
      role="alert"
    >
      <div
        className={cn(
          'h-8 w-8 shrink-0 rounded-full border-2 border-border flex items-center justify-center',
          iconColorMap[toast.type],
        )}
      >
        <Icon size={16} className="stroke-[2.5]" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-foreground leading-tight">{toast.title}</p>
        {toast.message && (
          <p className="text-xs font-semibold text-muted-foreground mt-0.5 leading-snug line-clamp-2">
            {toast.message}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 p-0.5 rounded hover:bg-black/10 transition"
      >
        <X size={14} className="text-muted-foreground" />
      </button>
    </div>
  )
}

/**
 * Toast container — đặt một lần ở root level của app.
 * Render portal vào body để luôn nằm trên cùng.
 */
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    const listener: ToastListener = (toast) => {
      setToasts((prev) => [...prev.slice(-4), toast]) // Giới hạn 5 toast
    }
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  const handleDismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  if (toasts.length === 0) return null

  return createPortal(
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto animate-[toast-slide-in_0.2s_ease-out]">
          <SingleToast toast={toast} onDismiss={handleDismiss} />
        </div>
      ))}
    </div>,
    document.body,
  )
}

// Re-export Bell icon for notification-related usage
export { Bell }
