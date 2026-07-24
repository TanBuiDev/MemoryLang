export type ExamCategory = 'TOEIC' | 'IELTS' | 'TOEFL' | 'GENERAL'
export type PassageType = 'none' | 'single' | 'double' | 'triple'
export type ExamAccessTier = 'free' | 'pro'

export interface ExamPassage {
  id: string
  type: string // e.g., 'email', 'notice', 'invoice', 'article', 'chat'
  title: string
  content_html: string
}

export interface ExamQuestionOption {
  key: string // 'A', 'B', 'C', 'D'
  text: string
  is_correct: boolean
}

export interface ExamQuestion {
  id: string
  passage_set_id: string
  question_number: number
  question_text: string
  question_type: 'multiple_choice' | 'fill_blank'
  options: ExamQuestionOption[]
  points: number
  explanation_html?: string | null
  order_index: number
  created_at?: string
  updated_at?: string
}

export interface ExamPassageSet {
  id: string
  exam_id: string
  part_number: number
  passage_type: PassageType
  title?: string | null
  instruction_text?: string | null
  passages: ExamPassage[]
  order_index: number
  questions?: ExamQuestion[]
  created_at?: string
  updated_at?: string
}

export interface Exam {
  id: string
  title: string
  category: ExamCategory
  description?: string | null
  time_limit_minutes: number
  total_questions: number
  is_published: boolean
  access_tier: ExamAccessTier
  created_by?: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface ExamDetail extends Exam {
  passage_sets: ExamPassageSet[]
}
