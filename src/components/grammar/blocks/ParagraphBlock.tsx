import type { LessonBlock, ParagraphContent } from '@/types/grammar.types'

interface ParagraphBlockProps {
  block: LessonBlock
}

export function ParagraphBlock({ block }: ParagraphBlockProps) {
  const { html } = block.content as unknown as ParagraphContent
  return (
    <div
      className="prose prose-slate max-w-none my-3 leading-relaxed"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
