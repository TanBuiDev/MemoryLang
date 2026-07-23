import type { ListeningPart, ListeningQuestion } from '@/types/listening.types'
import { Part1Renderer } from '@/components/listening/Part1Renderer'
import { Part2Renderer } from '@/components/listening/Part2Renderer'
import { Part3Renderer } from '@/components/listening/Part3Renderer'
import { Part4Renderer } from '@/components/listening/Part4Renderer'

interface TestModeRendererProps {
  part: ListeningPart
  questions: ListeningQuestion[]
  currentIndex: number
  answers: Record<number, number>
  showResult?: boolean
  onAnswer: (questionOrder: number, answerIndex: number) => void
  onNavigate?: (index: number) => void
}

export function TestModeRenderer({ part, questions, currentIndex, answers, showResult, onAnswer }: TestModeRendererProps) {
  if (questions.length === 0) {
    return <p className="text-sm text-muted-foreground">No questions available.</p>
  }

  if (part.partNumber === 1) {
    return (
      <Part1Renderer
        part={part}
        question={questions[currentIndex]}
        selectedAnswer={answers[questions[currentIndex]?.order]}
        showResult={showResult}
        onAnswer={onAnswer}
      />
    )
  }

  if (part.partNumber === 2) {
    return (
      <Part2Renderer
        question={questions[currentIndex]}
        selectedAnswer={answers[questions[currentIndex]?.order]}
        showResult={showResult}
        onAnswer={onAnswer}
      />
    )
  }

  if (part.partNumber === 3) {
    return (
      <Part3Renderer
        question={questions[currentIndex]}
        selectedAnswer={answers[questions[currentIndex]?.order]}
        showResult={showResult}
        onAnswer={onAnswer}
      />
    )
  }

  return (
    <Part4Renderer
      question={questions[currentIndex]}
      selectedAnswer={answers[questions[currentIndex]?.order]}
      showResult={showResult}
      onAnswer={onAnswer}
    />
  )
}
