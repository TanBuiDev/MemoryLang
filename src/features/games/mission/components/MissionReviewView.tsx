import { ArrowLeft, Headphones } from 'lucide-react'
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
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-8">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" /> Về kết quả
      </Button>
      <div className="neo-card p-5 sm:p-6">
        <h1 className="text-2xl font-black">Xem lại bài làm</h1>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          Câu trả lời và điểm của lượt này không thay đổi khi xem lại.
        </p>
      </div>
      {items.length === 0 ? (
        <div className="neo-card p-5 font-semibold">Lượt này chưa có câu trả lời để xem lại.</div>
      ) : items.map(({ stageType, question, answer }, index) => (
        <article
          key={question.id}
          className={'neo-card space-y-3 p-5 ' + (answer.isCorrect ? 'border-emerald-700' : 'border-rose-700')}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                {stageNames[stageType]} · Câu {index + 1}
              </p>
              <h2 className="mt-1 text-lg font-black">{question.prompt}</h2>
            </div>
            {question.audioText ? (
              <Button
                variant="secondary"
                className="h-11 w-11 shrink-0 p-0"
                aria-label={'Nghe lại đáp án câu ' + (index + 1)}
                title="Nghe lại đáp án"
                onClick={() => onPlayAudio(question.id)}
              >
                <Headphones className="h-5 w-5" />
              </Button>
            ) : null}
          </div>
          <p className={'text-sm font-black ' + (answer.isCorrect ? 'text-emerald-800' : 'text-rose-800')}>
            {answer.skipped ? 'Đã bỏ qua' : answer.isCorrect
              ? answer.firstTryCorrect ? 'Đúng ngay lần đầu' : answer.attempts > 1 ? 'Đúng ở lần thử thứ hai' : 'Đúng sau gợi ý'
              : 'Chưa đúng'} · {answer.score} điểm
          </p>
          {answer.firstSubmittedAnswer ? (
            <div className="text-sm">
              <span className="font-bold text-muted-foreground">Lần thử đầu: </span>
              <span className="font-semibold">{answer.firstSubmittedAnswer}</span>
            </div>
          ) : null}
          <div className="text-sm">
            <span className="font-bold text-muted-foreground">Bạn đã trả lời: </span>
            <span className="font-semibold">{answer.submittedAnswer || (answer.skipped ? 'Chưa trả lời' : 'Chưa lưu câu trả lời của lượt cũ')}</span>
          </div>
          <div className="rounded-lg border-2 border-border bg-muted/30 p-3 text-sm">
            <span className="font-bold text-muted-foreground">Đáp án đúng: </span>
            <span className="font-black">{question.acceptedAnswers[0]}</span>
          </div>
        </article>
      ))}
    </div>
  )
}
