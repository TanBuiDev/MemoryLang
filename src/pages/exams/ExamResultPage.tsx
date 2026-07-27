import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { examPracticeService } from '@/services/supabase/examPractice.service'
import type { B1AttemptQuestionReview } from '@/types/exam.types'

function getReviews(sections: Array<{ progress: Record<string, unknown> }>): B1AttemptQuestionReview[] {
  return sections.flatMap((section) => Array.isArray(section.progress.review) ? section.progress.review : [])
    .filter((review): review is B1AttemptQuestionReview => Boolean(review) && typeof review === 'object' && typeof (review as B1AttemptQuestionReview).question_source_key === 'string')
}

export function ExamResultPage() {
  const { attemptId = '' } = useParams()
  const navigate = useNavigate()
  const attemptQuery = useQuery({ queryKey: ['b1-exam-attempt', attemptId], queryFn: () => examPracticeService.getAttempt(attemptId), enabled: Boolean(attemptId) })

  if (attemptQuery.isLoading) return <div className="neo-card animate-pulse p-8 text-center font-black">Đang tải kết quả…</div>
  if (attemptQuery.isError || !attemptQuery.data) return <div className="neo-card p-8 text-center font-black">Không tìm thấy kết quả bài làm.</div>
  if (attemptQuery.data.attempt.status !== 'submitted') return <div className="neo-card space-y-4 p-8 text-center"><p className="font-black">Bài này chưa được nộp.</p><Button onClick={() => navigate(`/app/exams/attempt/${attemptId}`)}>Quay lại làm bài</Button></div>

  const reviews = getReviews(attemptQuery.data.sections)
  const score = attemptQuery.data.sections.reduce((total, section) => total + Number(section.score ?? 0), 0)
  const maxScore = attemptQuery.data.sections.reduce((total, section) => total + Number(section.max_score ?? 0), 0)

  return <div className="mx-auto max-w-4xl space-y-5">
    <header className="neo-card bg-primary p-6"><p className="text-xs font-black uppercase">Đề thi thử B1</p><h1 className="mt-1 text-3xl font-black">Kết quả bài thi thử</h1><p className="mt-3 text-lg font-black">Điểm câu khách quan: {score}/{maxScore}</p></header>
    <Button variant="ghost" onClick={() => navigate('/app/exams')}><ArrowLeft size={17} />Danh sách đề</Button>
    {reviews.length === 0 ? <div className="neo-card p-6 font-semibold">Chưa có dữ liệu đáp án chi tiết cho lần làm này.</div> : <div className="space-y-4">{reviews.map((review, index) => <article key={review.question_source_key} className={`neo-card p-5 ${review.is_correct ? 'border-secondary' : 'border-danger'}`}><div className="flex items-start gap-3">{review.is_correct ? <CheckCircle2 className="mt-1 text-secondary" /> : <XCircle className="mt-1 text-danger" />}<div className="min-w-0"><p className="text-sm font-black text-secondary">Câu {index + 1} · {review.is_correct ? 'Đúng' : 'Chưa đúng'}</p><h2 className="mt-1 whitespace-pre-wrap text-lg font-black">{review.question}</h2><p className="mt-3 font-semibold">Bạn trả lời: {review.user_answer || 'Chưa trả lời'}</p><p className="font-semibold">Đáp án đúng: {[...review.correct_option_keys, ...review.accepted_answers].join(', ') || 'Chưa có'}</p>{review.translation && <section className="mt-4 border-t-2 border-border pt-3"><h3 className="font-black">Dịch nghĩa</h3><p className="mt-1 whitespace-pre-wrap font-semibold">{review.translation}</p></section>}{review.explanation && <section className="mt-4 border-t-2 border-border pt-3"><h3 className="font-black">Lời giải</h3><p className="mt-1 whitespace-pre-wrap font-semibold">{review.explanation}</p></section>}</div></div></article>)}</div>}
  </div>
}
