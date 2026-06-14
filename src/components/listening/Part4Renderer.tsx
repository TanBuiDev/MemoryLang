import type { ListeningQuestion } from '@/types/listening.types'

interface Props {
  questions: ListeningQuestion[]
  currentIndex: number
  answers: Record<number, number>
  showResult?: boolean
  onAnswer: (questionOrder: number, answerIndex: number) => void
  onNavigate: (index: number) => void
}

export function Part4Renderer({ questions, currentIndex, answers, showResult, onAnswer, onNavigate }: Props) {
  const q = questions[currentIndex]
  if (!q) return null

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-1.5">
        {questions.map((qItem, idx) => {
          const answered = answers[qItem.order] !== undefined
          return (
            <button
              key={qItem.id}
              onClick={() => onNavigate(idx)}
              className={`neo-button min-h-0 px-2.5 py-1 rounded-md border-2 text-xs font-black transition ${
                idx === currentIndex
                  ? 'border-border bg-primary text-primary-foreground shadow-[2px_2px_0_var(--border)]'
                  : answered
                    ? 'border-border bg-muted'
                    : 'border-border bg-card hover:bg-muted'
              }`}
            >
              {qItem.order}
            </button>
          )
        })}
      </div>

      <p className="text-lg font-black">{q.questionText}</p>

      <div className="grid gap-2">
        {q.options.map((option, idx) => {
          const letter = String.fromCharCode(65 + idx)
          const isSelected = answers[q.order] === idx
          const isCorrect = q.correctIndex === idx
          let bgClass = 'bg-card hover:bg-muted'
          if (showResult) {
            if (isCorrect) bgClass = 'bg-success/20 border-success'
            else if (isSelected && !isCorrect) bgClass = 'bg-danger/20 border-danger'
          } else if (isSelected) {
            bgClass = 'bg-primary text-primary-foreground'
          }

          return (
            <button
              key={idx}
              onClick={() => !showResult && onAnswer(q.order, idx)}
              disabled={showResult}
              className={`neo-button min-h-0 p-3 rounded-md border-2 border-border text-sm font-semibold text-left transition active:neo-button-active ${bgClass}`}
            >
              <span className="font-black mr-2">{letter}.</span>
              {option}
            </button>
          )
        })}
      </div>

      {showResult && q.explanation && (
        <p className="text-xs text-muted-foreground border-t-2 border-border pt-2">{q.explanation}</p>
      )}
    </div>
  )
}
