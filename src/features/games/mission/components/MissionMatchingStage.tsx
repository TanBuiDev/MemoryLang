import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { normalizeMissionAnswer } from '../generators'
import type { QuestionDefinition } from '../mission.types'

interface MissionMatchingStageProps {
  questions: QuestionDefinition[]
  selections: Record<string, string>
  reviewed: boolean
  options: Array<{ value: string; label: string }>
  onSelect: (questionId: string, value: string) => void
  onCheck: () => void
  onContinue: () => void
}

export function MissionMatchingStage({
  questions,
  selections,
  reviewed,
  options,
  onSelect,
  onCheck,
  onContinue,
}: MissionMatchingStageProps) {
  const [openQuestionId, setOpenQuestionId] = useState<string | null>(null)
  return (
    <div className="neo-card space-y-5 p-6 sm:p-8">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Matching
        </p>
        <h1 className="mt-1 text-2xl font-black">Ghép mỗi từ với nghĩa đúng</h1>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          Hoàn thành tất cả cặp rồi kiểm tra cùng một lúc.
        </p>
      </div>

      <div className="space-y-3">
        {questions.map((question) => {
          const selected = selections[question.id] ?? ''
          const correct =
            normalizeMissionAnswer(selected) ===
            normalizeMissionAnswer(question.acceptedAnswers[0] ?? '')

          return (
            <div
              key={question.id}
              className={
                'rounded-xl border-2 p-3 ' +
                (reviewed
                  ? correct
                    ? 'border-emerald-700 bg-emerald-50'
                    : 'border-rose-700 bg-rose-50'
                  : 'border-border bg-muted/20')
              }
            >
              <div className="grid gap-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:items-center">
                <p className="text-lg font-black">{question.prompt}</p>
                <div className="relative" onKeyDown={(event) => {
                  if (event.key === 'Escape') setOpenQuestionId(null)
                }}>
                  <Button
                    variant="ghost"
                    className="w-full justify-between text-left"
                    aria-label={'Chọn nghĩa của ' + question.prompt}
                    aria-expanded={openQuestionId === question.id}
                    disabled={reviewed}
                    onClick={() => setOpenQuestionId(openQuestionId === question.id ? null : question.id)}
                  >
                    <span>{selected || 'Chọn nghĩa...'}</span><ChevronDown className="h-4 w-4 shrink-0" />
                  </Button>
                  {openQuestionId === question.id && !reviewed ? (
                    <div className="absolute left-0 right-0 top-full z-30 max-h-60 overflow-y-auto rounded-b-lg border-2 border-border bg-card shadow-[3px_3px_0px_#1c293c]">
                      {selected ? <Button variant="ghost" className="w-full justify-start rounded-none" onClick={() => { onSelect(question.id, ''); setOpenQuestionId(null) }}>Bỏ chọn</Button> : null}
                      {options.map((option) => {
                        const owner = questions.find((item) => item.id !== question.id && selections[item.id] === option.value)
                        const label = option.label + (owner ? ' · Đã chọn cho ' + owner.prompt : '')
                        return <Button
                          key={option.value}
                          variant="ghost"
                          className={'w-full justify-between rounded-none border-t border-border text-left ' + (owner ? 'bg-amber-100' : '')}
                          aria-label={label}
                          onClick={() => { onSelect(question.id, option.value); setOpenQuestionId(null) }}
                          onKeyDown={(event) => {
                            if (event.key !== 'Enter') return
                            event.preventDefault()
                            onSelect(question.id, option.value)
                            setOpenQuestionId(null)
                          }}
                        ><span>{label}</span>{selected === option.value ? <Check className="h-4 w-4" /> : null}</Button>
                      })}
                    </div>
                  ) : null}
                </div>
              </div>

              {reviewed && !correct ? (
                <p className="mt-2 text-xs font-bold text-rose-900">
                  Đáp án đúng: {question.acceptedAnswers[0]}
                </p>
              ) : null}
            </div>
          )
        })}
      </div>

      {!reviewed ? (
        <p className="text-xs font-semibold text-muted-foreground">
          Chọn lại một nghĩa sẽ trả hàng cũ về trạng thái chưa chọn.
        </p>
      ) : null}

      {reviewed ? (
        <Button className="w-full" autoFocus onClick={onContinue} onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.repeat) {
            event.preventDefault()
            onContinue()
          }
        }}>
          Tiếp tục
        </Button>
      ) : (
        <Button
          className="w-full"
          disabled={questions.some((question) => !selections[question.id])}
          onClick={onCheck}
        >
          Kiểm tra tất cả cặp
        </Button>
      )}
    </div>
  )
}
