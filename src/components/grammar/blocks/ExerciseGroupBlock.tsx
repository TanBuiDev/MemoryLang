import { useState } from 'react'
import type { LessonBlock, ExerciseGroupContent, ExerciseQuestion } from '@/types/grammar.types'
import { cn } from '@/utils/cn'

interface ExerciseGroupBlockProps {
  block: LessonBlock
  disabled?: boolean
}

interface QuestionCardProps {
  question: ExerciseQuestion
  index: number
}

function QuestionCard({ question, index }: QuestionCardProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)

  const isCorrect = selectedIndex === question.correctIndex
  const handleCheck = () => {
    if (selectedIndex !== null) setChecked(true)
  }

  return (
    <div className="border-2 border-(--border) rounded-lg p-4 bg-white">
      <p className="font-semibold mb-3">
        <span className="text-purple-600 font-bold">Câu {index + 1}:</span>{' '}
        {question.question}
      </p>
      <div className="space-y-2 mb-3">
        {question.options.map((option, oi) => {
          const letter = String.fromCharCode(65 + oi)
          let optionClass = 'border-2 border-(--border) rounded-lg p-3 cursor-pointer transition-colors hover:bg-gray-50'

          if (checked) {
            if (oi === question.correctIndex) {
              optionClass = 'border-2 border-green-400 rounded-lg p-3 bg-green-50'
            } else if (oi === selectedIndex && !isCorrect) {
              optionClass = 'border-2 border-red-400 rounded-lg p-3 bg-red-50'
            }
          } else if (oi === selectedIndex) {
            optionClass = 'border-2 border-purple-400 rounded-lg p-3 bg-purple-50'
          }

          return (
            <div
              key={oi}
              className={optionClass}
              onClick={() => !checked && setSelectedIndex(oi)}
            >
              <span className="font-bold text-purple-600 mr-2">{letter}.</span>
              {option}
            </div>
          )
        })}
      </div>

      {!checked ? (
        <button
          onClick={handleCheck}
          disabled={selectedIndex === null}
          className={cn(
            'neo-button px-4 py-2 text-sm font-bold',
            selectedIndex === null && 'opacity-50 cursor-not-allowed'
          )}
        >
          Kiểm tra
        </button>
      ) : (
        <div className={cn(
          'p-3 border-2 rounded-lg font-semibold',
          isCorrect ? 'border-green-400 bg-green-50 text-green-800' : 'border-red-400 bg-red-50 text-red-800'
        )}>
          {isCorrect ? 'Chính xác!' : `Chưa đúng. Đáp án: ${String.fromCharCode(65 + question.correctIndex)}. ${question.options[question.correctIndex]}`}
          {question.explanation && (
            <p className="mt-2 text-sm font-normal text-gray-600">
              {question.explanation}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export function ExerciseGroupBlock({ block }: ExerciseGroupBlockProps) {
  const { instruction, questions } = block.content as unknown as ExerciseGroupContent

  return (
    <div className="my-6">
      {instruction && (
        <h3 className="text-lg font-bold mb-4">🎯 {instruction}</h3>
      )}
      <div className="space-y-4">
        {questions.map((q, i) => (
          <QuestionCard key={q.id} question={q} index={i} />
        ))}
      </div>
    </div>
  )
}
