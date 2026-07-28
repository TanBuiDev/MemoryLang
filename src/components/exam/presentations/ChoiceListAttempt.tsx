import { Button } from '@/components/ui/button'
import { getImagePresentation } from '@/features/exam-content/imagePresentation'

export interface ChoiceAttemptQuestion {
  source_key: string
  source_number?: string
  prompt: string
  image_url?: string | null
  metadata?: Record<string, unknown>
  options?: Array<{ key: string; text: string; is_correct?: boolean }>
}

interface ChoiceListAttemptProps {
  questions: ChoiceAttemptQuestion[]
  answers: Record<string, string>
  onAnswer: (questionKey: string, optionKey: string) => void
  disabled?: boolean
}

export function ChoiceListAttempt({ questions, answers, onAnswer, disabled = false }: ChoiceListAttemptProps) {
  return <div className="space-y-6">
    {questions.map((question, index) => {
      const number = question.source_number ?? String(index + 1)
      const selected = answers[question.source_key]
      const imagePresentation = getImagePresentation(question.metadata)
      return <section key={question.source_key} id={`q-${question.source_key}`} className={`neo-card space-y-4 border-2 bg-card p-5 shadow-[3px_3px_0_var(--border)] ${selected ? 'border-secondary' : 'border-border'}`}>
        <div className="flex flex-wrap items-baseline gap-2"><span className="border border-border bg-muted px-2 py-0.5 text-xs font-black text-secondary">Câu {number}</span><h3 className="text-base font-black">{question.prompt}</h3></div>
        {question.image_url && <img src={question.image_url} alt={`Hình minh họa câu ${number}`} className={`max-h-64 max-w-full border-2 border-border ${imagePresentation.fitClass}`} style={{ objectPosition: imagePresentation.objectPosition }} />}
        <div className="grid gap-2.5 sm:grid-cols-2">
          {question.options?.map((option) => <Button key={option.key} type="button" variant={selected === option.key ? 'primary' : 'ghost'} disabled={disabled} onClick={() => onAnswer(question.source_key, option.key)} className="h-auto min-h-11 justify-start whitespace-normal px-3 py-2 text-left">
            <span className="mr-1 border border-current px-1 text-xs">{option.key}</span><span className="break-words">{option.text}</span>
          </Button>)}
        </div>
      </section>
    })}
  </div>
}
