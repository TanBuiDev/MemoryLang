import { ArrowLeft, Crown, Lock, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { TeaserConfig } from '@/types/subscription.types'

interface ContentLockStateProps {
  title?: string
  contentType: 'grammar' | 'listening'
  teaserConfig?: TeaserConfig
  backTo: '/app/grammar' | '/app/listening'
}

const TEASER_LABELS: Record<string, string> = {
  title_only: 'Chỉ hiển thị tiêu đề',
  audio_preview: 'Nghe thử 30 giây đầu',
  transcript_preview: 'Xem transcript đoạn đầu',
  theory_only: 'Xem phần lý thuyết',
  partial_exercise: 'Làm thử 2 câu hỏi đầu tiên',
}

export function ContentLockState({
  title,
  contentType,
  teaserConfig,
  backTo,
}: ContentLockStateProps) {
  const navigate = useNavigate()
  const teaserEnabled = teaserConfig?.enabled !== false
  const teaserType = teaserConfig?.type || 'title_only'
  const teaserLabel = TEASER_LABELS[teaserType] || 'Xem trước nội dung'
  const contentName = contentType === 'grammar' ? 'bài học ngữ pháp' : 'bài luyện nghe'

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center px-4 py-10">
      <Card className="w-full border-[3px] bg-white p-6 text-center shadow-[8px_8px_0_var(--border)]">
        <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-border bg-primary text-foreground shadow-[4px_4px_0_var(--border)]">
          <Lock size={28} />
        </div>

        <p className="mb-2 text-xs font-black uppercase tracking-normal text-muted-foreground">
          Nội dung Pro
        </p>
        <h1 className="text-2xl font-black text-foreground">
          {title || 'Bài học dành cho thành viên Pro'}
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm font-semibold text-muted-foreground">
          Nâng cấp Pro để truy cập toàn bộ {contentName}, bao gồm nội dung chi tiết và phần luyện tập đi kèm.
        </p>

        {teaserEnabled && (
          <div className="mx-auto mt-5 inline-flex max-w-full items-center gap-2 rounded-md border-2 border-dashed border-border bg-muted px-3 py-2 text-sm font-bold text-foreground">
            <Sparkles size={16} className="text-primary" />
            <span>{teaserLabel}</span>
          </div>
        )}

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={() => navigate('/app/upgrade')} className="justify-center">
            <span>Nâng cấp Pro</span>
            <Crown size={16} />
          </Button>
          <Button variant="ghost" onClick={() => navigate(backTo)} className="justify-center">
            <ArrowLeft size={16} />
            <span>Quay lại danh sách</span>
          </Button>
        </div>
      </Card>
    </div>
  )
}
