import type { B1AttemptQuestionReview } from '@/types/exam.types'
import type { MatchingAttemptItem } from './MatchingAttempt'

interface MatchingResultProps {
  leftItems: MatchingAttemptItem[]
  rightItems: MatchingAttemptItem[]
  reviews: B1AttemptQuestionReview[]
}

function getRightItemText(rightItems: MatchingAttemptItem[], id: string) {
  return rightItems.find((item) => item.id === id)?.text ?? id
}

export function MatchingResult({ leftItems, rightItems, reviews }: MatchingResultProps) {
  const reviewByLeftId = new Map(
    reviews.map((review) => [review.question_source_key.replace(/^matching:/, ''), review]),
  )

  return <section className="space-y-3" aria-label="Kết quả ghép cặp">
    <div className="border-2 border-border bg-muted/30 p-3 text-sm font-semibold">
      Đối chiếu lựa chọn của bạn với từng cặp đáp án.
    </div>
    {leftItems.map((leftItem, index) => {
      const review = reviewByLeftId.get(leftItem.id)
      const userAnswer = review?.user_answer.trim() ?? ''
      const correctAnswer = review?.accepted_answers[0] ?? ''
      const isCorrect = Boolean(review?.is_correct)

      return <article key={leftItem.id} className={`neo-card grid gap-3 border-2 bg-card p-4 shadow-[2px_2px_0_var(--border)] md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center ${
        isCorrect ? 'border-secondary' : 'border-danger'
      }`}>
        <p className="font-black"><span className="mr-2 inline-block border border-border bg-primary px-1.5 py-0.5 text-xs text-black">{index + 1}</span>{leftItem.text}</p>
        <span className="hidden font-black text-muted-foreground md:inline">→</span>
        <div className="flex flex-wrap items-center gap-2">
          {!isCorrect && userAnswer && <span className="border-2 border-danger bg-danger px-2 py-1 text-sm font-black text-white">{getRightItemText(rightItems, userAnswer)}</span>}
          <span className={`border-2 px-2 py-1 text-sm font-black ${
            isCorrect ? 'border-secondary bg-secondary/15 text-secondary' : 'border-black bg-yellow-300 text-black shadow-[1.5px_1.5px_0_#000]'
          }`}>{getRightItemText(rightItems, correctAnswer)}</span>
          {!isCorrect && <span className="text-xs font-black text-muted-foreground">Đáp án đúng</span>}
        </div>
      </article>
    })}
  </section>
}
