import { useEffect, useRef } from 'react'
import {
  CheckCircle2,
  Headphones,
  Languages,
  Lightbulb,
  XCircle,
  ShieldAlert,
  ArrowRight,
  HelpCircle,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { MissionStageType, QuestionDefinition } from '../mission.types'

export interface MissionQuestionFeedback {
  correct: boolean
  finalized: boolean
  text: string
}

export interface MissionQuestionStageProps {
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
  isRetry?: boolean
  combo?: number
  bossHpPercent?: number
  showBossHud?: boolean
  interactionLocked?: boolean
  compactMode?: boolean
  embedded?: boolean
  onTypingFocusChange?: (focused: boolean) => void
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
  index: _index,
  total: _total,
  answerValue,
  hintLevel,
  contextTranslation,
  contextTranslationShown,
  feedback,
  isLastQuestion,
  isRetry,
  combo: _combo = 0,
  bossHpPercent,
  showBossHud = true,
  interactionLocked = false,
  compactMode = false,
  embedded = false,
  onTypingFocusChange,
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
    if (interactionLocked) return
    if (feedback?.finalized) {
      continueContainerRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
      const timer = setTimeout(() => {
        continueContainerRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
      }, 50)
      return () => clearTimeout(timer)
    } else if (!question.options) {
      inputRef.current?.focus()
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [feedback?.finalized, interactionLocked, question.id, question.options])

  // Global Enter key listener when answer is finalized so Enter always advances
  useEffect(() => {
    if (!feedback?.finalized || interactionLocked) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !event.repeat) {
        event.preventDefault()
        onNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [feedback?.finalized, interactionLocked, onNext])

  const hasHint = !feedback?.finalized && !question.options && Boolean(question.hint) && hintLevel < 2
  const hasTranslation = Boolean(contextTranslation) && question.type === 'context_cloze' && !contextTranslationShown && !feedback?.finalized

  return (
    <div
      className={
        (embedded
          ? 'shrink-0 transition-all rounded-2xl border-3 border-slate-900 bg-white/95 backdrop-blur-sm shadow-[4px_4px_0px_#000] '
          : 'neo-card rounded-2xl border-4 border-slate-900 transition-all ' +
            (isBoss
              ? 'shadow-[6px_6px_0px_#9f1239] '
              : 'shadow-[6px_6px_0px_#000] ')) +
        (isBoss && compactMode
          ? 'space-y-3 p-3.5 sm:space-y-3.5 sm:p-5 '
          : 'space-y-3.5 p-3.5 sm:space-y-4 sm:p-5 ') +
        (embedded
          ? ''
          : isBoss
            ? 'bg-gradient-to-b from-rose-50 to-white'
            : 'bg-white')
      }
    >
      {/* Retry Indicator */}
      {isRetry ? (
        <div className="flex justify-center -mb-1">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border-2 border-slate-900 bg-amber-300 text-slate-900 font-black text-[10px] uppercase tracking-wider shadow-[1.5px_1.5px_0px_#000]">
            <RotateCcw className="h-3 w-3" /> Thử lại
          </span>
        </div>
      ) : null}

      {/* Boss Health Bar (Only in Boss stage) */}
      {isBoss && showBossHud && bossHpPercent !== undefined ? (
        <div className="p-3 rounded-xl border-2 border-rose-900 bg-rose-100/70 shadow-[2px_2px_0px_#9f1239] space-y-1.5">
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
            className="h-12 w-12 rounded-2xl border-3 border-slate-900 shadow-[3px_3px_0px_#000] p-0 flex items-center justify-center bg-[#432dd7] hover:bg-indigo-700 text-white"
            aria-label="Phát lại audio"
            title="Phát lại audio"
            onClick={onPlayAudio}
          >
            <Headphones className="h-6 w-6" />
          </Button>
        </div>
      ) : null}

      {/* Question Prompt */}
      <div className="text-center space-y-1">
        <h1
          className={
            'font-black text-slate-900 leading-snug tracking-tight ' +
            (isBoss && compactMode ? 'text-xl sm:text-2xl' : 'text-xl sm:text-2xl')
          }
        >
          {question.prompt}
        </h1>
      </div>

      {/* Context Translation Display */}
      {contextTranslation && question.type === 'context_cloze' && contextTranslationShown ? (
        <div className="rounded-xl border-2 border-slate-900 bg-amber-50 p-3 text-xs sm:text-sm font-bold text-slate-900 shadow-[2px_2px_0px_#000] flex items-start gap-2.5">
          <Languages className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
          <span>{contextTranslation}</span>
        </div>
      ) : null}

      {/* Hint Level Display */}
      {hintLevel > 0 ? (
        <div className="rounded-xl border-2 border-slate-900 bg-amber-50 p-3 text-xs sm:text-sm font-bold text-slate-900 shadow-[2px_2px_0px_#000] flex items-start gap-2.5">
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
        <div className="grid gap-2.5 sm:grid-cols-2">
          {question.options.map((option) => {
            const isSelected = answerValue === option.label
            return (
              <Button
                key={option.id}
                variant={isSelected ? 'secondary' : 'ghost'}
                className={
                  'min-h-12 whitespace-normal text-left font-black text-sm sm:text-base border-3 rounded-xl p-3 transition-all ' +
                  (isSelected
                    ? 'border-slate-900 bg-[#fdc800] text-slate-900 shadow-[4px_4px_0px_#000] translate-y-[-2px]'
                    : 'border-slate-900 bg-white text-slate-900 shadow-[2px_2px_0px_#000] hover:bg-slate-50')
                }
                disabled={interactionLocked}
                onClick={() => {
                  if (!feedback?.finalized && !interactionLocked) onAnswerChange(option.label)
                }}
              >
                <span>{option.label}</span>
              </Button>
            )
          })}
        </div>
      ) : (
        <div className="relative">
          <Input
            ref={inputRef}
            autoFocus
            value={answerValue}
            onFocus={(event) => {
              const target = event.currentTarget
              onTypingFocusChange?.(true)
              window.setTimeout(() => {
                target.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
              }, 120)
            }}
            onBlur={() => onTypingFocusChange?.(false)}
            onChange={(event) => onAnswerChange(event.target.value)}
            onKeyDown={(event) => {
              if (interactionLocked || event.key !== 'Enter') return
              event.preventDefault()
              if (feedback?.finalized) onNext()
              else if (answerValue.trim()) onSubmit()
            }}
            disabled={feedback?.finalized || interactionLocked}
            placeholder="Nhập câu trả lời..."
            className={
              'text-base sm:text-lg font-black border-3 border-slate-900 shadow-[3px_3px_0px_#000] rounded-xl text-center bg-white scroll-mt-[250px] ' +
              (hasHint && hasTranslation
                ? 'pr-44 sm:pr-48 '
                : hasHint || hasTranslation
                  ? 'pr-24 sm:pr-28 '
                  : '') +
              (isBoss && compactMode ? 'p-2.5 sm:p-3.5' : 'p-3 sm:p-3.5')
            }
          />

          {/* Action buttons inside input right corner */}
          {(hasHint || hasTranslation) && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {hasTranslation && (
                <Button
                  variant="ghost"
                  type="button"
                  aria-label="Xem nghĩa câu"
                  title="Xem nghĩa câu"
                  className="h-8 px-2 sm:px-2.5 text-xs font-black border-2 border-slate-900 bg-sky-50 hover:bg-sky-100 text-slate-900 rounded-lg shadow-[1.5px_1.5px_0px_#000] flex items-center gap-1"
                  disabled={interactionLocked}
                  onClick={onShowTranslation}
                >
                  <Languages className="h-3.5 w-3.5 text-sky-700" />
                  <span className="hidden sm:inline">Xem nghĩa câu</span>
                  <span className="sm:hidden">Dịch</span>
                </Button>
              )}
              {hasHint && (
                <Button
                  variant="ghost"
                  type="button"
                  aria-label={hintLevel === 0 ? 'Gợi ý' : 'Gợi ý thêm'}
                  title={hintLevel === 0 ? 'Gợi ý' : 'Gợi ý thêm'}
                  className="h-8 px-2.5 text-xs font-black border-2 border-slate-900 bg-amber-50 hover:bg-amber-100 text-slate-900 rounded-lg shadow-[1.5px_1.5px_0px_#000] flex items-center gap-1"
                  disabled={interactionLocked}
                  onClick={onHint}
                >
                  <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                  <span>{hintLevel === 0 ? 'Gợi ý' : 'Gợi ý thêm'}</span>
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Answer Feedback Banner */}
      {feedback ? (
        <div
          className={
            'rounded-xl border-3 p-3.5 font-bold shadow-[3px_3px_0px_#000] ' +
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
            <div className="mt-2 pt-2 border-t border-rose-200 text-xs sm:text-sm font-bold text-rose-900">
              Đáp án: <strong className="font-black underline">{question.acceptedAnswers[0]}</strong>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Footer Actions */}
      {!feedback?.finalized ? (
        <div
          className={
            'pt-1 ' +
            (isBoss && compactMode
              ? 'sticky bottom-2 z-40 rounded-xl border-2 border-slate-900 bg-white/95 p-2 shadow-[3px_3px_0px_#000] backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none'
              : '')
          }
        >
          {!question.options ? (
            <div className="flex items-center gap-2.5">
              <Button
                variant="ghost"
                aria-label="Chưa nhớ từ này"
                title="Chưa nhớ từ này"
                className="w-[36%] sm:w-[32%] py-3 text-xs sm:text-sm font-black border-3 border-slate-900 bg-slate-50 hover:bg-slate-100 text-slate-700 shadow-[3px_3px_0px_#000] rounded-xl flex items-center justify-center gap-1.5 shrink-0"
                disabled={interactionLocked}
                onClick={onSkip}
              >
                <HelpCircle className="h-4 w-4 shrink-0 text-slate-500" />
                <span className="truncate">Chưa nhớ</span>
              </Button>
              <Button
                className="flex-1 py-3 text-base font-black bg-[#fdc800] hover:bg-amber-300 text-slate-900 border-3 border-slate-900 shadow-[3px_3px_0px_#000] rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!answerValue.trim() || interactionLocked}
                onClick={onSubmit}
              >
                Kiểm tra
              </Button>
            </div>
          ) : (
            <Button
              className="w-full py-3 text-base font-black bg-[#fdc800] hover:bg-amber-300 text-slate-900 border-3 border-slate-900 shadow-[3px_3px_0px_#000] rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!answerValue.trim() || interactionLocked}
              onClick={onSubmit}
            >
              Kiểm tra
            </Button>
          )}
        </div>
      ) : (
        <div ref={continueContainerRef} className="pt-1">
          <Button
            className="w-full py-3.5 text-base font-black bg-[#432dd7] hover:bg-indigo-700 text-white border-3 border-slate-900 shadow-[4px_4px_0px_#000] rounded-xl flex items-center justify-center gap-2 cursor-pointer"
            autoFocus={!interactionLocked}
            disabled={interactionLocked}
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
