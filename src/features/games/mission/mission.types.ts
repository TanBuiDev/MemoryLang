import type { ExampleSentence, Meaning, VocabularyItemType } from '@/types/vocabulary.types'
import type { LanguageCode } from '@/types/language.types'

export type MissionStageType =
  | 'learn'
  | 'matching'
  | 'listening_choice'
  | 'listening_typing'
  | 'context_cloze'
  | 'meaning_recall'
  | 'spelling'
  | 'boss'

export type MissionQuestionType = Exclude<MissionStageType, 'learn' | 'boss'>

export interface GameTerm {
  globalTermId: string
  orderIndex: number
  sourceText: string
  normalizedText: string
  sourceLanguage: LanguageCode
  nativeLanguage: LanguageCode
  itemType: VocabularyItemType
  partOfSpeech: string | null
  ipa: string | null
  audioUrl: string | null
  imageUrl: string | null
  translation: string | null
  meanings: Meaning[]
  examples: ExampleSentence[]
  tags: string[]
}

export interface QuestionOption {
  id: string
  label: string
}

export interface QuestionDefinition {
  id: string
  type: MissionQuestionType
  targetTermId: string
  prompt: string
  acceptedAnswers: string[]
  options?: QuestionOption[]
  audioText?: string
  audioUrl?: string | null
  hint?: { firstLetter?: string; wordCount?: number; ipa?: string | null }
  sourceExampleIndex?: number
}

export interface MissionStageDefinition {
  type: MissionStageType
  targetTermIds: string[]
  questions: QuestionDefinition[]
  required: boolean
}

export interface MissionDefinition {
  deckId: string
  curriculumFingerprint: string
  missionIndex: number
  targetTermIds: string[]
  scriptKey: string
  scriptVersion: number
  generatorVersion: number
  stages: MissionStageDefinition[]
}

export interface AnswerRecord {
  questionId: string
  targetTermId: string
  type: MissionQuestionType
  attempts: number
  hintLevel: number
  isCorrect: boolean
  firstTryCorrect: boolean
  score: number
  answeredAt: string
}

export interface MissionAttemptState {
  deckId: string
  curriculumFingerprint: string
  missionIndex: number
  stageIndex: number
  questionIndex: number
  answers: AnswerRecord[]
  startedAt: string
  updatedAt: string
  status: 'in_progress' | 'completed'
}

export interface MissionDiagnostic {
  code:
    | 'MISSING_TRANSLATION'
    | 'MISSING_AUDIO'
    | 'NO_EXACT_EXAMPLE_MATCH'
    | 'DUPLICATE_TRANSLATION'
    | 'INSUFFICIENT_DISTRACTORS'
    | 'SOURCE_TOO_LONG'
    | 'INSUFFICIENT_TERMS'
  targetTermId?: string
  blocking: boolean
  message: string
}

export interface MissionReadiness {
  playable: boolean
  blocking: MissionDiagnostic[]
  warnings: MissionDiagnostic[]
  coverage: { totalTerms: number; withTranslation: number; withAudio: number; withExactCloze: number }
}

export interface MissionProgress {
  id: string
  user_id: string
  deck_id: string
  curriculum_fingerprint: string
  mission_index: number
  status: 'in_progress' | 'completed'
  attempt_count: number
  best_score: number | null
  best_accuracy: number | null
  latest_score: number | null
  latest_accuracy: number | null
  first_started_at: string | null
  last_started_at: string | null
  completed_at: string | null
  last_completed_at: string | null
  created_at: string
  updated_at: string
}
