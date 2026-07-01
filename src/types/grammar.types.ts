export type BlockType =
  | 'heading'
  | 'paragraph'
  | 'table'
  | 'code'
  | 'callout'
  | 'example_list'
  | 'exercise_group'
  | 'summary'
  | 'divider'

export interface LessonBlock {
  id: string
  topic_id: string
  sort_order: number
  block_type: BlockType
  content: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface HeadingContent {
  text: string
  level: 2 | 3 | 4
  icon?: string
}

export interface ParagraphContent {
  html: string
}

export interface TableContent {
  headers: string[]
  rows: string[][]
  caption?: string
}

export interface CodeContent {
  text: string
  language?: string
}

export interface CalloutContent {
  variant: 'warning' | 'tip' | 'info' | 'danger'
  title?: string
  html: string
}

export interface ExampleListItem {
  text: string
  correct: boolean
}

export interface ExampleListContent {
  items: ExampleListItem[]
}

export interface ExerciseQuestion {
  id: string
  question: string
  options: string[]
  correctIndex: number
  explanation?: string
}

export interface ExerciseGroupContent {
  instruction?: string
  questions: ExerciseQuestion[]
}

export interface SummaryContent {
  variant: 'bullet' | 'card'
  items: string[]
}

export type DividerContent = Record<string, never>

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  heading: 'Tiêu đề',
  paragraph: 'Đoạn văn',
  table: 'Bảng',
  code: 'Code block',
  callout: 'Callout',
  example_list: 'Ví dụ',
  exercise_group: 'Bài tập',
  summary: 'Tổng kết',
  divider: 'Đường phân cách',
}
