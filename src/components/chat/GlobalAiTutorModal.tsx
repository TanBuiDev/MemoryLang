import { useEffect } from 'react'
import { AiTutorModal } from '@/components/chat/AiTutorModal'
import { useChatStore } from '@/stores/useChatStore'

export function GlobalAiTutorModal() {
  const isAiModalOpen = useChatStore((s) => s.isAiModalOpen)
  const toggleAiModal = useChatStore((s) => s.toggleAiModal)

  useEffect(() => {
    function handleGlobalKeyDown(e: globalThis.KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        toggleAiModal()
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [toggleAiModal])

  if (!isAiModalOpen) return null

  return <AiTutorModal />
}
