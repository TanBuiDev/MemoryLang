export type QuizType = 'true_false' | 'translation_input' | 'multiple_choice' | 'matching' | 'fill_blank' | 'mixed'

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
  audioUrl: string | null
  pronunciationText: string | null
}

export interface MultipleChoiceQuestion {
  id: string
  userTermId: string
  sourceText: string
  ipa: string | null
  partOfSpeech: string | null
  audioUrl: string | null
  pronunciationText: string | null
  options: string[]
  correctIndex: number
  correctAlternatives: string[]
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
