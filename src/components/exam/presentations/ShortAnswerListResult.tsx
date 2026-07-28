import type { B1AttemptQuestionReview } from '@/types/exam.types'

interface ShortAnswerListResultProps {
  reviews: B1AttemptQuestionReview[]
}

export function ShortAnswerListResult({ reviews }: ShortAnswerListResultProps) {
  return <section className="space-y-4" aria-label="Kết quả câu trả lời ngắn">
    {reviews.map((review, index) => (
      <article key={review.question_source_key} className={`neo-card space-y-4 border-2 bg-card p-5 shadow-[3px_3px_0_var(--border)] ${review.is_correct ? 'border-secondary' : 'border-danger'}`}>
        <div className="flex flex-wrap items-center gap-2 border-b-2 border-border/40 pb-3">
          <span className="border border-border bg-muted px-2.5 py-0.5 text-xs font-black uppercase text-secondary">Câu {index + 1}</span>
          <span className={`border border-border px-2.5 py-0.5 text-xs font-black ${review.is_correct ? 'bg-secondary/15 text-secondary' : 'bg-danger/15 text-danger'}`}>
            {review.is_correct ? 'Đúng' : 'Chưa đúng'}
          </span>
        </div>
        <h3 className="whitespace-pre-wrap text-base font-black leading-snug text-foreground">{review.question}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={`border-2 p-3 ${review.is_correct ? 'border-secondary/40 bg-secondary/5' : 'border-danger/40 bg-danger/5'}`}>
            <p className="text-[11px] font-black uppercase text-muted-foreground">Bạn đã trả lời</p>
            <p className={`mt-1 text-sm font-black ${review.is_correct ? 'text-secondary' : 'text-danger'}`}>{review.user_answer || 'Chưa trả lời'}</p>
          </div>
          <div className="border-2 border-yellow-400 bg-yellow-300 p-3 text-black shadow-[2px_2px_0_#000]">
            <p className="text-[11px] font-black uppercase">Đáp án chính xác</p>
            <p className="mt-1 inline-block bg-yellow-300 text-sm font-black">{review.accepted_answers.join(', ') || review.correct_option_keys.join(', ') || 'Chưa có'}</p>
          </div>
        </div>
        {review.translation && <div className="border-2 border-border bg-muted/40 p-3 text-sm font-semibold whitespace-pre-wrap"><p className="text-[11px] font-black uppercase text-secondary">Dịch nghĩa</p>{review.translation}</div>}
        {review.explanation && <div className="border-2 border-border bg-primary/10 p-3 text-sm font-semibold whitespace-pre-wrap"><p className="text-[11px] font-black uppercase">Lời giải chi tiết</p>{review.explanation}</div>}
      </article>
    ))}
  </section>
}
