import type { LessonBlock, BlockType } from '@/types/grammar.types'
import { HeadingBlock } from '@/components/grammar/blocks/HeadingBlock'
import { ParagraphBlock } from '@/components/grammar/blocks/ParagraphBlock'
import { TableBlock } from '@/components/grammar/blocks/TableBlock'
import { CodeBlock } from '@/components/grammar/blocks/CodeBlock'
import { CalloutBlock } from '@/components/grammar/blocks/CalloutBlock'
import { ExampleListBlock } from '@/components/grammar/blocks/ExampleListBlock'
import { ExerciseGroupBlock } from '@/components/grammar/blocks/ExerciseGroupBlock'
import { SummaryBlock } from '@/components/grammar/blocks/SummaryBlock'
import { DividerBlock } from '@/components/grammar/blocks/DividerBlock'

const blockComponents: Record<BlockType, React.ComponentType<{ block: LessonBlock }>> = {
  heading: HeadingBlock,
  paragraph: ParagraphBlock,
  table: TableBlock,
  code: CodeBlock,
  callout: CalloutBlock,
  example_list: ExampleListBlock,
  exercise_group: ExerciseGroupBlock,
  summary: SummaryBlock,
  divider: DividerBlock,
}

interface BlockRendererProps {
  block: LessonBlock
  disabled?: boolean
}

export function BlockRenderer({ block }: BlockRendererProps) {
  const Component = blockComponents[block.block_type as BlockType]
  if (!Component) return null
  return <Component block={block} />
}
