import type { ReactNode } from 'react'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
import type { AccessTier } from '@/types/subscription.types'
import { Crown, Unlock } from 'lucide-react'

interface ContentLockOverlayProps {
  /** Access tier của nội dung */
  accessTier: AccessTier
  /** Children (card content) */
  children: ReactNode
  /** Callback khi click vào nội dung bị khóa */
  onLockedClick?: () => void
}

/**
 * Wrap quanh card content trong danh sách Listening/Grammar topics.
 * - access_tier = 'free' → render bình thường
 * - access_tier = 'pro' + user Free → hiện overlay + "Mở khóa Pro"
 * - access_tier = 'pro' + user Pro → render bình thường
 */
export function ContentLockOverlay({
  accessTier,
  children,
  onLockedClick,
}: ContentLockOverlayProps) {
  const isPro = useSubscriptionStore((s) => s.isPro)

  // Nội dung free hoặc user đã Pro → hiển thị bình thường
  if (accessTier === 'free' || isPro) {
    return <>{children}</>
  }

  // Nội dung Pro + user Free → overlay
  return (
    <div
      className="relative cursor-pointer group"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onLockedClick?.()
      }}
    >
      {/* Content bị mờ nhẹ */}
      <div className="opacity-60 pointer-events-none select-none">
        {children}
      </div>

      {/* Crown badge */}
      <div
        className="absolute top-2 right-2 inline-flex items-center gap-1
          px-2 py-0.5 text-[10px] font-bold rounded
          border-2 border-[#1c293c] bg-[#fdc800] text-[#1c293c]
          shadow-[2px_2px_0_#1c293c]"
      >
        <Crown size={10} />
        <span>Pro</span>
      </div>

      {/* Hover overlay */}
      <div
        className="absolute inset-0 flex items-center justify-center
          opacity-0 group-hover:opacity-100 transition-opacity duration-200
          bg-[#1c293c]/10 rounded-lg"
      >
        <span
          className="neo-button bg-[#fdc800] text-[#1c293c] font-bold text-sm
            shadow-[3px_3px_0_#1c293c] flex items-center gap-1.5"
        >
          <Unlock size={14} />
          Mở khóa Pro
        </span>
      </div>
    </div>
  )
}
