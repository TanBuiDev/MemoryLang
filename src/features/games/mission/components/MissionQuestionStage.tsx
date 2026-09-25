import { useEffect, useRef } from 'react'
import {
  CheckCircle2,
  Headphones,
  Languages,
  Lightbulb,
  Swords,
  XCircle,
  ShieldAlert,
  Flame,
  ArrowRight,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { MissionStageType, QuestionDefinition } from '../mission.types'

export interface MissionQuestionFeedback {
  correct: boolean
  finalized: boolean
  text: string
}

interface MissionQuestionStageProps {
  stageType: MissionStageType
  question: QuestionDefinition
  index: number
  total: number
  answerValue: string
  hintLevel: number
  contextTranslation: string | null
  contextTranslationShown: boolean
  feedback: MissionQuestionFeedback | null
  isLastQuestion: boolean
  combo?: number
  bossHpPercent?: number
  onAnswerChange: (value: string) => void
  onSubmit: () => void
  onNext: () => void
  onPlayAudio: () => void
  onHint: () => void
  onShowTranslation: () => void
  onSkip: () => void
}

export function MissionQuestionStage({
  stageType,
  question,
  index,
  total,
  answerValue,
  hintLevel,
  contextTranslation,
  contextTranslationShown,
  feedback,
  isLastQuestion,
  combo = 0,
  bossHpPercent,
  onAnswerChange,
  onSubmit,
  onNext,
  onPlayAudio,
  onHint,
  onShowTranslation,
  onSkip,
}: MissionQuestionStageProps) {
  const isBoss = stageType === 'boss'
  const continueContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus Continue button when answer is finalized, or re-focus input on new question
  useEffect(() => {
    if (feedback?.finalized) {
      continueContainerRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    } else if (!question.options) {
      inputRef.current?.focus()
    }
  }, [feedback?.finalized, question.id, question.options])

  // Global Enter key listener when answer is finalized so Enter always advances
  useEffect(() => {
    if (!feedback?.finalized) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !event.repeat) {
        event.preventDefault()
        onNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [feedback?.finalized, onNext])

  return (
    <div
      className={
        'neo-card space-y-6 p-6 sm:p-8 rounded-2xl border-4 border-slate-900 transition-all ' +
        (isBoss
          ? 'bg-gradient-to-b from-rose-50 to-white shadow-[6px_6px_0px_#9f1239]'
          : 'bg-white shadow-[6px_6px_0px_#000]')
      }
    >
      {/* Top Bar: Stage & Question Meta & Combo */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b-2 border-slate-900">
        <div className="flex items-center gap-2">
          {isBoss ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-rose-900 bg-rose-200 text-rose-950 font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_#9f1239]">
              <Swords className="h-4 w-4 text-rose-700" />
              <span>THỬ THÁCH CUỐI</span>
            </div>
          ) : (
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">
              Câu {index + 1}/{total}
            </span>
          )}
        </div>

        {/* Streak Combo Badge */}
        {combo >= 2 ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-slate-900 bg-[#fdc800] text-slate-900 font-black text-xs shadow-[2px_2px_0px_#000]">
            <Flame className="h-3.5 w-3.5 text-amber-700 fill-amber-700" />
            <span>Combo x{combo}!</span>
          </div>
        ) : null}
      </div>

      {/* Boss Health Bar (Only in Boss stage) */}
      {isBoss && bossHpPercent !== undefined ? (
        <div className="p-3.5 rounded-xl border-2 border-rose-900 bg-rose-100/70 shadow-[2px_2px_0px_#9f1239] space-y-1.5">
          <div className="flex items-center justify-between text-xs font-black text-rose-950">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-rose-700" />
              Thanh Máu Trùm (Boss HP)
            </span>
            <span>{Math.round(bossHpPercent)}%</span>
          </div>
          <div className="h-3.5 w-full bg-white border-2 border-slate-900 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-rose-600 rounded-full transition-all duration-300"
              style={{ width: `${Math.max(0, Math.min(100, bossHpPercent))}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* Audio Button */}
      {question.audioText ? (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            className="h-14 w-14 rounded-2xl border-3 border-slate-900 shadow-[3px_3px_0px_#000] p-0 flex items-center justify-center bg-[#432dd7] hover:bg-indigo-700 text-white"
            aria-label="Phát lại audio"
            title="Phát lại audio"
            onClick={onPlayAudio}
          >
            <Headphones className="h-7 w-7" />
          </Button>
        </div>
      ) : null}

      {/* Question Prompt */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-snug tracking-tight">
          {question.prompt}
        </h1>
      </div>

      {/* Action Buttons: Hint & Translation */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {!feedback?.finalized && !question.options && question.hint && hintLevel < 2 ? (
          <Button
            variant="ghost"
            className="border-2 border-slate-900 bg-amber-50 hover:bg-amber-100 text-slate-900 font-black text-xs py-2 px-3.5 rounded-xl shadow-[2px_2px_0px_#000]"
            onClick={onHint}
          >
            <Lightbulb className="h-4 w-4 text-amber-600" />
            <span>{hintLevel === 0 ? 'Gợi ý' : 'Gợi ý thêm'}</span>
          </Button>
        ) : null}

        {contextTranslation && question.type === 'context_cloze' && !contextTranslationShown && !feedback?.finalized ? (
          <Button
            variant="ghost"
            className="border-2 border-slate-900 bg-sky-50 hover:bg-sky-100 text-slate-900 font-black text-xs py-2 px-3.5 rounded-xl shadow-[2px_2px_0px_#000]"
            onClick={onShowTranslation}
          >
            <Languages className="h-4 w-4 text-sky-700" />
            <span>Xem nghĩa câu</span>
          </Button>
        ) : null}
      </div>

      {/* Context Translation Display */}
      {contextTranslation && question.type === 'context_cloze' && contextTranslationShown ? (
        <div className="rounded-xl border-2 border-slate-900 bg-amber-50 p-3.5 text-sm font-bold text-slate-900 shadow-[2px_2px_0px_#000] flex items-start gap-2.5">
          <Languages className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
          <span>{contextTranslation}</span>
        </div>
      ) : null}

      {/* Hint Level Display */}
      {hintLevel > 0 ? (
        <div className="rounded-xl border-2 border-slate-900 bg-amber-50 p-3.5 text-xs sm:text-sm font-bold text-slate-900 shadow-[2px_2px_0px_#000] flex items-start gap-2.5">
          <Lightbulb className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            Gợi ý: bắt đầu bằng “{question.hint?.firstLetter || '?'}”,{' '}
            {question.hint?.wordCount || 1} từ
            {hintLevel > 1 && question.hint?.ipa ? ' · ' + question.hint.ipa : ''}
            {hintLevel > 1
              ? ' · ' +
                question.acceptedAnswers[0]
                  .split(/\s+/)
                  .map((word) =>
                    word.length <= 2
                      ? word[0] + '·'
                      : word[0] + '·'.repeat(word.length - 2) + word[word.length - 1]
                  )
                  .join(' ')
              : ''}
          </div>
        </div>
      ) : null}

      {/* Answering Area: Options or Typing Input */}
      {question.options ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {question.options.map((option) => {
            const isSelected = answerValue === option.label
            return (
              <Button
                key={option.id}
                variant={isSelected ? 'secondary' : 'ghost'}
                className={
                  'min-h-14 whitespace-normal text-left font-black text-sm sm:text-base border-3 rounded-xl p-3.5 transition-all ' +
                  (isSelected
                    ? 'border-slate-900 bg-[#fdc800] text-slate-900 shadow-[4px_4px_0px_#000] translate-y-[-2px]'
                    : 'border-slate-900 bg-white text-slate-900 shadow-[2px_2px_0px_#000] hover:bg-slate-50')
                }
                onClick={() => {
                  if (!feedback?.finalized) onAnswerChange(option.label)
                }}
              >
                <span>{option.label}</span>
              </Button>
            )
          })}
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            ref={inputRef}
            autoFocus
            value={answerValue}
            onChange={(event) => onAnswerChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              if (feedback?.finalized) onNext()
              else if (answerValue.trim()) onSubmit()
            }}
            disabled={feedback?.finalized}
            placeholder="Nhập câu trả lời..."
            className="text-base sm:text-lg font-black border-3 border-slate-900 shadow-[3px_3px_0px_#000] rounded-xl p-3 sm:p-4 text-center bg-white"
          />
        </div>
      )}

      {/* Answer Feedback Banner */}
      {feedback ? (
        <div
          className={
            'rounded-xl border-3 p-4 font-bold shadow-[3px_3px_0px_#000] ' +
            (feedback.correct
              ? 'border-emerald-700 bg-emerald-50 text-emerald-950'
              : 'border-rose-700 bg-rose-50 text-rose-950')
          }
        >
          <div className="flex items-center gap-2">
            {feedback.correct ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-700 shrink-0" />
            ) : (
              <XCircle className="h-5 w-5 text-rose-700 shrink-0" />
            )}
            <span className="font-black text-sm">{feedback.text}</span>
          </div>

          {feedback.finalized && !feedback.correct ? (
            <div className="mt-2.5 pt-2 border-t border-rose-200 text-xs sm:text-sm font-bold text-rose-900">
              Đáp án: <strong className="font-black underline">{question.acceptedAnswers[0]}</strong>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Footer Actions */}
      {!feedback?.finalized ? (
        <div className="space-y-2.5 pt-2">
          <Button
            className="w-full py-3.5 text-base font-black bg-[#fdc800] hover:bg-amber-300 text-slate-900 border-3 border-slate-900 shadow-[4px_4px_0px_#000] rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!answerValue.trim()}
            onClick={onSubmit}
          >
            Kiểm tra
          </Button>
          {!question.options ? (
            <Button
              variant="ghost"
              className="w-full py-2.5 text-xs font-black text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5"
              onClick={onSkip}
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Chưa nhớ từ này</span>
            </Button>
          ) : null}
        </div>
      ) : (
        <div ref={continueContainerRef} className="pt-2">
          <Button
            className="w-full py-4 text-base font-black bg-[#432dd7] hover:bg-indigo-700 text-white border-3 border-slate-900 shadow-[4px_4px_0px_#000] rounded-xl flex items-center justify-center gap-2 cursor-pointer"
            autoFocus
            onClick={onNext}
          >
            <span>{isLastQuestion ? 'Hoàn thành Mission' : 'Tiếp tục'}</span>
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  )
}
