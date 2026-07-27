import { Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import type { InlineGapDraft, InlineGapDraftGap, InlineGapSegment } from '@/features/exam-content/inlineGapDraft'

interface InlineGapEditorProps {
  draft: InlineGapDraft
  onChange: (draft: InlineGapDraft) => void
  disabled?: boolean
}

function splitAnswers(value: string) {
  return value.split(/[,;\n]/).map((answer) => answer.trim()).filter(Boolean)
}

export function InlineGapEditor({ draft, onChange, disabled = false }: InlineGapEditorProps) {
  const [answerInputs, setAnswerInputs] = useState<Record<string, string>>(() => Object.fromEntries(
    draft.gaps.map((gap) => [gap.id, gap.acceptedAnswers.join(', ')]),
  ))
  useEffect(() => {
    setAnswerInputs((current) => {
      const next = { ...current }
      draft.gaps.forEach((gap) => {
        if (!(gap.id in next)) next[gap.id] = gap.acceptedAnswers.join(', ')
      })
      Object.keys(next).forEach((id) => {
        if (!draft.gaps.some((gap) => gap.id === id)) delete next[id]
      })
      return next
    })
  }, [draft.gaps])
  const updateSegments = (segments: InlineGapSegment[]) => onChange({ ...draft, segments })
  const updateGap = (gapId: string, patch: Partial<InlineGapDraftGap>) => {
    onChange({
      ...draft,
      gaps: draft.gaps.map((gap) => gap.id === gapId ? { ...gap, ...patch } : gap),
      segments: draft.segments.map((segment) => segment.type === 'gap' && segment.gapId === gapId
        ? { ...segment, label: patch.label ?? segment.label }
        : segment),
    })
  }
  const removeGap = (gapId: string) => {
    onChange({
      segments: draft.segments.filter((segment) => segment.type !== 'gap' || segment.gapId !== gapId),
      gaps: draft.gaps.filter((gap) => gap.id !== gapId),
    })
  }

  return (
    <section className="space-y-4" aria-label="Trình soạn đoạn văn có ô trống">
      <div>
        <h3 className="text-lg font-black">Đoạn văn có ô trống</h3>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">Mỗi ô trống là một thẻ riêng có nhãn và đáp án; bạn không cần gõ marker trong nội dung.</p>
      </div>
      <div className="space-y-2 rounded-[var(--radius)] border-2 border-border bg-muted/30 p-4">
        {draft.segments.map((segment, index) => {
          if (segment.type === 'gap') {
            const gap = draft.gaps.find((item) => item.id === segment.gapId)
            if (!gap) return null
            return (
              <div key={`${segment.gapId}-${index}`} className="neo-card grid gap-3 bg-card p-3 shadow-[2px_2px_0_var(--border)] md:grid-cols-[120px_minmax(0,1fr)_auto]">
                <div className="space-y-1">
                  <Label htmlFor={`gap-label-${gap.id}`}>Nhãn ô trống</Label>
                  <Input id={`gap-label-${gap.id}`} value={gap.label} disabled={disabled} onChange={(event) => updateGap(gap.id, { label: event.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`gap-answer-${gap.id}`}>Đáp án chấp nhận cho ô trống {gap.label}</Label>
                  <Input id={`gap-answer-${gap.id}`} value={answerInputs[gap.id] ?? gap.acceptedAnswers.join(', ')} disabled={disabled} placeholder="Ví dụ: football, soccer" onChange={(event) => {
                    setAnswerInputs((current) => ({ ...current, [gap.id]: event.target.value }))
                    updateGap(gap.id, { acceptedAnswers: splitAnswers(event.target.value) })
                  }} />
                </div>
                <Button type="button" variant="danger" disabled={disabled} onClick={() => removeGap(gap.id)} className="self-end px-3" aria-label={`Xóa ô trống ${gap.label}`}><Trash2 size={16} /></Button>
              </div>
            )
          }
          return (
            <div key={`text-${index}`} className="space-y-1">
              <Label htmlFor={`passage-text-${index}`}>Nội dung đoạn văn</Label>
              <Textarea id={`passage-text-${index}`} value={segment.value} disabled={disabled} onChange={(event) => updateSegments(draft.segments.map((current, currentIndex) => currentIndex === index ? { type: 'text', value: event.target.value } : current))} className="min-h-20" />
            </div>
          )
        })}
      </div>
      <p className="border-2 border-secondary/40 bg-secondary/10 px-3 py-2 text-sm font-semibold">Dùng nút “Thêm câu hỏi” phía trên để tạo một ô trống mới cùng bản ghi đáp án an toàn.</p>
    </section>
  )
}
