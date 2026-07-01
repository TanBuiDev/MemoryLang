import type { LessonBlock, CodeContent } from '@/types/grammar.types'

interface CodeBlockProps {
  block: LessonBlock
}

export function CodeBlock({ block }: CodeBlockProps) {
  const { text } = block.content as unknown as CodeContent
  return (
    <pre className="my-4 p-4 bg-slate-900 text-green-300 rounded-lg border-2 border-(--border) overflow-x-auto text-sm leading-relaxed font-mono whitespace-pre-wrap">
      {text}
    </pre>
  )
}
