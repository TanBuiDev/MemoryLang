import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mergeReviewActions, mergeViewedTermIds, studyLocalDb } from '@/services/local/studyLocalDb'
import type { PendingReviewAction } from '@/services/local/studyLocalDb'

describe('studyLocalDb queue helpers', () => {
  const userId = 'test-user'

  beforeEach(async () => {
    await studyLocalDb.clearPendingStudyChanges(userId)
  })

  afterEach(async () => {
    await studyLocalDb.clearPendingStudyChanges(userId)
  })

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

  it('retains review, view, and summary data when pending updates run concurrently', async () => {
    const action: PendingReviewAction = {
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

    await Promise.all([
      studyLocalDb.addPendingReviewAction(userId, action),
      studyLocalDb.addPendingViewTermIds(userId, ['term-1']),
      studyLocalDb.savePendingSessionSummary(userId, 'session-1', { viewed_cards: 1, difficult_count: 1 }),
    ])

    expect(await studyLocalDb.getPendingStudyChanges(userId)).toEqual({
      actions: [action],
      viewedTermIds: ['term-1'],
      sessionId: 'session-1',
      sessionPatch: { viewed_cards: 1, difficult_count: 1 },
    })
  })
})
