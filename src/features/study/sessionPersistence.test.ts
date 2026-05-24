import { beforeEach, describe, expect, it } from 'vitest'
import { readStoredStudySession, writeStoredStudySession } from '@/features/study/sessionPersistence'
import type { VocabularyItem } from '@/types/vocabulary.types'

const item = { id: 'produce' } as VocabularyItem
const key = 'memorylang.study.session.demo:deck-session:all:one_side:20:false'

describe('study session confirmation persistence', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('loads existing session payloads with confirmation disabled defaults', () => {
    window.sessionStorage.setItem(key, JSON.stringify({
      version: 1,
      vocabulary: [item],
      index: 0,
      mode: 'one_side',
      viewedTermIds: [],
      flushedViewTermIds: [],
    }))

    expect(readStoredStudySession(key)).toEqual(expect.objectContaining({
      requireRememberConfirmation: false,
      rememberConfirmationSeconds: 2,
      ratingsByTermId: {},
      hasReachedLastCard: false,
      reviewActionsByTermId: {},
    }))
  })

  it('stores provisional ratings and completion eligibility for resumed sessions', () => {
    writeStoredStudySession(key, {
      vocabulary: [item],
      index: 0,
      mode: 'one_side',
      viewedTermIds: ['produce'],
      flushedViewTermIds: [],
      requireRememberConfirmation: true,
      rememberConfirmationSeconds: 3,
      ratingsByTermId: { produce: 'know' },
      hasReachedLastCard: true,
      reviewActionsByTermId: {
        produce: {
          termId: 'produce',
          action: 'know',
          reviewedAt: '2026-05-23T00:00:00.000Z',
          result: {
            status: 'learning',
            nextReviewAt: '2026-05-24T00:00:00.000Z',
            correctIncrement: 1,
            wrongIncrement: 0,
            repetition: 1,
            intervalDays: 1,
            easeFactor: 2.5,
          },
        },
      },
    } as never)

    expect(readStoredStudySession(key)).toEqual(expect.objectContaining({
      requireRememberConfirmation: true,
      rememberConfirmationSeconds: 3,
      ratingsByTermId: { produce: 'know' },
      hasReachedLastCard: true,
      reviewActionsByTermId: {
        produce: expect.objectContaining({ action: 'know', termId: 'produce' }),
      },
    }))
  })
})
