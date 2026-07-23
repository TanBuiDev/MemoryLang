import type { ListeningQuestion } from '@/types/listening.types'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle } from 'lucide-react'

interface Props {
  question: ListeningQuestion
  selectedAnswer?: number
  showResult?: boolean
  onAnswer: (questionOrder: number, answerIndex: number) => void
}

export function Part3Renderer({ question, selectedAnswer, showResult, onAnswer }: Props) {
  return (
    <div className="space-y-4 neo-card p-4 sm:p-5 bg-white border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-2xl">
      {/* Question Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge className="bg-purple-600 text-white font-black text-xs px-2.5 py-0.5 border border-slate-900">
            Câu #{question.order}
          </Badge>
          <h3 className="font-black text-sm sm:text-base text-slate-900 leading-snug">
            {question.questionText}
          </h3>
        </div>
      </div>

      {/* 4 Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        {question.options.map((optionText, idx) => {
          const letter = String.fromCharCode(65 + idx)
          const isSelected = selectedAnswer === idx
          const isCorrect = question.correctIndex === idx

          let cardStyle = "bg-slate-50 border-2 border-slate-900 text-slate-900 shadow-[2px_2px_0px_0px_#000] hover:bg-amber-50"
          if (showResult) {
            if (isCorrect) {
              cardStyle = "bg-emerald-100 border-2 border-emerald-950 text-emerald-950 shadow-[2px_2px_0px_0px_#000]"
            } else if (isSelected && !isCorrect) {
              cardStyle = "bg-rose-100 border-2 border-rose-950 text-rose-950 shadow-[2px_2px_0px_0px_#000]"
            } else {
              cardStyle = "bg-slate-100 border-2 border-slate-300 opacity-60 text-slate-700"
            }
          } else if (isSelected) {
            cardStyle = "bg-[#fdc800] border-2 border-slate-900 text-slate-900 shadow-[2px_2px_0px_0px_#000]"
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={() => !showResult && onAnswer(question.order, idx)}
              disabled={showResult}
              className={`neo-button w-full p-3 rounded-xl text-left transition-all active:neo-button-active flex items-center gap-2.5 ${cardStyle}`}
            >
              <span className="w-6 h-6 rounded-md bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                {letter}
              </span>
              <span className="font-bold text-xs sm:text-sm leading-tight flex-1">
                {optionText}
              </span>
              {showResult && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />}
              {showResult && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-700 shrink-0" />}
            </button>
          )
        })}
      </div>

      {/* Explanation */}
      {showResult && question.explanation && (
        <div className="mt-2 p-3 bg-purple-50 border-2 border-slate-900 rounded-xl text-xs font-bold text-slate-800 space-y-1">
          <span className="text-purple-900 font-black uppercase block">💡 Giải thích chi tiết:</span>
          <p>{question.explanation}</p>
        </div>
      )}
    </div>
  )
}
