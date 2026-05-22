import type { VocabularyStatus } from '@/types/vocabulary.types'

export type ReviewAction = 'know' | 'dont_know' | 'difficult' | 'memorized'

export interface ReviewSnapshot {
  correctCount: number
  wrongCount: number
  repetition?: number
  intervalDays?: number
  easeFactor?: number
}

export interface ReviewResult {
  status: VocabularyStatus
  nextReviewAt: Date
  correctIncrement: number
  wrongIncrement: number
  repetition: number
  intervalDays: number
  easeFactor: number
}

const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_EASE_FACTOR = 2.5
const MIN_EASE_FACTOR = 1.3

function addDays(days: number, now: Date) {
  return new Date(now.getTime() + days * DAY_MS)
}

function roundEase(value: number) {
  return Math.round(value * 100) / 100
}

function normalizeEase(value?: number) {
  return Number.isFinite(value) ? Math.max(MIN_EASE_FACTOR, Number(value)) : DEFAULT_EASE_FACTOR
}

function calculateEase(easeFactor: number, quality: number) {
  const nextEase = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  return roundEase(Math.max(MIN_EASE_FACTOR, nextEase))
}

export function scheduleReview(action: ReviewAction, snapshot: ReviewSnapshot, now = new Date()): ReviewResult {
  const currentEase = normalizeEase(snapshot.easeFactor)

  if (action === 'dont_know') {
    const easeFactor = calculateEase(currentEase, 0)
    return {
      status: 'need_review',
      nextReviewAt: addDays(1, now),
      correctIncrement: 0,
      wrongIncrement: 1,
      repetition: 0,
      intervalDays: 1,
      easeFactor,
    }
  }

  if (action === 'difficult') {
    const easeFactor = calculateEase(currentEase, 3)
    return {
      status: 'difficult',
      nextReviewAt: addDays(1, now),
      correctIncrement: 0,
      wrongIncrement: 0,
      repetition: 0,
      intervalDays: 1,
      easeFactor,
    }
  }

  if (action === 'memorized') {
    return {
      status: 'memorized',
      nextReviewAt: addDays(30, now),
      correctIncrement: 1,
      wrongIncrement: 0,
      repetition: Math.max(1, (snapshot.repetition ?? snapshot.correctCount) + 1),
      intervalDays: 30,
      easeFactor: currentEase,
    }
  }

  const repetition = Math.max(0, snapshot.repetition ?? snapshot.correctCount) + 1
  const intervalDays = repetition === 1
    ? 1
    : repetition === 2
      ? 6
      : Math.max(1, Math.round(Math.max(1, snapshot.intervalDays ?? 1) * currentEase))

  return {
    status: repetition === 1 ? 'learning' : 'familiar',
    nextReviewAt: addDays(intervalDays, now),
    correctIncrement: 1,
    wrongIncrement: 0,
    repetition,
    intervalDays,
    easeFactor: calculateEase(currentEase, 4),
  }
}
