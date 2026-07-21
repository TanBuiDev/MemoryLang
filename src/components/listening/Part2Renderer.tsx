import type { ListeningQuestion } from '@/types/listening.types'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle } from 'lucide-react'

interface Props {
  question: ListeningQuestion
  selectedAnswer?: number
  showResult?: boolean
  onAnswer: (questionOrder: number, answerIndex: number) => void
}

export function Part2Renderer({ question, selectedAnswer, showResult, onAnswer }: Props) {
  // Real TOEIC Part 2 has 3 choices (A, B, C)
  const part2Options = question.options.slice(0, 3)

  return (
    <div className="space-y-5">
      {/* Header Info */}
      <div className="neo-card p-4 bg-amber-50 border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-2xl space-y-2">
        <div className="flex items-center justify-between">
          <Badge className="bg-[#fdc800] text-slate-900 border-2 border-slate-900 font-black text-xs">
            Part 2: Question-Response (Câu hỏi #{question.order})
          </Badge>
          <span className="text-xs font-bold text-slate-600">Lắng nghe 1 câu hỏi & 3 câu trả lời</span>
        </div>

        {/* Question Text: Only show during review mode (real exam hides text) */}
        {showResult ? (
          <div className="pt-2 border-t-2 border-slate-900 space-y-1">
            <span className="text-xs font-black uppercase text-purple-900">Câu hỏi nghe được:</span>
            <p className="text-base font-black text-slate-900">{question.questionText}</p>
          </div>
        ) : (
          <p className="text-xs font-bold text-slate-700 italic pt-1">
            * 📢 Đề thi Part 2 không in câu hỏi và đáp án trên màn hình. Hãy tập trung lắng nghe và chọn A, B hoặc C.
          </p>
        )}
      </div>

      {/* 3 Answer Choices (A, B, C) */}
      <div className="space-y-3">
        {part2Options.map((optionText, idx) => {
          const letter = String.fromCharCode(65 + idx)
          const isSelected = selectedAnswer === idx
          const isCorrect = question.correctIndex === idx

          let cardStyle = "bg-white border-3 border-slate-900 text-slate-900 shadow-[3px_3px_0px_0px_#000] hover:bg-amber-50"
          if (showResult) {
            if (isCorrect) {
              cardStyle = "bg-emerald-100 border-3 border-emerald-950 text-emerald-950 shadow-[3px_3px_0px_0px_#000]"
            } else if (isSelected && !isCorrect) {
              cardStyle = "bg-rose-100 border-3 border-rose-950 text-rose-950 shadow-[3px_3px_0px_0px_#000]"
            } else {
              cardStyle = "bg-slate-100 border-2 border-slate-400 opacity-60 text-slate-700"
            }
          } else if (isSelected) {
            cardStyle = "bg-[#fdc800] border-3 border-slate-900 text-slate-900 shadow-[3px_3px_0px_0px_#000]"
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={() => !showResult && onAnswer(question.order, idx)}
              disabled={showResult}
              className={`neo-button w-full p-4 rounded-xl text-left transition-all active:neo-button-active flex items-center gap-3 ${cardStyle}`}
            >
              <span className="w-8 h-8 rounded-lg bg-slate-900 text-white font-black text-sm flex items-center justify-center shrink-0">
                {letter}
              </span>

              <div className="flex-1 min-w-0">
                {!showResult ? (
                  <span className="font-black text-base">Lựa chọn ({letter})</span>
                ) : (
                  <span className="font-bold text-sm leading-snug block">
                    {optionText}
                  </span>
                )}
              </div>

              {showResult && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />}
              {showResult && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-700 shrink-0" />}
            </button>
          )
        })}
      </div>

      {/* Review Explanation */}
      {showResult && question.explanation && (
        <div className="neo-card p-4 bg-purple-50 border-3 border-slate-900 shadow-[3px_3px_0px_0px_#000] rounded-xl text-xs font-bold text-slate-800 space-y-1">
          <span className="text-purple-900 font-black uppercase block">💡 Giải thích chi tiết:</span>
          <p>{question.explanation}</p>
        </div>
      )}
    </div>
  )
}
