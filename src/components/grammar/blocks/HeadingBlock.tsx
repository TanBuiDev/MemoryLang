import type { LessonBlock, HeadingContent } from '@/types/grammar.types'

interface HeadingBlockProps {
  block: LessonBlock
}

const levelClasses: Record<number, string> = {
  2: 'text-2xl font-black mt-8 mb-4',
  3: 'text-xl font-bold mt-6 mb-3',
  4: 'text-lg font-semibold mt-4 mb-2',
}

export function HeadingBlock({ block }: HeadingBlockProps) {
  const { text, level, icon } = block.content as unknown as HeadingContent
  const className = levelClasses[level] ?? levelClasses[2]

  const content = (
    <>
      {icon && <span className="mr-2">{icon}</span>}
      {text}
    </>
  )

  switch (level) {
    case 2:
      return <h2 className={className}>{content}</h2>
    case 3:
      return <h3 className={className}>{content}</h3>
    case 4:
      return <h4 className={className}>{content}</h4>
  }
}
