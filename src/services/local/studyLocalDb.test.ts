import { describe, expect, it } from 'vitest'
import { mergeReviewActions, mergeViewedTermIds } from '@/services/local/studyLocalDb'
import type { PendingReviewAction } from '@/services/local/studyLocalDb'

describe('studyLocalDb queue helpers', () => {
  it('keeps the latest pending review action per term in insertion order', () => {
    const first: PendingReviewAction = {
      termId: 'term-1',
      action: 'dont_know',
      reviewedAt: '2026-05-22T08:00:00.000Z',
      result: {
        status: 'need_review',
        nextReviewAt: '2026-05-23T08:00:00.000Z',
        correctIncrement: 0,
        wrongIncrement: 1,
        repetition: 0,
        intervalDays: 1,
        easeFactor: 2.3,
      },
    }
    const second: PendingReviewAction = {
      ...first,
      action: 'know',
      reviewedAt: '2026-05-22T08:01:00.000Z',
      result: {
        status: 'learning',
        nextReviewAt: '2026-05-23T08:01:00.000Z',
        correctIncrement: 1,
        wrongIncrement: 0,
        repetition: 1,
        intervalDays: 1,
        easeFactor: 2.5,
      },
    }

    expect(mergeReviewActions([first], [second])).toEqual([second])
  })

  it('deduplicates viewed term ids while preserving first-seen order', () => {
    expect(mergeViewedTermIds(['term-1', 'term-2'], ['term-2', '', 'term-3'])).toEqual(['term-1', 'term-2', 'term-3'])
  })
})
