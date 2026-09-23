import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
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
          const availableOptions = options.filter((option) =>
            option.value === selected || !Object.entries(selections).some(
              ([questionId, value]) => questionId !== question.id && value === option.value,
            ),
          )
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
                <Select
                  value={selected}
                  onChange={(value) => {
                    if (!reviewed) onSelect(question.id, value)
                  }}
                  options={availableOptions}
                  placeholder="Chọn nghĩa..."
                  disabled={reviewed}
                />
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

      {reviewed ? (
        <Button className="w-full" onClick={onContinue}>
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
