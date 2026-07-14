import { useState, useCallback } from 'react'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
import { FREE_LIMITS } from '@/types/subscription.types'
import { useNavigate } from 'react-router-dom'

interface UpgradePromptModalProps {
  /** Loại feature đang bị giới hạn */
  feature: 'terms' | 'decks'
  /** Modal có đang mở không */
  open: boolean
  /** Callback khi đóng modal */
  onClose: () => void
  /** Optional: action thay thế (ví dụ "Xóa từ cũ") */
  alternativeAction?: {
    label: string
    onClick: () => void
  }
}

export function UpgradePromptModal({
  feature,
  open,
  onClose,
  alternativeAction,
}: UpgradePromptModalProps) {
  const navigate = useNavigate()
  const termCount = useSubscriptionStore((s) => s.termCount)
  const deckCount = useSubscriptionStore((s) => s.deckCount)

  const config = {
    terms: {
      title: '🔒 Giới hạn từ vựng đã đạt',
      description: `Bạn đã dùng hết ${termCount}/${FREE_LIMITS.maxTerms} từ vựng.\nNâng cấp Pro để thêm không giới hạn!`,
      confirmText: 'Nâng cấp ngay — 49k/tháng',
    },
    decks: {
      title: '🔒 Giới hạn bộ thẻ đã đạt',
      description: `Bạn đã dùng hết ${deckCount}/${FREE_LIMITS.maxDecks} bộ thẻ.\nNâng cấp Pro để tạo không giới hạn!`,
      confirmText: 'Nâng cấp ngay — 49k/tháng',
    },
  }

  const { title, description, confirmText } = config[feature]

  const handleUpgrade = useCallback(() => {
    onClose()
    navigate('/app/upgrade')
  }, [navigate, onClose])

  return (
    <ConfirmModal
      open={open}
      title={title}
      description={description}
      confirmLabel={confirmText}
      cancelLabel={alternativeAction?.label || 'Đóng'}
      onConfirm={handleUpgrade}
      onCancel={alternativeAction?.onClick || onClose}
      variant="primary"
    />
  )
}

/**
 * Hook tiện ích để quản lý state mở/đóng UpgradePromptModal
 */
export function useUpgradePrompt() {
  const [promptFeature, setPromptFeature] = useState<'terms' | 'decks' | null>(
    null
  )

  const showPrompt = useCallback((feature: 'terms' | 'decks') => {
    setPromptFeature(feature)
  }, [])

  const hidePrompt = useCallback(() => {
    setPromptFeature(null)
  }, [])

  return { promptFeature, showPrompt, hidePrompt }
}
