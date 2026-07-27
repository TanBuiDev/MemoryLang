import { FileText, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import type { PracticePromptSample } from '@/types/exam.types'

export interface PromptSampleDraft {
  id: string | undefined
  title: string
  content: string
}

interface PromptSampleEditorProps {
  samples: PracticePromptSample[]
  onSave: (sample: PromptSampleDraft) => void
  onRequestDelete: (sample: PracticePromptSample) => void
  disabled?: boolean
}

const emptyDraft = (): PromptSampleDraft => ({ id: undefined, title: '', content: '' })

export function PromptSampleEditor({ samples, onSave, onRequestDelete, disabled = false }: PromptSampleEditorProps) {
  const [draft, setDraft] = useState<PromptSampleDraft>(emptyDraft)

  useEffect(() => {
    if (!draft.id) return
    const current = samples.find((sample) => sample.id === draft.id)
    if (!current) setDraft(emptyDraft())
  }, [draft.id, samples])

  const selectSample = (sample: PracticePromptSample) => {
    setDraft({ id: sample.id, title: sample.title, content: sample.content })
  }

  const canSave = draft.title.trim().length > 0 && draft.content.trim().length > 0

  return (
    <section className="space-y-4 border-t-2 border-border pt-5" aria-label="Quản lý bài mẫu">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-black"><FileText size={18} /> Bài mẫu để học viên so sánh</h3>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">Mỗi bài mẫu có tiêu đề riêng; học viên chọn bài phù hợp khi xem lại bài Writing hoặc Speaking.</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => setDraft(emptyDraft())} disabled={disabled}>
          <Plus size={16} /> Thêm bài mẫu
        </Button>
      </div>

      {samples.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Danh sách bài mẫu">
          {samples.map((sample) => (
            <Button
              key={sample.id}
              type="button"
              variant={draft.id === sample.id ? 'secondary' : 'ghost'}
              onClick={() => selectSample(sample)}
              disabled={disabled}
              className="min-h-9 px-3 text-xs"
            >
              {sample.title}
            </Button>
          ))}
        </div>
      )}

      <div className="grid gap-4 rounded-[var(--radius)] border-2 border-border bg-muted/30 p-4">
        <div className="space-y-1.5">
          <Label htmlFor="prompt-sample-title">Tên bài mẫu</Label>
          <Input
            id="prompt-sample-title"
            value={draft.title}
            disabled={disabled}
            placeholder="Ví dụ: Bài mẫu đơn xin việc"
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="prompt-sample-content">Nội dung bài mẫu</Label>
          <Textarea
            id="prompt-sample-content"
            value={draft.content}
            disabled={disabled}
            className="min-h-64"
            placeholder="Nhập bài mẫu mà học viên sẽ dùng để so sánh..."
            onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => onSave(draft)} disabled={disabled || !canSave}>
            <Save size={16} /> Lưu bài mẫu
          </Button>
          {draft.id && (
            <Button
              type="button"
              variant="danger"
              disabled={disabled}
              onClick={() => {
                const sample = samples.find((item) => item.id === draft.id)
                if (sample) onRequestDelete(sample)
              }}
            >
              <Trash2 size={16} /> Xóa bài mẫu
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
