import type { AccessTier } from '@/types/subscription.types'
import { Crown, Unlock } from 'lucide-react'

interface AccessTierBadgeProps {
  tier: AccessTier
  onChange?: (newTier: AccessTier) => void
  disabled?: boolean
}

export function AccessTierBadge({
  tier = 'free',
  onChange,
  disabled = false,
}: AccessTierBadgeProps) {
  const isPro = tier === 'pro'

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (disabled || !onChange) return
    onChange(isPro ? 'free' : 'pro')
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || !onChange}
      className={`
        inline-flex items-center px-2 py-0.5 text-[10px] font-black uppercase rounded
        border-2 border-[#1c293c] transition-all select-none gap-1
        ${isPro
          ? 'bg-[#fdc800] text-[#1c293c] shadow-[2px_2px_0_#1c293c] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#1c293c]'
          : 'bg-[#dcfce7] text-[#166534] hover:bg-[#bbf7d0]'
        }
        ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
      `}
      title={onChange ? `Click để chuyển thành ${isPro ? 'Free' : 'Pro'}` : undefined}
    >
      {isPro ? (
        <>
          <Crown size={10} />
          <span>Pro</span>
        </>
      ) : (
        <>
          <Unlock size={10} />
          <span>Free</span>
        </>
      )}
    </button>
  )
}
