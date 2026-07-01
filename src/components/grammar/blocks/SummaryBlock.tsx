import type { LessonBlock, SummaryContent } from '@/types/grammar.types'

interface SummaryBlockProps {
  block: LessonBlock
}

export function SummaryBlock({ block }: SummaryBlockProps) {
  const { variant, items } = block.content as unknown as SummaryContent

  if (variant === 'card') {
    return (
      <div className="my-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item, i) => (
          <div
            key={i}
            className="border-2 border-(--border) rounded-lg p-4 bg-purple-50 font-semibold text-sm"
          >
            {item}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="my-4 p-4 border-2 border-(--border) rounded-lg bg-yellow-50">
      <p className="font-bold mb-2">TOM TAT</p>
      <ul className="list-disc list-inside space-y-1 text-sm">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
