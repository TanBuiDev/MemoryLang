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

export type ExamSkill = 'grammar' | 'signs' | 'reading' | 'cloze' | 'transformation' | 'listening' | 'writing' | 'speaking'
export type PracticeQuestionType = 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_text'
export type ExamResourceType = 'activity' | 'prompt'

export interface B1QuestionSeed {
  source_key: string
  source_number: string
  question_type: PracticeQuestionType
  prompt: string
  options: ExamQuestionOption[]
  accepted_answers: string[]
  source_page: number
  image_url: string | null
}

export interface PracticeQuestion extends B1QuestionSeed {}

export interface PracticeActivity {
  source_key: string
  skill: ExamSkill
  activity_type: PracticeQuestionType
  title: string
  questions: PracticeQuestion[]
}

export interface PracticePrompt {
  source_key: string
  skill: ExamSkill
  title: string
  prompt: string
  source_page: number
  image_url: string | null
}

export interface ExamSection {
  source_key: string
  skill: ExamSkill
  resource_type: ExamResourceType
  resource_source_key: string
  order_index: number
  is_required: boolean
}

export interface B1ContentArtifact {
  source: {
    file_name: string
    page_count: 18
  }
  exam: {
    source_key: string
    title: string
    default_time_minutes: number
    category?: ExamCategory
    access_tier?: ExamAccessTier
  }
  activities: PracticeActivity[]
  prompts: PracticePrompt[]
  sections: ExamSection[]
}

const examSkills: readonly ExamSkill[] = ['grammar', 'signs', 'reading', 'cloze', 'transformation', 'listening', 'writing', 'speaking']
const questionTypes: readonly PracticeQuestionType[] = ['multiple_choice', 'true_false', 'fill_blank', 'short_text']
const resourceTypes: readonly ExamResourceType[] = ['activity', 'prompt']
const examCategories: readonly ExamCategory[] = ['TOEIC', 'IELTS', 'TOEFL', 'GENERAL']
const examAccessTiers: readonly ExamAccessTier[] = ['free', 'pro']

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const hasUniqueSourceKeys = (items: unknown[]): boolean => {
  const sourceKeys = items.map((item) => isRecord(item) ? item.source_key : undefined)
  return sourceKeys.every(isNonEmptyString) && new Set(sourceKeys).size === sourceKeys.length
}

const isQuestion = (value: unknown): value is PracticeQuestion => {
  if (!isRecord(value)
    || !isNonEmptyString(value.source_key)
    || !isNonEmptyString(value.source_number)
    || !questionTypes.includes(value.question_type as PracticeQuestionType)
    || !isNonEmptyString(value.prompt)
    || !Array.isArray(value.options)
    || !Array.isArray(value.accepted_answers)
    || typeof value.source_page !== 'number'
    || !Number.isInteger(value.source_page)
    || value.source_page < 1
    || (value.image_url !== null && !isNonEmptyString(value.image_url))) {
    return false
  }

  if (!value.options.every((option) => isRecord(option)
    && isNonEmptyString(option.key)
    && isNonEmptyString(option.text)
    && typeof option.is_correct === 'boolean')) {
    return false
  }

  if (!value.accepted_answers.every(isNonEmptyString)) {
    return false
  }

  if (value.question_type === 'multiple_choice' || value.question_type === 'true_false') {
    return value.options.filter((option) => isRecord(option) && option.is_correct === true).length === 1
  }

  return value.accepted_answers.length > 0
}

export function isB1ContentArtifact(value: unknown): value is B1ContentArtifact {
  if (!isRecord(value)
    || !isRecord(value.source)
    || !isNonEmptyString(value.source.file_name)
    || value.source.page_count !== 18
    || !isRecord(value.exam)
    || !isNonEmptyString(value.exam.source_key)
    || !isNonEmptyString(value.exam.title)
    || typeof value.exam.default_time_minutes !== 'number'
    || !Number.isFinite(value.exam.default_time_minutes)
    || value.exam.default_time_minutes <= 0
    || (value.exam.category !== undefined && !examCategories.includes(value.exam.category as ExamCategory))
    || (value.exam.access_tier !== undefined && !examAccessTiers.includes(value.exam.access_tier as ExamAccessTier))
    || !Array.isArray(value.activities)
    || !Array.isArray(value.prompts)
    || !Array.isArray(value.sections)
    || !hasUniqueSourceKeys(value.activities)
    || !hasUniqueSourceKeys(value.prompts)
    || !hasUniqueSourceKeys(value.sections)) {
    return false
  }

  if (!value.activities.every((activity) => isRecord(activity)
    && examSkills.includes(activity.skill as ExamSkill)
    && questionTypes.includes(activity.activity_type as PracticeQuestionType)
    && isNonEmptyString(activity.title)
    && Array.isArray(activity.questions)
    && hasUniqueSourceKeys(activity.questions)
    && activity.questions.every(isQuestion))) {
    return false
  }

  if (!value.prompts.every((prompt) => isRecord(prompt)
    && examSkills.includes(prompt.skill as ExamSkill)
    && isNonEmptyString(prompt.title)
    && isNonEmptyString(prompt.prompt)
    && typeof prompt.source_page === 'number'
    && Number.isInteger(prompt.source_page)
    && prompt.source_page >= 1
    && (prompt.image_url === null || isNonEmptyString(prompt.image_url)))) {
    return false
  }

  const activityKeys = new Set(value.activities.map((activity) => activity.source_key))
  const promptKeys = new Set(value.prompts.map((prompt) => prompt.source_key))

  return value.sections.every((section) => isRecord(section)
    && examSkills.includes(section.skill as ExamSkill)
    && resourceTypes.includes(section.resource_type as ExamResourceType)
    && isNonEmptyString(section.resource_source_key)
    && typeof section.order_index === 'number'
    && Number.isInteger(section.order_index)
    && section.order_index > 0
    && typeof section.is_required === 'boolean'
    && (section.resource_type === 'activity'
      ? activityKeys.has(section.resource_source_key)
      : promptKeys.has(section.resource_source_key)))
}
