import { Eye, FileCheck2, NotebookPen } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { ExamPresentationType } from '@/types/exam.types'

export interface PreviewQuestion {
  id: string
  prompt: string
  options?: Array<{ key: string; text: string; is_correct: boolean }>
  acceptedAnswers: string[]
}

interface PresentationPreviewProps {
  presentationType: ExamPresentationType
  title?: string
  instructions?: string | null
  passage?: string | null
  prompt?: string | null
  questions: PreviewQuestion[]
}

function ChoicePreview({ questions, result }: { questions: PreviewQuestion[]; result: boolean }) {
  return <div className="space-y-4">
    {questions.map((question, index) => {
      const incorrectOption = question.options?.find((option) => !option.is_correct)
      return <article key={question.id} className="border-2 border-border bg-card p-4">
        <p className="font-black">Câu {index + 1}. {question.prompt}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {question.options?.map((option) => {
            const isCorrect = option.is_correct
            const isChosenWrong = result && option.key === incorrectOption?.key
            return <div key={option.key} className={`border-2 border-border px-3 py-2 text-sm font-black ${result && isCorrect ? 'bg-primary' : isChosenWrong ? 'bg-danger text-white' : 'bg-muted/30'}`}>
              <span className="mr-2 inline-block border border-current px-1.5 py-0.5 text-xs">{option.key}</span>{option.text}
              {result && isCorrect && <span className="ml-2 text-xs">Đáp án đúng</span>}
              {isChosenWrong && <span className="ml-2 text-xs">Học viên chọn</span>}
            </div>
          })}
        </div>
      </article>
    })}
  </div>
}

function TextPreview({ questions, passage, result }: { questions: PreviewQuestion[]; passage?: string | null; result: boolean }) {
  return <div className="space-y-4">
    {passage && <div className="whitespace-pre-wrap border-2 border-border bg-muted/30 p-4 font-semibold leading-loose">{passage}</div>}
    {questions.map((question, index) => <div key={question.id} className="border-2 border-border p-4">
      <p className="font-black">{index + 1}. {question.prompt}</p>
      {result ? <p className="mt-2 font-bold text-secondary">Đáp án: {question.acceptedAnswers.join(' / ') || 'Chưa đặt đáp án'}</p> : <div className="mt-2 h-10 w-full border-b-2 border-border bg-muted/40" aria-label={`Ô trả lời câu ${index + 1}`} />}
    </div>)}
  </div>
}

export function PresentationPreview({ presentationType, title, instructions, passage, prompt, questions }: PresentationPreviewProps) {
  const [mode, setMode] = useState<'attempt' | 'result'>('attempt')
  const isResult = mode === 'result'
  const isChoice = ['choice_list', 'boolean_list', 'image_choice_list', 'passage_questions', 'passage_choice_inline'].includes(presentationType)
  const isLongForm = presentationType === 'long_form_prompt' || presentationType === 'speaking_script_prompt'

  return <section className="neo-card space-y-4 bg-card p-5 shadow-[3px_3px_0_var(--border)]" aria-label="Preview học viên">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-border pb-3">
      <div><p className="text-xs font-black uppercase text-secondary">Preview trực tiếp</p><h3 className="text-lg font-black">{isResult ? 'Học viên xem đáp án' : 'Học viên làm bài'}</h3></div>
      <div className="flex gap-2">
        <Button type="button" variant={mode === 'attempt' ? 'secondary' : 'ghost'} onClick={() => setMode('attempt')} className="min-h-9 px-3 text-xs"><Eye size={14} /> Làm bài</Button>
        <Button type="button" variant={mode === 'result' ? 'secondary' : 'ghost'} onClick={() => setMode('result')} className="min-h-9 px-3 text-xs"><FileCheck2 size={14} /> Xem đáp án</Button>
      </div>
    </div>
    {title && <h4 className="text-xl font-black">{title}</h4>}
    {instructions && <p className="whitespace-pre-wrap border-2 border-border bg-muted/30 p-3 text-sm font-semibold">{instructions}</p>}
    {isLongForm ? <div className="space-y-3 border-2 border-border bg-muted/20 p-4"><p className="whitespace-pre-wrap font-semibold">{prompt || 'Chưa có đề bài tự luận.'}</p>{isResult ? <div className="border-2 border-secondary bg-secondary/10 p-3 text-sm font-semibold">Bài nộp và bài mẫu sẽ xuất hiện ở đây để học viên so sánh.</div> : <div className="min-h-32 border-2 border-border bg-card p-3 text-sm text-muted-foreground"><NotebookPen className="mr-2 inline" size={16} />Vùng học viên soạn bài (tự động lưu).</div>}</div>
      : isChoice ? <ChoicePreview questions={questions} result={isResult} />
        : <TextPreview questions={questions} passage={passage} result={isResult} />}
  </section>
}
