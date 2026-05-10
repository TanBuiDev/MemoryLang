import { describe, expect, it } from 'vitest'
import { scheduleReview } from '@/utils/spacedRepetition'

const now = new Date('2026-05-11T00:00:00.000Z')

describe('scheduleReview', () => {
  it('schedules wrong answers for one day later', () => {
    const result = scheduleReview('dont_know', { correctCount: 0, wrongCount: 0 }, now)
    expect(result.status).toBe('need_review')
    expect(result.nextReviewAt.toISOString()).toBe('2026-05-12T00:00:00.000Z')
    expect(result.wrongIncrement).toBe(1)
  })

  it('schedules first correct answers for two days later', () => {
    const result = scheduleReview('know', { correctCount: 0, wrongCount: 0 }, now)
    expect(result.status).toBe('learning')
    expect(result.nextReviewAt.toISOString()).toBe('2026-05-13T00:00:00.000Z')
  })

  it('schedules repeated correct answers for seven days later', () => {
    const result = scheduleReview('know', { correctCount: 2, wrongCount: 0 }, now)
    expect(result.status).toBe('familiar')
    expect(result.nextReviewAt.toISOString()).toBe('2026-05-18T00:00:00.000Z')
  })
})
