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
  transcript?: string
}

export interface ListeningQuestion {
  id: string
  partId: string
  order: number
  questionText: string
  options: string[]
  correctIndex: number
  explanation?: string
}

export interface DictationBlank {
  start: number
  end: number
  answer: string
}

export type ListeningMode = 'test' | 'dictation'

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
