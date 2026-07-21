import type { ListeningPart, ListeningQuestion } from '@/types/listening.types'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle } from 'lucide-react'

interface Props {
  part: ListeningPart
  question: ListeningQuestion
  selectedAnswer?: number
  showResult?: boolean
  onAnswer: (questionOrder: number, answerIndex: number) => void
}

export function Part1Renderer({ part, question, selectedAnswer, showResult, onAnswer }: Props) {
  return (
    <div className="space-y-5">
      {/* Photograph Container */}
      {(part.imageUrl || question.id) && (
        <div className="neo-card p-3 bg-white border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-2xl flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-2 px-1">
            <Badge className="bg-[#fdc800] text-slate-900 border-2 border-slate-900 font-black text-xs">
              Part 1: Photographs (Hình ảnh #{question.order})
            </Badge>
            <span className="text-xs font-bold text-slate-500">Quan sát ảnh và chọn phát biểu đúng</span>
          </div>
          <img
            src={part.imageUrl || 'https://placehold.co/600x400/1c293c/fbfbf9?text=TOEIC+Part+1+Photograph'}
            alt="TOEIC Part 1 Photograph"
            className="w-full max-h-80 object-contain rounded-xl border-2 border-slate-900"
          />
        </div>
      )}

      {/* Answer Options Grid */}
      <div className="space-y-3">
        <div className="text-xs font-black uppercase tracking-wider text-slate-600 px-1">
          {showResult ? 'Kết quả & Transcript chi tiết:' : 'Chọn đáp án bạn nghe được:'}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {question.options.map((optionText, idx) => {
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
                className={`neo-button w-full p-4 rounded-xl text-left transition-all active:neo-button-active flex items-start gap-3 ${cardStyle}`}
              >
                <span className="w-7 h-7 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {letter}
                </span>

                <div className="flex-1 min-w-0">
                  {/* Standard TOEIC Exam Mode: Hide text until submitted */}
                  {!showResult ? (
                    <span className="font-black text-sm">Đáp án ({letter})</span>
                  ) : (
                    <span className="font-bold text-sm leading-snug block">
                      {optionText}
                    </span>
                  )}
                </div>

                {showResult && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />}
                {showResult && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />}
              </button>
            )
          })}
        </div>
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
