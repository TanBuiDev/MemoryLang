import { useRef } from 'react'
import { HelpCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'

export interface SentenceTransformationAttemptQuestion {
  source_key: string
  source_number?: string
  prompt: string
}

export interface ParsedSentenceTransformation {
  originalSentence: string
  keyword: string | null
  prefixText: string
  suffixText: string
}

interface SentenceTransformationAttemptProps {
  questions: SentenceTransformationAttemptQuestion[]
  answers: Record<string, string>
  onAnswer: (questionKey: string, answer: string) => void
  disabled?: boolean
}

export function parseSentenceTransformationPrompt(promptText: string): ParsedSentenceTransformation | null {
  if (!promptText) return null
  const lines = promptText.split('\n').map((line) => line.trim()).filter(Boolean)
  if (lines.length < 2) return null

  const keywordMatch = lines[0].match(/\(([^)]+)\)\s*$/)
  const gapParts = lines[1].split(/[\u2026]|\.{3,}|_{3,}/)
  return {
    originalSentence: keywordMatch ? lines[0].replace(/\(([^)]+)\)\s*$/, '').trim() : lines[0],
    keyword: keywordMatch?.[1] ?? null,
    prefixText: gapParts[0]?.trim() ?? '',
    suffixText: gapParts.slice(1).join(' ').trim(),
  }
}

export function SentenceTransformationAttempt({
  questions,
  answers,
  onAnswer,
  disabled = false,
}: SentenceTransformationAttemptProps) {
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})

  return <div className="space-y-6" aria-label="Viết lại câu">
    {questions.map((question, index) => {
      const parsed = parseSentenceTransformationPrompt(question.prompt)
      const questionNumber = question.source_number ?? String(index + 1)
      const hasAnswer = Boolean(answers[question.source_key])

      if (!parsed) return <section
        key={question.source_key}
        id={`q-${question.source_key}`}
        className={`neo-card space-y-4 border-2 bg-card p-5 shadow-[3px_3px_0_var(--border)] ${hasAnswer ? 'border-secondary' : 'border-border'}`}
      >
        <div className="flex flex-wrap items-baseline gap-2.5">
          <span className="inline-flex shrink-0 items-center gap-1 border border-border bg-muted px-2 py-0.5 text-xs font-black uppercase tracking-wider text-secondary shadow-[1.5px_1.5px_0_var(--border)]">
            <HelpCircle size={13} className="text-secondary" />
            <span>Câu {questionNumber}</span>
          </span>
          <span className="whitespace-pre-wrap text-base font-black leading-snug text-foreground">{question.prompt}</span>
        </div>
        <Input
          id={`answer-${question.source_key}`}
          ref={(element) => { inputs.current[question.source_key] = element }}
          value={answers[question.source_key] ?? ''}
          disabled={disabled}
          onChange={(event) => onAnswer(question.source_key, event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            const nextQuestion = questions[index + 1]
            if (nextQuestion) inputs.current[nextQuestion.source_key]?.focus()
          }}
          placeholder="Gõ câu viết lại / đáp án điền từ vào đây:"
          className="border-2 border-border bg-background text-base font-bold shadow-[2px_2px_0_var(--border)] focus:border-secondary focus:ring-0"
        />
      </section>

      return <section
        key={question.source_key}
        id={`q-${question.source_key}`}
        className={`neo-card space-y-4 border-2 bg-card p-5 shadow-[3px_3px_0_var(--border)] transition-all ${
          hasAnswer ? 'border-secondary' : 'border-border'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2 text-base font-bold leading-relaxed text-foreground">
          <span className="inline-flex shrink-0 items-center gap-1 border border-border bg-muted px-2 py-0.5 text-xs font-black uppercase tracking-wider text-secondary shadow-[1.5px_1.5px_0_var(--border)]">
            <HelpCircle size={13} className="text-secondary" />
            <span>Câu {questionNumber}</span>
          </span>
          <span>{parsed.originalSentence}</span>
          {parsed.keyword && <span className="inline-flex items-center border border-border bg-secondary/15 px-2 py-0.5 text-xs font-black text-secondary">({parsed.keyword})</span>}
        </div>

        <div className="flex flex-wrap items-baseline gap-2 border-t-2 border-border/40 pt-2 text-base font-semibold">
          <span className="shrink-0 select-none font-mono text-xl font-black leading-none text-secondary">↳</span>
          {parsed.prefixText && <span className="font-bold italic text-foreground">{parsed.prefixText}</span>}
          <Input
            id={`answer-${question.source_key}`}
            ref={(element) => { inputs.current[question.source_key] = element }}
            value={answers[question.source_key] ?? ''}
            disabled={disabled}
            onChange={(event) => onAnswer(question.source_key, event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              const nextQuestion = questions[index + 1]
              if (nextQuestion) inputs.current[nextQuestion.source_key]?.focus()
            }}
            placeholder="..................................."
            className="inline-block h-10 min-w-[200px] max-w-md flex-1 border-2 border-border bg-background px-3 text-base font-bold text-destructive shadow-[2px_2px_0_var(--border)] focus:border-secondary focus:ring-0"
          />
          {parsed.suffixText && <span className="font-bold italic text-foreground">{parsed.suffixText}</span>}
        </div>
      </section>
    })}
  </div>
}
