import type { ListeningPart, ListeningQuestion } from '@/types/listening.types'

interface Props {
  part: ListeningPart
  question: ListeningQuestion
  selectedAnswer?: number
  showResult?: boolean
  onAnswer: (questionOrder: number, answerIndex: number) => void
}

export function Part1Renderer({ part, question, selectedAnswer, showResult, onAnswer }: Props) {
  return (
    <div className="grid gap-4">
      {part.imageUrl && (
        <div className="neo-card p-2">
          <img src={part.imageUrl} alt="Part 1" className="w-full max-h-64 object-contain rounded-md" />
        </div>
      )}
      <div className="grid gap-2">
        {question.options.map((option, idx) => {
          const letter = String.fromCharCode(65 + idx)
          const isSelected = selectedAnswer === idx
          const isCorrect = question.correctIndex === idx
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
              onClick={() => !showResult && onAnswer(question.order, idx)}
              disabled={showResult}
              className={`neo-button min-h-0 p-3 rounded-md border-2 border-border text-sm font-semibold text-left transition active:neo-button-active ${bgClass}`}
            >
              <span className="font-black mr-2">{letter}.</span>
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}
