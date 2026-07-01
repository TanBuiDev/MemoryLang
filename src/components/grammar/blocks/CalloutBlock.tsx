import type { LessonBlock, CalloutContent } from '@/types/grammar.types'

interface CalloutBlockProps {
  block: LessonBlock
}

const variantClasses: Record<string, string> = {
  warning: 'bg-yellow-100 border-yellow-400 text-yellow-900',
  tip: 'bg-green-100 border-green-400 text-green-900',
  info: 'bg-blue-100 border-blue-400 text-blue-900',
  danger: 'bg-red-100 border-red-400 text-red-900',
}

export function CalloutBlock({ block }: CalloutBlockProps) {
  const { variant, title, html } = block.content as unknown as CalloutContent
  return (
    <div className={`my-4 p-4 border-2 rounded-lg ${variantClasses[variant] ?? variantClasses.info}`}>
      {title && <p className="font-bold mb-1">{title}</p>}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
