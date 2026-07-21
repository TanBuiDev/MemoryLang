import { useState } from 'react'
import type { LessonBlock, ExerciseGroupContent, ExerciseQuestion } from '@/types/grammar.types'
import { cn } from '@/utils/cn'
import { soundEffects } from '@/utils/soundEffects'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, HelpCircle } from 'lucide-react'

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
    if (selectedIndex === null) return
    setChecked(true)
    if (selectedIndex === question.correctIndex) {
      soundEffects.play('matchSuccess')
    } else {
      soundEffects.play('matchError')
    }
  }

  return (
    <div className="neo-card p-5 bg-white border-3 border-slate-900 shadow-[4px_4px_0px_0px_#000] rounded-2xl space-y-4">
      <p className="font-black text-sm sm:text-base text-slate-900 flex items-start gap-2">
        <span className="text-purple-700 font-black shrink-0">Câu {index + 1}:</span>
        <span className="leading-snug">{question.question}</span>
      </p>

      <div className="space-y-2.5">
        {question.options.map((option, oi) => {
          const letter = String.fromCharCode(65 + oi)
          let optionStyle = 'border-2 border-slate-900 rounded-xl p-3 cursor-pointer transition-all bg-white hover:bg-slate-50 shadow-[2px_2px_0px_0px_#000]'

          if (checked) {
            if (oi === question.correctIndex) {
              optionStyle = 'border-3 border-slate-900 rounded-xl p-3 bg-emerald-100 font-bold text-emerald-950 shadow-[2px_2px_0px_0px_#000]'
            } else if (oi === selectedIndex && !isCorrect) {
              optionStyle = 'border-3 border-slate-900 rounded-xl p-3 bg-rose-100 font-bold text-rose-950 shadow-[2px_2px_0px_0px_#000]'
            }
          } else if (oi === selectedIndex) {
            optionStyle = 'border-3 border-slate-900 rounded-xl p-3 bg-[#fdc800] font-black text-slate-900 shadow-[3px_3px_0px_0px_#000] translate-x-0.5 translate-y-0.5'
          }

          return (
            <div
              key={oi}
              className={optionStyle}
              onClick={() => {
                if (!checked) {
                  soundEffects.play('cardClick')
                  setSelectedIndex(oi)
                }
              }}
            >
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className="font-black text-purple-700 bg-purple-100 border border-slate-900 px-2 py-0.5 rounded-md">
                  {letter}
                </span>
                <span className="font-bold">{option}</span>
              </div>
            </div>
          )
        })}
      </div>

      {!checked ? (
        <Button
          onClick={handleCheck}
          disabled={selectedIndex === null}
          className={cn(
            'neo-button px-6 py-2.5 text-xs sm:text-sm font-black border-2 border-slate-900 rounded-xl shadow-[3px_3px_0px_0px_#000]',
            selectedIndex !== null
              ? 'bg-[#fdc800] hover:bg-amber-300 text-slate-900 cursor-pointer active:neo-button-active'
              : 'bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed shadow-none border-slate-300'
          )}
        >
          Kiểm tra đáp án
        </Button>
      ) : (
        <div
          className={cn(
            'p-4 border-3 border-slate-900 rounded-xl font-bold space-y-1.5 shadow-[3px_3px_0px_0px_#000]',
            isCorrect ? 'bg-emerald-100 text-emerald-950' : 'bg-rose-100 text-rose-950'
          )}
        >
          <div className="flex items-center gap-2 font-black text-sm">
            {isCorrect ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Chính xác! Hoàn thành xuất sắc.</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>
                  Chưa chính xác. Đáp án đúng là {String.fromCharCode(65 + question.correctIndex)}: {question.options[question.correctIndex]}
                </span>
              </>
            )}
          </div>

          {question.explanation && (
            <div className="pt-2 text-xs font-semibold text-slate-700 border-t border-slate-900/20 flex items-start gap-1.5">
              <HelpCircle className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
              <span>{question.explanation}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ExerciseGroupBlock({ block }: ExerciseGroupBlockProps) {
  const { instruction, questions } = block.content as unknown as ExerciseGroupContent

  return (
    <div className="my-6 space-y-4">
      {instruction && (
        <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
          🎯 {instruction}
        </h3>
      )}
      <div className="space-y-4">
        {questions.map((q, i) => (
          <QuestionCard key={q.id} question={q} index={i} />
        ))}
      </div>
    </div>
  )
}
