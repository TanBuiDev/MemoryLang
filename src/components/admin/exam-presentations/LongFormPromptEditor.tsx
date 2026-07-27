import { ClipboardPenLine, FileText } from 'lucide-react'
import { Label, Textarea } from '@/components/ui/input'

export interface LongFormPromptValue {
  prompt: string
  instructions: string
}

interface LongFormPromptEditorProps {
  value: LongFormPromptValue
  onChange: (value: LongFormPromptValue) => void
  speaking?: boolean
  disabled?: boolean
}

export function LongFormPromptEditor({ value, onChange, speaking = false, disabled = false }: LongFormPromptEditorProps) {
  return <section className="space-y-4" aria-label="Trình soạn đề tự luận">
    <div><h3 className="text-lg font-black">{speaking ? 'Đề chuẩn bị bài nói' : 'Đề bài Writing'}</h3><p className="mt-1 text-sm font-semibold text-muted-foreground">Nội dung này được hiển thị nguyên văn cho học viên và có thể gắn audio/TTS ở phần media.</p></div>
    <div className="space-y-1.5"><Label htmlFor="long-form-prompt"><FileText className="mr-1 inline" size={14} />Đề bài tự luận</Label><Textarea id="long-form-prompt" value={value.prompt} disabled={disabled} onChange={(event) => onChange({ ...value, prompt: event.target.value })} className="min-h-40" /></div>
    <div className="space-y-1.5"><Label htmlFor="long-form-instructions"><ClipboardPenLine className="mr-1 inline" size={14} />Hướng dẫn cho học viên</Label><Textarea id="long-form-instructions" value={value.instructions} disabled={disabled} onChange={(event) => onChange({ ...value, instructions: event.target.value })} className="min-h-28" /></div>
  </section>
}
