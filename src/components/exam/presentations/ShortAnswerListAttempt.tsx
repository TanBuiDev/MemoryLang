import { useRef } from 'react'
import { Input } from '@/components/ui/input'

export interface ShortAnswerAttemptQuestion {
  source_key: string
  source_number?: string
  prompt: string
}

interface ShortAnswerListAttemptProps {
  questions: ShortAnswerAttemptQuestion[]
  answers: Record<string, string>
  onAnswer: (questionKey: string, answer: string) => void
  disabled?: boolean
}

export function ShortAnswerListAttempt({ questions, answers, onAnswer, disabled = false }: ShortAnswerListAttemptProps) {
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})
  return <div className="space-y-4" aria-label="Danh sách câu trả lời ngắn">
    {questions.map((question, index) => <section key={question.source_key} className="neo-card space-y-3 border-2 border-border bg-card p-4 shadow-[2px_2px_0_var(--border)]">
      <label className="block text-sm font-black" htmlFor={`short-answer-${question.source_key}`}>Câu {question.source_number ?? index + 1}: {question.prompt}</label>
      <Input
        id={`short-answer-${question.source_key}`}
        ref={(element) => { inputs.current[question.source_key] = element }}
        disabled={disabled}
        value={answers[question.source_key] ?? ''}
        placeholder="Gõ đáp án"
        onChange={(event) => onAnswer(question.source_key, event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return
          event.preventDefault()
          const next = questions[index + 1]
          if (next) inputs.current[next.source_key]?.focus()
        }}
      />
    </section>)}
  </div>
}
