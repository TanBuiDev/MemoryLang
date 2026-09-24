import { CheckCircle2, Headphones, Languages, Lightbulb, Swords, XCircle } from 'lucide-react'
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
  onAnswerChange: (value: string) => void
  onSubmit: () => void
  onNext: () => void
  onPlayAudio: () => void
  onHint: () => void
  onShowTranslation: () => void
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
  onAnswerChange,
  onSubmit,
  onNext,
  onPlayAudio,
  onHint,
  onShowTranslation,
}: MissionQuestionStageProps) {
  return (
    <div className="neo-card space-y-5 p-6 sm:p-8">
      {stageType === 'boss' ? (
        <div className="flex items-center gap-2 font-black text-rose-700">
          <Swords className="h-5 w-5" /> BOSS BATTLE
        </div>
      ) : null}

      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
        Câu {index + 1}/{total}
      </p>

      {question.audioText ? (
        <Button variant="secondary" className="h-11 w-11 p-0" aria-label="Phát lại audio" title="Phát lại audio" onClick={onPlayAudio}>
          <Headphones className="h-5 w-5" />
        </Button>
      ) : null}

      <h1 className="text-2xl font-black leading-relaxed">{question.prompt}</h1>

      {!feedback?.finalized && question.type === 'listening_typing' && (hintLevel === 0 || hintLevel === 1 && Boolean(question.hint?.ipa)) ? (
        <Button variant="ghost" onClick={onHint}>
          <Lightbulb className="h-4 w-4" /> {hintLevel === 0 ? 'Gợi ý' : 'Gợi ý thêm'}
        </Button>
      ) : null}

      {contextTranslation && question.type === 'context_cloze' ? (
        contextTranslationShown ? (
          <div className="rounded-xl border-2 border-amber-600 bg-amber-50 p-3 text-sm font-bold text-amber-950">
            <Languages className="mr-2 inline h-4 w-4" /> {contextTranslation}
          </div>
        ) : !feedback?.finalized ? (
          <Button variant="ghost" onClick={onShowTranslation}>
            <Languages className="h-4 w-4" /> Xem nghĩa câu
          </Button>
        ) : null
      ) : null}

      {hintLevel > 0 ? (
        <div className="rounded-xl border-2 border-amber-600 bg-amber-50 p-3 text-sm font-bold text-amber-950">
          <Lightbulb className="mr-2 inline h-4 w-4" />
          Gợi ý: bắt đầu bằng “{question.hint?.firstLetter || '?'}”,{' '}
          {question.hint?.wordCount || 1} từ
          {hintLevel > 1 && question.hint?.ipa ? ' · ' + question.hint.ipa : ''}
        </div>
      ) : null}

      {question.options ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {question.options.map((option) => (
            <Button
              key={option.id}
              variant={answerValue === option.label ? 'secondary' : 'ghost'}
              className="min-h-14 whitespace-normal text-left"
              onClick={() => {
                if (!feedback?.finalized) onAnswerChange(option.label)
              }}
            >
              {option.label}
            </Button>
          ))}
        </div>
      ) : (
        <Input
          autoFocus
          value={answerValue}
          onChange={(event) => onAnswerChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            if (feedback?.finalized) onNext()
            else onSubmit()
          }}
          disabled={feedback?.finalized}
          placeholder="Nhập câu trả lời..."
          className="text-lg"
        />
      )}

      {feedback ? (
        <div
          className={
            'rounded-xl border-2 p-4 font-bold ' +
            (feedback.correct
              ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
              : 'border-rose-700 bg-rose-50 text-rose-900')
          }
        >
          {feedback.correct ? (
            <CheckCircle2 className="mr-2 inline h-5 w-5" />
          ) : (
            <XCircle className="mr-2 inline h-5 w-5" />
          )}
          {feedback.text}
          {feedback.finalized && !feedback.correct ? (
            <div className="mt-2 text-sm">
              Đáp án: <strong>{question.acceptedAnswers[0]}</strong>
            </div>
          ) : null}
        </div>
      ) : null}

      {!feedback?.finalized ? (
        <Button className="w-full" disabled={!answerValue.trim()} onClick={onSubmit}>
          Kiểm tra
        </Button>
      ) : (
        <Button className="w-full" autoFocus onClick={onNext} onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.repeat) {
            event.preventDefault()
            onNext()
          }
        }}>
          {isLastQuestion ? 'Hoàn thành Mission' : 'Tiếp tục'}
        </Button>
      )}
    </div>
  )
}
