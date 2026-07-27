import { Languages, Lightbulb, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'

export interface EditableTransformationQuestion {
  id: string
  prompt: string
  acceptedAnswers: string[]
  translation: string | null
  explanation: string | null
}

interface TransformationFields {
  original: string
  keyword: string
  prefix: string
  suffix: string
}

function parsePrompt(prompt: string): TransformationFields {
  const [first = '', second = ''] = prompt.split('\n').map((line) => line.trim())
  const keywordMatch = first.match(/\(([^)]+)\)\s*$/)
  const keyword = keywordMatch?.[1] ?? ''
  const original = keywordMatch ? first.replace(/\(([^)]+)\)\s*$/, '').trim() : first
  const [prefix = '', ...suffix] = second.split(/[\u2026]|\.{3,}|_{3,}/)
  return { original, keyword, prefix: prefix.trim(), suffix: suffix.join(' ').trim() }
}

function serializePrompt(fields: TransformationFields) {
  const first = `${fields.original.trim()}${fields.keyword.trim() ? ` (${fields.keyword.trim()})` : ''}`.trim()
  return `${first}\n${fields.prefix.trim()} _____${fields.suffix.trim() ? ` ${fields.suffix.trim()}` : ''}`.trim()
}

interface TransformationEditorProps {
  questions: EditableTransformationQuestion[]
  onChange: (questions: EditableTransformationQuestion[]) => void
  onRequestDeleteQuestion?: (question: EditableTransformationQuestion) => void
  disabled?: boolean
}

export function TransformationEditor({ questions, onChange, onRequestDeleteQuestion, disabled = false }: TransformationEditorProps) {
  const update = (question: EditableTransformationQuestion, patch: Partial<EditableTransformationQuestion>) => {
    onChange(questions.map((item) => item.id === question.id ? { ...item, ...patch } : item))
  }
  const updateField = (question: EditableTransformationQuestion, patch: Partial<TransformationFields>) => {
    const fields = { ...parsePrompt(question.prompt), ...patch }
    update(question, { prompt: serializePrompt(fields) })
  }
  return <section className="space-y-5" aria-label="Trình soạn viết lại câu">
    <div><h3 className="text-lg font-black">Viết lại câu với từ gợi ý</h3><p className="mt-1 text-sm font-semibold text-muted-foreground">Nhập các thành phần câu riêng biệt để khung trả lời học viên luôn đúng định dạng.</p></div>
    {questions.map((question, index) => {
      const fields = parsePrompt(question.prompt)
      return <article key={question.id} className="neo-card grid gap-3 bg-muted/30 p-4 shadow-[2px_2px_0_var(--border)] md:grid-cols-2">
        {onRequestDeleteQuestion && <div className="flex justify-end md:col-span-2"><Button type="button" variant="danger" disabled={disabled} onClick={() => onRequestDeleteQuestion(question)} aria-label={`Xóa câu ${index + 1}`} className="min-h-8 px-2 text-xs"><Trash2 size={14} /></Button></div>}
        <div className="space-y-1.5 md:col-span-2"><Label htmlFor={`original-${question.id}`}>Câu gốc câu {index + 1}</Label><Textarea id={`original-${question.id}`} value={fields.original} disabled={disabled} onChange={(event) => updateField(question, { original: event.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor={`keyword-${question.id}`}>Từ khóa câu {index + 1}</Label><Input id={`keyword-${question.id}`} value={fields.keyword} disabled={disabled} onChange={(event) => updateField(question, { keyword: event.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor={`answer-${question.id}`}>Đáp án chấp nhận</Label><Input id={`answer-${question.id}`} value={question.acceptedAnswers.join(', ')} disabled={disabled} onChange={(event) => update(question, { acceptedAnswers: event.target.value.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean) })} /></div>
        <div className="space-y-1.5"><Label htmlFor={`prefix-${question.id}`}>Phần trước ô trống</Label><Input id={`prefix-${question.id}`} value={fields.prefix} disabled={disabled} onChange={(event) => updateField(question, { prefix: event.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor={`suffix-${question.id}`}>Phần sau ô trống</Label><Input id={`suffix-${question.id}`} value={fields.suffix} disabled={disabled} onChange={(event) => updateField(question, { suffix: event.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor={`translation-${question.id}`}><Languages className="mr-1 inline" size={14} />Dịch nghĩa</Label><Textarea id={`translation-${question.id}`} value={question.translation ?? ''} disabled={disabled} onChange={(event) => update(question, { translation: event.target.value || null })} /></div>
        <div className="space-y-1.5"><Label htmlFor={`explanation-${question.id}`}><Lightbulb className="mr-1 inline" size={14} />Lời giải chi tiết</Label><Textarea id={`explanation-${question.id}`} value={question.explanation ?? ''} disabled={disabled} onChange={(event) => update(question, { explanation: event.target.value || null })} /></div>
      </article>
    })}
  </section>
}
