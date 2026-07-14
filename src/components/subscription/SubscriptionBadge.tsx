import { useSubscriptionStore } from '@/stores/useSubscriptionStore'

/**
 * Badge hiển thị subscription status trên Header.
 * Pro: vàng + crown | Free: xám + lock
 */
export function SubscriptionBadge() {
  const isPro = useSubscriptionStore((s) => s.isPro)

  if (isPro) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold
          rounded border-2 border-[#1c293c] bg-[#fdc800] text-[#1c293c]
          shadow-[2px_2px_0_#1c293c]"
      >
        👑 Pro
      </span>
    )
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium
        rounded border border-[#cbd5e1] bg-[#f1f5f9] text-[#64748b]"
    >
      Free
    </span>
  )
}
