import type { TeaserConfig } from '@/types/subscription.types'

export interface TranscriptSegment {
  id: string
  start: number
  end: number
  speaker?: string
  textEn: string
  textVi?: string
}

export interface ListeningQuestion {
  id: string
  partId: string
  groupId?: string
  order: number
  questionText: string
  options: string[]
  correctIndex: number
  explanation?: string
  explanationVi?: string
  vocabularyList?: { word: string; ipa?: string; meaning: string }[]
}

export interface ListeningGroup {
  id: string
  partId: string
  order: number
  audioSrc?: string
  imageUrl?: string
  graphicUrl?: string
  transcriptSegments?: TranscriptSegment[]
  questions: ListeningQuestion[]
}

export interface ListeningTopic {
  id: string
  title: string
  description?: string
  order: number
  access_tier?: 'free' | 'pro'
  teaser_config?: { enabled: boolean; type: string }
}

export interface ListeningTest {
  id: string
  topicId: string
  title: string
  order: number
}

export interface ListeningPart {
  id: string
  testId: string
  partNumber: 1 | 2 | 3 | 4
  directions: string
  audioSrc: string
  imageUrl?: string
  graphicUrl?: string
  transcript?: string
  transcriptSegments?: TranscriptSegment[]
  groups?: ListeningGroup[]
}

export interface DictationBlank {
  start: number
  end: number
  answer: string
}

export type ListeningMode = 'test' | 'practice' | 'dictation'

export interface ListeningSession {
  partId: string
  mode: ListeningMode
  currentIndex: number
  answers: Record<number, number>
  dictAnswers: Record<number, string>
  isCompleted: boolean
  startedAt: number
  score: number
  correctCount: number
  wrongCount: number
  skippedCount: number
}

export interface ListeningTopicAccess {
  id: string
  title: string
  access_tier?: 'free' | 'pro'
  teaser_config?: TeaserConfig
  is_published?: boolean
}
