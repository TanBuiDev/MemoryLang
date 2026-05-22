import { beforeEach, describe, expect, it, vi } from 'vitest'
import { studySyncService } from '@/services/local/studySync.service'

const mocks = vi.hoisted(() => ({
  getPendingStudyChanges: vi.fn(),
  clearPendingStudyChanges: vi.fn(),
  flushStudyChanges: vi.fn(),
}))

vi.mock('@/services/local/studyLocalDb', () => ({
  studyLocalDb: {
    getPendingStudyChanges: mocks.getPendingStudyChanges,
    clearPendingStudyChanges: mocks.clearPendingStudyChanges,
  },
}))

vi.mock('@/services/supabase/study.service', () => ({
  studyService: {
    flushStudyChanges: mocks.flushStudyChanges,
  },
}))

describe('studySyncService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getPendingStudyChanges.mockResolvedValue({ actions: [], viewedTermIds: [], sessionId: null, sessionPatch: null })
    mocks.flushStudyChanges.mockResolvedValue(undefined)
    mocks.clearPendingStudyChanges.mockResolvedValue(undefined)
  })

  it('does not call Supabase when no pending study changes exist', async () => {
    await studySyncService.flushPendingStudyChanges('user-1')

    expect(mocks.flushStudyChanges).not.toHaveBeenCalled()
    expect(mocks.clearPendingStudyChanges).not.toHaveBeenCalled()
  })

  it('flushes queued study changes and clears the local queue after success', async () => {
    mocks.getPendingStudyChanges.mockResolvedValue({
      actions: [],
      viewedTermIds: ['term-1'],
      sessionId: 'session-1',
      sessionPatch: { viewed_cards: 1 },
    })

    await studySyncService.flushPendingStudyChanges('user-1')

    expect(mocks.flushStudyChanges).toHaveBeenCalledWith({
      actions: [],
      viewedTermIds: ['term-1'],
      sessionId: 'session-1',
      sessionPatch: { viewed_cards: 1 },
    })
    expect(mocks.clearPendingStudyChanges).toHaveBeenCalledWith('user-1')
  })
})
