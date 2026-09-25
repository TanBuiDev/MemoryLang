import { useEffect, useRef, useState } from 'react'
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Puzzle,
  Sparkles,
  XCircle,
  ArrowRight,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { normalizeMissionAnswer } from '../generators'
import { formatMissionPartOfSpeech } from '../missionInteraction'
import type { QuestionDefinition } from '../mission.types'

interface MissionMatchingStageProps {
  questions: QuestionDefinition[]
  selections: Record<string, string>
  reviewed: boolean
  options: Array<{ value: string; label: string }>
  partOfSpeechByTermId?: Record<string, string | null>
  onSelect: (questionId: string, value: string) => void
  onCheck: () => void
  onContinue: () => void
}

export function MissionMatchingStage({
  questions,
  selections,
  reviewed,
  options,
  partOfSpeechByTermId = {},
  onSelect,
  onCheck,
  onContinue,
}: MissionMatchingStageProps) {
  const [openQuestionId, setOpenQuestionId] = useState<string | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!openQuestionId) return
    cardRef.current?.querySelector<HTMLButtonElement>('[data-matching-option]')?.focus()
    const closeOutside = (event: PointerEvent) => {
      if (!cardRef.current?.contains(event.target as Node)) setOpenQuestionId(null)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [openQuestionId])

  const selectedCount = questions.filter((q) => Boolean(selections[q.id])).length
  const allSelected = selectedCount === questions.length

  return (
    <div ref={cardRef} className="neo-card space-y-6 p-6 sm:p-8 bg-white border-4 border-slate-900 shadow-[6px_6px_0px_#000] rounded-2xl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b-2 border-slate-900">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border-2 border-slate-900 bg-indigo-100 text-indigo-950 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_#000]">
            <Puzzle className="h-3.5 w-3.5 text-indigo-700" />
            <span>Ghép từ</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Nối từ với nghĩa chính xác
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-bold text-slate-600">
            Chọn nghĩa tương ứng cho từng từ vựng, sau đó bấm kiểm tra.
          </p>
        </div>

        {/* Progress Badge */}
        <div className="shrink-0 flex items-center gap-2 px-3.5 py-1.5 bg-yellow-100 border-2 border-slate-900 rounded-xl font-black text-xs text-slate-900 shadow-[2px_2px_0px_#000]">
          <Layers className="h-4 w-4 text-amber-700" />
          <span>Tiến độ: {selectedCount}/{questions.length}</span>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-3.5">
        {questions.map((question, idx) => {
          const selected = selections[question.id] ?? ''
          const correct =
            normalizeMissionAnswer(selected) ===
            normalizeMissionAnswer(question.acceptedAnswers[0] ?? '')

          return (
            <div
              key={question.id}
              className={
                'rounded-xl border-3 p-3.5 sm:p-4 transition-all ' +
                (reviewed
                  ? correct
                    ? 'border-emerald-600 bg-emerald-50/90 shadow-[3px_3px_0px_#059669]'
                    : 'border-rose-600 bg-rose-50/90 shadow-[3px_3px_0px_#e11d48]'
                  : selected
                    ? 'border-slate-900 bg-slate-50/80 shadow-[3px_3px_0px_#000]'
                    : 'border-slate-900 bg-white shadow-[2px_2px_0px_#000]')
              }
            >
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] sm:items-center">
                {/* Left side: English term */}
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-slate-900 bg-yellow-300 text-xs font-black text-slate-900 shadow-[1.5px_1.5px_0px_#000]">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
                      {question.prompt}
                    </p>
                    {partOfSpeechByTermId[question.targetTermId] ? (
                      <p className="text-xs font-bold text-slate-500 mt-0.5">
                        {formatMissionPartOfSpeech(partOfSpeechByTermId[question.targetTermId])}
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Right side: Dropdown Select Button */}
                <div
                  className="relative"
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      event.preventDefault()
                      setOpenQuestionId(null)
                      event.currentTarget.querySelector<HTMLButtonElement>('[aria-expanded]')?.focus()
                    }
                    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                      const choices = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[data-matching-option]')]
                      if (choices.length === 0) return
                      event.preventDefault()
                      const index = choices.indexOf(document.activeElement as HTMLButtonElement)
                      const step = event.key === 'ArrowDown' ? 1 : -1
                      choices[(index + step + choices.length) % choices.length].focus()
                    }
                  }}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) setOpenQuestionId(null)
                  }}
                >
                  <Button
                    variant="ghost"
                    className={
                      'w-full justify-between text-left border-2 rounded-xl py-3 px-3.5 transition-all ' +
                      (reviewed
                        ? correct
                          ? 'border-emerald-700 bg-emerald-100 text-emerald-950 font-black'
                          : 'border-rose-700 bg-rose-100 text-rose-950 font-black'
                        : selected
                          ? 'border-slate-900 bg-[#fdc800] text-slate-900 font-black shadow-[2px_2px_0px_#000]'
                          : 'border-slate-300 bg-slate-50 text-slate-500 font-bold hover:border-slate-900 hover:bg-white')
                    }
                    aria-label={'Chọn nghĩa của ' + question.prompt}
                    aria-expanded={openQuestionId === question.id}
                    disabled={reviewed}
                    onClick={() => setOpenQuestionId(openQuestionId === question.id ? null : question.id)}
                  >
                    <span className="truncate">{selected || 'Chọn nghĩa tương ứng...'}</span>
                    {reviewed ? (
                      correct ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
                      ) : (
                        <XCircle className="h-5 w-5 shrink-0 text-rose-700" />
                      )
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                    )}
                  </Button>

                  {/* Dropdown Options */}
                  {openQuestionId === question.id && !reviewed ? (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-40 max-h-60 overflow-y-auto rounded-xl border-3 border-slate-900 bg-white p-1.5 shadow-[5px_5px_0px_#000] space-y-1">
                      {selected ? (
                        <Button
                          variant="ghost"
                          className="w-full justify-start rounded-lg text-rose-700 hover:bg-rose-50 font-bold text-xs py-2"
                          onClick={() => {
                            onSelect(question.id, '')
                            setOpenQuestionId(null)
                          }}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1.5" /> Bỏ chọn
                        </Button>
                      ) : null}
                      {options.map((option) => {
                        const owner = questions.find(
                          (item) => item.id !== question.id && selections[item.id] === option.value
                        )
                        const isCurrent = selected === option.value
                        const label = option.label + (owner ? ' · Đã chọn cho ' + owner.prompt : '')
                        return (
                          <Button
                            key={option.value}
                            data-matching-option
                            variant="ghost"
                            className={
                              'w-full justify-between rounded-lg border-2 text-left font-bold text-sm py-2.5 px-3 transition-colors ' +
                              (isCurrent
                                ? 'border-slate-900 bg-[#fdc800] text-slate-900 shadow-[2px_2px_0px_#000]'
                                : owner
                                  ? 'border-amber-300 bg-amber-50/80 text-slate-700'
                                  : 'border-transparent text-slate-800 hover:border-slate-900 hover:bg-slate-100')
                            }
                            aria-label={label}
                            onClick={() => {
                              onSelect(question.id, option.value)
                              setOpenQuestionId(null)
                            }}
                            onKeyDown={(event) => {
                              if (event.key !== 'Enter') return
                              event.preventDefault()
                              onSelect(question.id, option.value)
                              setOpenQuestionId(null)
                            }}
                          >
                            <span className="truncate">{label}</span>
                            {isCurrent ? <Check className="h-4 w-4 shrink-0 text-slate-900" /> : null}
                          </Button>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Correct Answer Note on Wrong */}
              {reviewed && !correct ? (
                <div className="mt-2.5 pt-2 border-t border-rose-200 flex items-center gap-1.5 text-xs font-black text-rose-900">
                  <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>Đáp án đúng: <strong>{question.acceptedAnswers[0]}</strong></span>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      {/* Helpful Hint */}
      {!reviewed ? (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border-2 border-slate-900 text-xs font-bold text-slate-600">
          <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
          <span>Gợi ý: Bạn có thể chọn lại nghĩa bất cứ lúc nào trước khi bấm kiểm tra.</span>
        </div>
      ) : null}

      {/* Action Footer */}
      {reviewed ? (
        <Button
          className="w-full py-4 text-base font-black bg-[#432dd7] hover:bg-indigo-700 text-white border-3 border-slate-900 shadow-[4px_4px_0px_#000] rounded-xl flex items-center justify-center gap-2 cursor-pointer"
          autoFocus
          onClick={onContinue}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.repeat) {
              event.preventDefault()
              onContinue()
            }
          }}
        >
          <span>Tiếp tục</span>
          <ArrowRight className="h-5 w-5" />
        </Button>
      ) : (
        <Button
          className="w-full py-4 text-base font-black bg-[#fdc800] hover:bg-amber-300 text-slate-900 border-3 border-slate-900 shadow-[4px_4px_0px_#000] rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!allSelected}
          onClick={onCheck}
        >
          <Check className="h-5 w-5" />
          <span>Kiểm tra tất cả cặp</span>
        </Button>
      )}
    </div>
  )
}
