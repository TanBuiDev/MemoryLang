import { CheckCircle2, Languages, Lightbulb, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { IMAGE_CROP_OPTIONS } from '@/features/exam-content/imagePresentation'
import type { AdminExamContentQuestion } from '@/services/supabase/adminExamContent.service'

export interface AdminChoiceOption {
  key: string
  text: string
  is_correct: boolean
}

export interface EditableChoiceQuestion extends Omit<AdminExamContentQuestion, 'options'> {
  options: AdminChoiceOption[]
}

interface ChoiceListEditorProps {
  questions: EditableChoiceQuestion[]
  onChange: (questions: EditableChoiceQuestion[]) => void
  onRequestDeleteQuestion?: (question: EditableChoiceQuestion) => void
  imageChoice?: boolean
  onUploadImage?: (question: EditableChoiceQuestion, file: File) => void
  disabled?: boolean
}

export function ChoiceListEditor({ questions, onChange, onRequestDeleteQuestion, imageChoice = false, onUploadImage, disabled = false }: ChoiceListEditorProps) {
  const updateQuestion = (questionId: string, patch: Partial<EditableChoiceQuestion>) => {
    onChange(questions.map((question) => question.id === questionId ? { ...question, ...patch } : question))
  }

  return (
    <section className="space-y-5" aria-label="Trình soạn câu hỏi trắc nghiệm">
      <div>
        <h3 className="text-lg font-black">Câu hỏi, đáp án và lời giải</h3>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">Chọn trực tiếp đáp án đúng cho từng câu; học viên sẽ không nhìn thấy thông tin này trước khi nộp bài.</p>
      </div>
      {questions.map((question, questionIndex) => (
        <article key={question.id} className="neo-card space-y-4 bg-muted/30 p-4 shadow-[2px_2px_0_var(--border)]">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-black">Câu {question.source_number ?? questionIndex + 1}</h4>
            <div className="flex items-center gap-2">
              <span className="border border-border bg-background px-2 py-0.5 text-[11px] font-black">{question.source_key}</span>
              {onRequestDeleteQuestion && <Button type="button" variant="danger" disabled={disabled} onClick={() => onRequestDeleteQuestion(question)} aria-label={`Xóa câu ${question.source_number ?? questionIndex + 1}`} className="min-h-8 px-2 text-xs"><Trash2 size={14} /></Button>}
            </div>
          </div>
          {imageChoice && <div className="grid gap-3 border-2 border-border bg-background p-3 sm:grid-cols-[12rem_1fr]">
            {question.image_url ? <img src={question.image_url} alt={typeof question.metadata?.image_alt === 'string' ? question.metadata.image_alt : `Hình minh họa câu ${questionIndex + 1}`} className="aspect-square w-full object-contain" /> : <div className="flex aspect-square items-center justify-center bg-muted text-xs font-bold">Chưa có ảnh</div>}
            <div className="space-y-3">
              <div><Label htmlFor={`image-${question.id}`}>Tải ảnh minh họa câu {questionIndex + 1}</Label><Input id={`image-${question.id}`} type="file" accept="image/*" disabled={disabled} className="mt-1" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUploadImage?.(question, file) }} /></div>
              <div><Label htmlFor={`image-alt-${question.id}`}>Mô tả ảnh câu {questionIndex + 1}</Label><Input id={`image-alt-${question.id}`} value={typeof question.metadata?.image_alt === 'string' ? question.metadata.image_alt : ''} disabled={disabled} onChange={(event) => updateQuestion(question.id, { metadata: { ...question.metadata, image_alt: event.target.value } })} placeholder="Ví dụ: Biển cấm đỗ xe" /></div>
              <div><Label htmlFor={`image-crop-${question.id}`}>Hiển thị ảnh câu {questionIndex + 1}</Label><Select id={`image-crop-${question.id}`} value={typeof question.metadata?.image_crop === 'string' ? question.metadata.image_crop : 'contain'} onChange={(imageCrop) => updateQuestion(question.id, { metadata: { ...question.metadata, image_crop: imageCrop } })} options={[...IMAGE_CROP_OPTIONS]} disabled={disabled} className="mt-1" /></div>
            </div>
          </div>}
          <div className="space-y-1.5">
            <Label htmlFor={`prompt-${question.id}`}>Nội dung câu hỏi</Label>
            <Textarea
              id={`prompt-${question.id}`}
              value={question.prompt}
              disabled={disabled}
              onChange={(event) => updateQuestion(question.id, { prompt: event.target.value })}
              className="min-h-20"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {question.options.map((option) => (
              <div key={option.key} className={`flex items-center gap-2 border-2 p-2 ${option.is_correct ? 'border-secondary bg-secondary/15' : 'border-border bg-background'}`}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center border-2 border-border text-xs font-black">{option.key}</span>
                <Input
                  aria-label={`Lựa chọn ${option.key} câu ${questionIndex + 1}`}
                  value={option.text}
                  disabled={disabled}
                  onChange={(event) => updateQuestion(question.id, {
                    options: question.options.map((current) => current.key === option.key ? { ...current, text: event.target.value } : current),
                  })}
                />
                <Button
                  type="button"
                  variant={option.is_correct ? 'secondary' : 'ghost'}
                  disabled={disabled}
                  aria-label={`Đặt “${option.text}” là đáp án đúng`}
                  onClick={() => updateQuestion(question.id, {
                    options: question.options.map((current) => ({ ...current, is_correct: current.key === option.key })),
                  })}
                  className="min-h-9 shrink-0 px-2 text-xs"
                >
                  <CheckCircle2 size={15} />
                </Button>
              </div>
            ))}
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`translation-${question.id}`}><Languages className="mr-1 inline" size={14} />Dịch nghĩa</Label>
              <Textarea
                id={`translation-${question.id}`}
                value={question.translation ?? ''}
                disabled={disabled}
                onChange={(event) => updateQuestion(question.id, { translation: event.target.value || null })}
                className="min-h-20"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`explanation-${question.id}`}><Lightbulb className="mr-1 inline" size={14} />Lời giải chi tiết</Label>
              <Textarea
                id={`explanation-${question.id}`}
                value={question.explanation ?? ''}
                disabled={disabled}
                onChange={(event) => updateQuestion(question.id, { explanation: event.target.value || null })}
                className="min-h-20"
              />
            </div>
          </div>
        </article>
      ))}
    </section>
  )
}
