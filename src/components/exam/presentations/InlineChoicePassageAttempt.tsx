import { useState } from 'react'
import { Button } from '@/components/ui/button'

export interface InlineChoiceQuestion {
  source_key: string
  source_number?: string
  options?: Array<{ key: string; text: string }>
}

interface InlineChoicePassageAttemptProps {
  passage: string
  questions: InlineChoiceQuestion[]
  answers: Record<string, string>
  onAnswer: (questionKey: string, optionKey: string) => void
  disabled?: boolean
}

export function InlineChoicePassageAttempt({ passage, questions, answers, onAnswer, disabled = false }: InlineChoicePassageAttemptProps) {
  const [openGap, setOpenGap] = useState<string | null>(null)
  const byNumber = new Map(questions.map((question, index) => [question.source_number ?? String(index + 1), question]))
  const parts = passage.split(/(\(\d+\)\s*_{2,})/g)

  return <div className="border-2 border-border bg-card p-5 sm:p-6 font-semibold text-base leading-loose shadow-[3px_3px_0_var(--border)]">
    <p className="mb-3 border-b-2 border-border pb-2 text-xs font-black uppercase text-secondary">Chọn đáp án trực tiếp trong đoạn văn</p>
    <div className="whitespace-pre-wrap">
      {parts.map((part, index) => {
        const match = /^(\((\d+)\)\s*_{2,})$/.exec(part)
        if (!match) return <span key={index}>{part}</span>
        const label = match[2]
        const question = byNumber.get(label)
        if (!question) return <span key={index}>{part}</span>
        const selectedKey = answers[question.source_key]
        const selected = question.options?.find((option) => option.key === selectedKey)
        const isOpen = openGap === question.source_key
        return <span key={index} className="relative mx-1 inline-flex align-baseline">
          <Button
            type="button"
            variant={selected ? 'secondary' : 'ghost'}
            disabled={disabled}
            aria-expanded={isOpen}
            aria-label={`Chọn đáp án cho câu ${label}`}
            onClick={() => setOpenGap((current) => current === question.source_key ? null : question.source_key)}
            className="min-h-8 min-w-28 px-2 py-1 text-xs"
          >
            <span className="font-mono">({label})</span> {selected?.text ?? 'Chọn đáp án'}
          </Button>
          {isOpen && <span className="absolute left-0 top-full z-10 mt-1 flex min-w-44 flex-col gap-1 border-2 border-border bg-card p-2 shadow-[3px_3px_0_var(--border)]">
            {question.options?.map((option) => <Button
              key={option.key}
              type="button"
              variant={selectedKey === option.key ? 'secondary' : 'ghost'}
              disabled={disabled}
              onClick={() => { onAnswer(question.source_key, option.key); setOpenGap(null) }}
              className="min-h-8 justify-start px-2 py-1 text-xs"
            >
              <span className="border border-current px-1">{option.key}</span> {option.text}
            </Button>)}
          </span>}
        </span>
      })}
    </div>
  </div>
}
