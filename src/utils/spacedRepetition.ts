import type { VocabularyStatus } from '@/types/vocabulary.types'

export type ReviewAction = 'know' | 'dont_know' | 'difficult' | 'memorized'

export interface ReviewSnapshot {
  correctCount: number
  wrongCount: number
}

export interface ReviewResult {
  status: VocabularyStatus
  nextReviewAt: Date
  correctIncrement: number
  wrongIncrement: number
}

const DAY_MS = 24 * 60 * 60 * 1000

function addDays(days: number, now: Date) {
  return new Date(now.getTime() + days * DAY_MS)
}

export function scheduleReview(action: ReviewAction, snapshot: ReviewSnapshot, now = new Date()): ReviewResult {
  if (action === 'dont_know') {
    return { status: 'need_review', nextReviewAt: addDays(1, now), correctIncrement: 0, wrongIncrement: 1 }
  }

  if (action === 'difficult') {
    return { status: 'difficult', nextReviewAt: addDays(1, now), correctIncrement: 0, wrongIncrement: 0 }
  }

  if (action === 'memorized') {
    return { status: 'memorized', nextReviewAt: addDays(14, now), correctIncrement: 1, wrongIncrement: 0 }
  }

  const isFirstCorrect = snapshot.correctCount === 0

  return {
    status: isFirstCorrect ? 'learning' : 'familiar',
    nextReviewAt: addDays(isFirstCorrect ? 2 : 7, now),
    correctIncrement: 1,
    wrongIncrement: 0,
  }
}
