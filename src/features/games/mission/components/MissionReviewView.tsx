import { ArrowLeft, Headphones, CheckCircle2, XCircle, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { MissionStageType } from '../mission.types'
import type { MissionReviewItem } from '../missionReview'

interface MissionReviewViewProps {
  items: MissionReviewItem[]
  onBack: () => void
  onPlayAudio: (questionId: string) => void
}

const stageNames: Record<MissionStageType, string> = {
  learn: 'Làm quen',
  matching: 'Ghép từ',
  listening_choice: 'Nghe chọn nghĩa',
  listening_typing: 'Nghe và viết',
  context_cloze: 'Ngữ cảnh',
  meaning_recall: 'Nhớ từ',
  spelling: 'Chính tả',
  boss: 'Thử thách cuối',
}

export function MissionReviewView({ items, onBack, onPlayAudio }: MissionReviewViewProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <Button
        variant="ghost"
        onClick={onBack}
        className="font-bold border-2 border-slate-900 bg-white hover:bg-slate-100 shadow-[2px_2px_0px_#000] rounded-xl text-xs sm:text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Về kết quả
      </Button>

      {/* Header Banner */}
      <div className="neo-card bg-[#432dd7] text-white p-6 border-4 border-slate-900 shadow-[6px_6px_0px_#000] rounded-2xl space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-300 border-2 border-slate-900 text-slate-900 font-black text-xs uppercase tracking-wider rounded-full shadow-[2px_2px_0px_#000]">
          <FileText className="h-3.5 w-3.5" />
          <span>Chi Tiết Lượt Chơi</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Xem Lại Bài Làm</h1>
        <p className="text-xs sm:text-sm font-bold text-indigo-100">
          Câu trả lời và điểm của lượt này không thay đổi khi xem lại.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="neo-card p-6 font-bold text-center border-3 border-slate-900 shadow-[4px_4px_0px_#000] rounded-2xl bg-white">
          Lượt này chưa có câu trả lời để xem lại.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(({ stageType, question, answer }, index) => {
            const resultLabel = answer.skipped
              ? 'Đã bỏ qua'
              : answer.isCorrect
                ? answer.firstTryCorrect
                  ? 'Đúng ngay lần đầu'
                  : answer.attempts > 1
                    ? 'Đúng ở lần thử thứ hai'
                    : 'Đúng sau gợi ý'
                : 'Chưa đúng'

            return (
              <article
                key={question.id}
                className={
                  'neo-card space-y-3.5 p-5 sm:p-6 border-3 border-slate-900 rounded-2xl transition-all ' +
                  (answer.isCorrect
                    ? 'bg-emerald-50/40 shadow-[4px_4px_0px_#059669]'
                    : 'bg-rose-50/40 shadow-[4px_4px_0px_#e11d48]')
                }
              >
                {/* Question Top Row */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500 block">
                      {stageNames[stageType]} · Câu {index + 1}
                    </span>
                    <h2 className="mt-1 text-base sm:text-lg font-black text-slate-900 leading-snug">
                      {question.prompt}
                    </h2>
                  </div>

                  {question.audioText ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 p-0 rounded-xl bg-yellow-300 hover:bg-amber-300 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_#000] flex items-center justify-center cursor-pointer"
                      aria-label={'Nghe lại đáp án câu ' + (index + 1)}
                      title="Nghe lại đáp án"
                      onClick={() => onPlayAudio(question.id)}
                    >
                      <Headphones className="h-5 w-5" />
                    </Button>
                  ) : null}
                </div>

                {/* Score & Status Tag */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200">
                  <span
                    className={
                      'inline-flex items-center gap-1.5 px-3 py-1 border-2 border-slate-900 rounded-lg font-black text-xs shadow-[1.5px_1.5px_0px_#000] ' +
                      (answer.isCorrect
                        ? 'bg-emerald-300 text-emerald-950'
                        : 'bg-rose-200 text-rose-950')
                    }
                  >
                    {answer.isCorrect ? (
                      <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.5]" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 stroke-[2.5]" />
                    )}
                    <span>{resultLabel}</span>
                  </span>

                  <span className="text-xs font-black text-slate-700">
                    · {answer.score} điểm
                  </span>
                </div>

                {/* Prior retry attempt if any */}
                {answer.firstSubmittedAnswer ? (
                  <div className="text-sm bg-white/70 border border-slate-300 rounded-lg p-2.5">
                    <span className="font-bold text-slate-500">Lần thử đầu: </span>
                    <span className="font-semibold text-slate-800">{answer.firstSubmittedAnswer}</span>
                  </div>
                ) : null}

                {/* Submitted Answer */}
                <div className="text-sm bg-white border-2 border-slate-900 rounded-xl p-3 shadow-[1.5px_1.5px_0px_#000]">
                  <span className="font-bold text-slate-500">Bạn đã trả lời: </span>
                  <span className="font-black text-slate-900">
                    {answer.submittedAnswer ||
                      (answer.skipped ? 'Chưa trả lời' : 'Chưa lưu câu trả lời của lượt cũ')}
                  </span>
                </div>

                {/* Accepted Correct Answer Box */}
                <div className="rounded-xl border-2 border-slate-900 bg-emerald-100 p-3.5 text-sm shadow-[2px_2px_0px_#000]">
                  <span className="font-bold text-slate-700">Đáp án đúng: </span>
                  <span className="font-black text-emerald-950 text-base">
                    {question.acceptedAnswers[0]}
                  </span>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
