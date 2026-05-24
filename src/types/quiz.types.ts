export type QuizType = 'true_false' | 'translation_input' | 'matching' | 'fill_blank' | 'mixed'

export interface TrueFalseQuestion {
  id: string
  userTermId: string
  prompt: string
  statement: string
  expectedAnswer: boolean
}

export interface TranslationInputQuestion {
  id: string
  userTermId: string
  sourceText: string
  ipa: string | null
  partOfSpeech: string | null
  expectedTranslation: string
}

export interface QuizResult {
  id: string
  user_id: string
  deck_id: string | null
  quiz_type: QuizType
  total_questions: number
  correct_answers: number
  wrong_answers: number
  duration_ms: number | null
  created_at: string
}
