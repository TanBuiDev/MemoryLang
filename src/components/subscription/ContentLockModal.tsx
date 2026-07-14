import { useNavigate } from 'react-router-dom'
import type { TeaserConfig } from '@/types/subscription.types'

interface ContentLockModalProps {
  /** Modal có đang mở không */
  open: boolean
  /** Tiêu đề bài học bị khóa */
  title: string
  /** Loại nội dung: listening hoặc grammar */
  contentType: 'listening' | 'grammar'
  /** Cấu hình teaser */
  teaserConfig?: TeaserConfig
  /** Callback khi đóng modal */
  onClose: () => void
}

const TEASER_LABELS: Record<string, string> = {
  title_only: 'Chỉ hiển thị tiêu đề',
  audio_preview: 'Nghe thử 30 giây đầu',
  transcript_preview: 'Xem transcript đoạn đầu',
  theory_only: 'Xem lý thuyết, khóa bài tập',
  partial_exercise: 'Làm thử 2 câu hỏi đầu',
}

export function ContentLockModal({
  open,
  title,
  contentType,
  teaserConfig,
  onClose,
}: ContentLockModalProps) {
  const navigate = useNavigate()

  if (!open) return null

  const teaserType = teaserConfig?.type || 'title_only'
  const teaserEnabled = teaserConfig?.enabled ?? true

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="neo-card max-w-md w-full p-6 bg-white border-[3px] border-[#1c293c]
            shadow-[8px_8px_0_#1c293c] rounded-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Lock icon */}
          <div className="text-center mb-4">
            <div
              className="inline-flex items-center justify-center w-16 h-16
                rounded-full bg-[#FFF9E5] border-[3px] border-[#1c293c]
                shadow-[3px_3px_0_#1c293c] text-3xl"
            >
              🔒
            </div>
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-[#1c293c] text-center mb-2">
            Bài học dành cho thành viên Pro
          </h3>

          {/* Lesson title */}
          <p className="text-sm text-[#64748b] text-center mb-4">
            "{title}"
          </p>

          {/* Teaser hint */}
          {teaserEnabled && teaserType !== 'title_only' && (
            <div
              className="mb-4 p-3 rounded-md border-2 border-dashed border-[#cbd5e1]
                bg-[#f8fafc] text-sm text-[#64748b] text-center"
            >
              <span className="text-[#fdc800]">✨</span>{' '}
              {TEASER_LABELS[teaserType] || 'Xem trước nội dung'}
            </div>
          )}

          {/* Description */}
          <p className="text-sm text-[#475569] text-center mb-6">
            Nâng cấp ngay để truy cập toàn bộ{' '}
            {contentType === 'listening'
              ? 'bài nghe và transcript'
              : 'bài tập ngữ pháp chuyên sâu'}
            , không giới hạn.
          </p>

          {/* CTA */}
          <div className="space-y-3">
            <button
              onClick={() => {
                onClose()
                navigate('/app/upgrade')
              }}
              className="neo-button neo-button-active w-full justify-center font-bold
                bg-[#fdc800] hover:bg-[#e6b800] text-[#1c293c]"
            >
              Nâng cấp Pro — 49k/tháng 👑
            </button>

            <button
              onClick={() => {
                onClose()
                navigate('/app/upgrade')
              }}
              className="w-full text-center text-sm text-[#432dd7] hover:underline
                cursor-pointer"
            >
              Xem tất cả quyền lợi Pro →
            </button>

            <button
              onClick={onClose}
              className="neo-button w-full justify-center text-sm"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
