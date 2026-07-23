export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
export type ReadingDifficulty = 'easy' | 'medium' | 'hard'
export type ReadingPurpose = 'IELTS' | 'TOEFL' | 'General' | 'Academic'
export type AccessTier = 'free' | 'pro'
export type QuestionType = 'multiple_choice' | 'true_false' | 'fill_blank'
export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink'

export interface ReadingQuestionOption {
  text: string
  is_correct: boolean
}

export interface ReadingQuestion {
  id: string
  article_id: string
  question_text: string
  question_type: QuestionType
  options: ReadingQuestionOption[]
  order_index: number
  points: number
  created_at?: string
}

export interface ReadingArticle {
  id: string
  title: string
  subtitle?: string | null
  content_html: string
  plain_text: string
  cefr_level: CEFRLevel
  difficulty: ReadingDifficulty
  topics: string[]
  purpose: ReadingPurpose
  word_count: number
  estimated_reading_time: number
  audio_url?: string | null
  audio_duration?: number | null
  is_published: boolean
  access_tier: AccessTier
  published_at?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface ReadingArticleDetail extends ReadingArticle {
  questions: ReadingQuestion[]
}

export interface QuizAnswer {
  question_id: string
  selected_option: string
  is_correct?: boolean
}

export interface ReadingAttempt {
  id: string
  user_id: string
  article_id: string
  started_at: string
  completed_at?: string | null
  time_spent_seconds: number
  score: number
  total_questions: number
  answers: QuizAnswer[]
  words_clicked: string[]
  words_added_to_study: string[]
  is_completed: boolean
  created_at: string
  updated_at: string
}

export interface ReadingHighlight {
  id: string
  user_id: string
  article_id: string
  text_content: string
  color: HighlightColor
  note?: string | null
  start_offset: number
  end_offset: number
  created_at: string
}

export interface ReadingFilters {
  level?: CEFRLevel | 'all'
  topic?: string | 'all'
  purpose?: ReadingPurpose | 'all'
  difficulty?: ReadingDifficulty | 'all'
  accessTier?: AccessTier | 'all'
  search?: string
  sort?: 'newest' | 'popular' | 'difficulty_asc' | 'difficulty_desc'
}

export interface CreateArticleInput {
  title: string
  subtitle?: string
  content_html: string
  plain_text: string
  cefr_level: CEFRLevel
  difficulty: ReadingDifficulty
  topics: string[]
  purpose: ReadingPurpose
  access_tier: AccessTier
  is_published?: boolean
  questions?: Omit<ReadingQuestion, 'id' | 'article_id'>[]
}

export interface ReadingStatsSummary {
  total_articles_read: number
  total_time_minutes: number
  avg_score: number
  streak_days: number
  level_distribution: Record<string, number>
  topic_distribution: Record<string, number>
}
