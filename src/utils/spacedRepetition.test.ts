import { describe, expect, it } from 'vitest'
import { scheduleReview } from '@/utils/spacedRepetition'

const now = new Date('2026-05-11T00:00:00.000Z')

describe('scheduleReview', () => {
  it('resets repetition and schedules forgotten cards for tomorrow', () => {
    const result = scheduleReview('dont_know', {
      correctCount: 5,
      wrongCount: 1,
      repetition: 4,
      intervalDays: 21,
      easeFactor: 2.7,
    }, now)

    expect(result.status).toBe('need_review')
    expect(result.nextReviewAt.toISOString()).toBe('2026-05-12T00:00:00.000Z')
    expect(result.repetition).toBe(0)
    expect(result.intervalDays).toBe(1)
    expect(result.easeFactor).toBe(1.9)
    expect(result.wrongIncrement).toBe(1)
  })

  it('schedules first remembered cards for one day later', () => {
    const result = scheduleReview('know', { correctCount: 0, wrongCount: 0 }, now)

    expect(result.status).toBe('learning')
    expect(result.nextReviewAt.toISOString()).toBe('2026-05-12T00:00:00.000Z')
    expect(result.repetition).toBe(1)
    expect(result.intervalDays).toBe(1)
    expect(result.easeFactor).toBe(2.5)
  })

  it('uses SM-2 interval multiplication for repeated remembered cards', () => {
    const result = scheduleReview('know', {
      correctCount: 2,
      wrongCount: 0,
      repetition: 3,
      intervalDays: 10,
      easeFactor: 2.6,
    }, now)

    expect(result.status).toBe('familiar')
    expect(result.nextReviewAt.toISOString()).toBe('2026-06-06T00:00:00.000Z')
    expect(result.repetition).toBe(4)
    expect(result.intervalDays).toBe(26)
    expect(result.easeFactor).toBe(2.6)
  })

  it('does not reduce ease below the SM-2 floor', () => {
    const result = scheduleReview('dont_know', {
      correctCount: 0,
      wrongCount: 3,
      repetition: 1,
      intervalDays: 1,
      easeFactor: 1.35,
    }, now)

    expect(result.easeFactor).toBe(1.3)
  })
})
