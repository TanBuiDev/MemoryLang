import type { ReactNode } from 'react'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
import {
  UpgradePromptModal,
  useUpgradePrompt,
} from '@/components/subscription/UpgradePromptModal'

interface ProFeatureGateProps {
  /** Loại feature đang giới hạn */
  feature: 'terms' | 'decks'
  /** Children sẽ được render bình thường nếu user có quyền */
  children: ReactNode
  /** Render thay thế khi bị giới hạn (optional, mặc định render children + modal) */
  fallback?: ReactNode
}

/**
 * Gate component cho vocabulary/deck limits.
 *
 * Cách dùng:
 * ```tsx
 * <ProFeatureGate feature="terms">
 *   <button onClick={handleAddVocabulary}>Thêm từ vựng</button>
 * </ProFeatureGate>
 * ```
 *
 * Hành vi:
 * - User Pro → render children bình thường
 * - User Free chưa chạm limit → render children bình thường
 * - User Free đã chạm limit → intercept click, mở UpgradePromptModal
 */
export function ProFeatureGate({
  feature,
  children,
  fallback,
}: ProFeatureGateProps) {
  const canAddTerm = useSubscriptionStore((s) => s.canAddTerm)
  const canAddDeck = useSubscriptionStore((s) => s.canAddDeck)
  const { promptFeature, showPrompt, hidePrompt } = useUpgradePrompt()

  const canProceed =
    feature === 'terms' ? canAddTerm : canAddDeck

  // User có quyền → render bình thường
  if (canProceed) {
    return <>{children}</>
  }

  // User Free + chạm limit → intercept
  if (fallback) {
    return (
      <>
        {fallback}
        <UpgradePromptModal
          feature={feature}
          open={promptFeature === feature}
          onClose={hidePrompt}
        />
      </>
    )
  }

  return (
    <>
      <div
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          showPrompt(feature)
        }}
      >
        {children}
      </div>
      <UpgradePromptModal
        feature={feature}
        open={promptFeature === feature}
        onClose={hidePrompt}
      />
    </>
  )
}
