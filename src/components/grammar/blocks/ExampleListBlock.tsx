import type { LessonBlock, ExampleListContent } from '@/types/grammar.types'

interface ExampleListBlockProps {
  block: LessonBlock
}

export function ExampleListBlock({ block }: ExampleListBlockProps) {
  const { items } = block.content as unknown as ExampleListContent
  return (
    <ul className="my-4 space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0">{item.correct ? '✅' : '❌'}</span>
          <span dangerouslySetInnerHTML={{ __html: item.text }} />
        </li>
      ))}
    </ul>
  )
}
