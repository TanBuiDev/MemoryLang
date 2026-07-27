import { BookOpen } from 'lucide-react'
import type { B1AttemptQuestionReview } from '@/types/exam.types'

export type QuestionOptionsMap = Record<string, Array<{ key: string; text: string }>>

interface InlineGapPassageResultProps {
  passage: string
  reviews: B1AttemptQuestionReview[]
  optionsMap: QuestionOptionsMap
}

function getOptionText(questionSourceKey: string, optionKey: string, optionsMap: QuestionOptionsMap) {
  return optionsMap[questionSourceKey]?.find((option) => option.key === optionKey)?.text ?? optionKey
}

function getCorrectAnswerText(review: B1AttemptQuestionReview, optionsMap: QuestionOptionsMap) {
  if (review.accepted_answers.length > 0) return review.accepted_answers.join(', ')
  return review.correct_option_keys.map((key) => getOptionText(review.question_source_key, key, optionsMap)).join(', ')
}

export function InlineGapPassageResult({ passage, reviews, optionsMap }: InlineGapPassageResultProps) {
  const numberToReview: Record<string, B1AttemptQuestionReview> = {}
  reviews.forEach((review, index) => {
    const match = review.question_source_key.match(/-q?(\d+)$/i) || review.question.match(/(\d+)/)
    const label = match ? match[1] : String(index + 1)
    numberToReview[label] = review
    if (!numberToReview[String(index + 1)]) numberToReview[String(index + 1)] = review
  })
  const parts = passage.split(/(\(\d+\)\s*[\._]{2,})/g)

  return (
    <div className="neo-card border-2 border-border bg-card p-5 text-base font-semibold leading-loose shadow-[3px_3px_0_var(--border)] sm:p-6">
      <div className="mb-3 flex items-center gap-2 border-b-2 border-border pb-2 text-xs font-black uppercase text-secondary">
        <BookOpen size={15} /> <span>Văn bản và kết quả điền đáp án trực tiếp:</span>
      </div>
      <div className="leading-relaxed">
        {parts.map((part, index) => {
          const match = /^(\((\d+)\)\s*[\._]{2,})$/.exec(part)
          if (!match) return <span key={index}>{part}</span>
          const label = match[2]
          const review = numberToReview[label] ?? reviews[Number(label) - 1]
          if (!review) return <span key={index}>{part}</span>
          const correctAnswer = getCorrectAnswerText(review, optionsMap)
          const selected = (review.user_answer ?? '').trim()
          const selectedText = selected ? getOptionText(review.question_source_key, selected, optionsMap) : ''
          return (
            <span key={index} className="mx-1.5 inline-flex flex-wrap items-baseline gap-1 align-baseline">
              <span className="font-mono text-sm font-black text-secondary">({label})</span>
              {review.is_correct ? (
                <span className="border border-secondary/40 bg-secondary/15 px-1.5 py-0.5 font-black text-secondary underline decoration-2 decoration-secondary underline-offset-4">{selectedText || correctAnswer}</span>
              ) : (
                <span className="inline-flex flex-wrap items-baseline gap-1.5 text-sm font-black">
                  {selectedText && <span className="border border-danger/30 bg-danger/10 px-1 py-0.5 text-danger">{selectedText}</span>}
                  <span className="border-2 border-black bg-yellow-300 px-2 py-0.5 text-black shadow-[1.5px_1.5px_0_#000]">{correctAnswer}</span>
                </span>
              )}
            </span>
          )
        })}
      </div>
    </div>
  )
}
