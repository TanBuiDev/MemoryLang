import type { AccessTier } from '@/types/subscription.types'
import { Crown, Unlock } from 'lucide-react'

interface BulkActionBarProps {
  selectedCount: number
  onUpdateTier: (tier: AccessTier) => void
  onClearSelection: () => void
  isLoading?: boolean
}

export function BulkActionBar({
  selectedCount,
  onUpdateTier,
  onClearSelection,
  isLoading = false,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[calc(100%-2rem)]
        bg-white border-[3px] border-[#1c293c] shadow-[6px_6px_0_#1c293c] rounded-lg p-4
        flex flex-wrap items-center justify-between gap-3 animate-slide-up"
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#1c293c] text-white text-xs font-black">
          {selectedCount}
        </span>
        <span className="text-xs font-black text-[#1c293c]">
          mục đã chọn
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onUpdateTier('pro')}
          disabled={isLoading}
          className="neo-button min-h-0 px-3 py-1.5 rounded bg-[#fdc800] text-[#1c293c] text-xs font-black border-2 border-[#1c293c] shadow-[2px_2px_0_#1c293c] active:neo-button-active disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          <Crown size={14} />
          Chuyển Pro
        </button>
        <button
          onClick={() => onUpdateTier('free')}
          disabled={isLoading}
          className="neo-button min-h-0 px-3 py-1.5 rounded bg-[#dcfce7] text-[#166534] text-xs font-black border-2 border-[#1c293c] shadow-[2px_2px_0_#1c293c] active:neo-button-active disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          <Unlock size={14} />
          Chuyển Free
        </button>
        <button
          onClick={onClearSelection}
          disabled={isLoading}
          className="px-2.5 py-1.5 text-xs font-bold text-[#64748b] hover:text-[#1c293c] transition-colors"
        >
          Hủy chọn
        </button>
      </div>
    </div>
  )
}
