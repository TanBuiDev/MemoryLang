import { Select } from '@/components/ui/select'

export interface MatchingAttemptItem {
  id: string
  text: string
}

interface MatchingAttemptProps {
  leftItems: MatchingAttemptItem[]
  rightItems: MatchingAttemptItem[]
  answers: Record<string, string>
  onAnswer: (leftItemId: string, rightItemId: string) => void
  disabled?: boolean
}

export function MatchingAttempt({ leftItems, rightItems, answers, onAnswer, disabled = false }: MatchingAttemptProps) {
  const selectedRightItemIds = new Set(Object.values(answers).filter(Boolean))

  return <section className="space-y-4" aria-label="Ghép cặp">
    <div className="border-2 border-border bg-muted/30 p-3 text-sm font-semibold">
      Chọn mục tương ứng ở cột bên phải cho từng mục ở cột bên trái.
    </div>
    <div className="space-y-3">
      {leftItems.map((leftItem, index) => {
        const selectedRightItemId = answers[leftItem.id] ?? ''
        const options = [
          { value: '', label: 'Chọn mục tương ứng' },
          ...rightItems
            .filter((rightItem) => rightItem.id === selectedRightItemId || !selectedRightItemIds.has(rightItem.id))
            .map((rightItem) => ({ value: rightItem.id, label: rightItem.text })),
        ]
        return <article key={leftItem.id} className="neo-card grid gap-3 border-2 border-border bg-card p-4 shadow-[2px_2px_0_var(--border)] md:grid-cols-2 md:items-center">
          <p className="font-black"><span className="mr-2 inline-block border border-border bg-primary px-1.5 py-0.5 text-xs text-black">{index + 1}</span>{leftItem.text}</p>
          <Select
            id={`matching-${leftItem.id}`}
            value={selectedRightItemId}
            options={options}
            disabled={disabled}
            onChange={(rightItemId) => onAnswer(leftItem.id, rightItemId)}
          />
        </article>
      })}
    </div>
  </section>
}
