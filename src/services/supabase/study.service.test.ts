import { beforeEach, describe, expect, it, vi } from 'vitest'
import { studyService } from '@/services/supabase/study.service'
import type { VocabularyItem } from '@/types/vocabulary.types'

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  insert: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  range: vi.fn(),
  delete: vi.fn(),
  in: vi.fn(),
  from: vi.fn(),
}))

vi.mock('@/services/supabase/client', () => ({
  supabase: {
    rpc: mocks.rpc,
    from: mocks.from,
  },
}))

const baseItem: VocabularyItem = {
  id: '11111111-1111-1111-1111-111111111111',
  user_id: 'user-1',
  global_term_id: null,
  source_text: 'produce',
  normalized_text: 'produce',
  source_language: 'en',
  native_language: 'vi',
  item_type: 'word',
  part_of_speech: null,
  ipa: null,
  pronunciation_text: null,
  audio_url: null,
  image_url: null,
  note: null,
  meanings: [],
  translation: null,
  examples: [],
  tags: [],
  status: 'new',
  view_count: 7,
  correct_count: 1,
  wrong_count: 2,
  audio_play_count: 0,
  srs_repetition: 1,
  srs_interval_days: 1,
  srs_ease_factor: 2.5,
  last_reviewed_at: null,
  next_review_at: null,
  flagged: false,
  deleted_at: null,
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
}

describe('studyService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.rpc.mockResolvedValue({ error: null })
    mocks.eq.mockReturnValue({ error: null, order: mocks.order })
    mocks.update.mockReturnValue({ eq: mocks.eq })
    mocks.single.mockResolvedValue({ data: null, error: null })
    mocks.limit.mockResolvedValue({ data: [], error: null })
    mocks.range.mockResolvedValue({ data: [], error: null })
    mocks.select.mockReturnValue({ single: mocks.single, eq: mocks.eq, order: mocks.order })
    mocks.order.mockReturnValue({ limit: mocks.limit, range: mocks.range })
    mocks.insert.mockReturnValue({ select: mocks.select })
    mocks.delete.mockReturnValue({ eq: mocks.eq, in: mocks.in })
    mocks.in.mockResolvedValue({ error: null })
    mocks.from.mockReturnValue({
      update: mocks.update,
      insert: mocks.insert,
      select: mocks.select,
      delete: mocks.delete,
    })
  })

  it('flushes viewed terms in one deduplicated RPC call', async () => {
    await studyService.flushTermViews(['term-1', 'term-2', 'term-1', ''])

    expect(mocks.rpc).toHaveBeenCalledTimes(1)
    expect(mocks.rpc).toHaveBeenCalledWith('increment_term_view_counts', { term_ids: ['term-1', 'term-2'] })
  })

  it('does not increment view count when applying a review action', async () => {
    await studyService.applyReviewAction(baseItem, 'know')

    expect(mocks.update).toHaveBeenCalledWith(expect.not.objectContaining({ view_count: expect.any(Number) }))
  })

  it('flushes pending review changes through the batch RPC', async () => {
    await studyService.flushStudyChanges({
      actions: [{
        termId: baseItem.id,
        action: 'know',
        reviewedAt: '2026-05-22T08:00:00.000Z',
        result: {
          status: 'learning',
          nextReviewAt: '2026-05-23T08:00:00.000Z',
          correctIncrement: 1,
          wrongIncrement: 0,
          repetition: 1,
          intervalDays: 1,
          easeFactor: 2.5,
        },
      }],
      viewedTermIds: [baseItem.id, baseItem.id, ''],
      sessionId: 'session-1',
      sessionPatch: {
        total_cards: 2,
        viewed_cards: 1,
        remembered_count: 1,
        difficult_count: 0,
      },
    })

    expect(mocks.rpc).toHaveBeenCalledWith('apply_study_review_batch', {
      actions: [{
        term_id: baseItem.id,
        action: 'know',
        reviewed_at: '2026-05-22T08:00:00.000Z',
        status: 'learning',
        next_review_at: '2026-05-23T08:00:00.000Z',
        correct_increment: 1,
        wrong_increment: 0,
        srs_repetition: 1,
        srs_interval_days: 1,
        srs_ease_factor: 2.5,
      }],
      viewed_term_ids: [baseItem.id],
      session_patch: {
        session_id: 'session-1',
        total_cards: 2,
        viewed_cards: 1,
        remembered_count: 1,
        difficult_count: 0,
      },
    })
  })

  it('lists the 30 most recent study sessions', async () => {
    await studyService.listRecentSessions('user-1')

    expect(mocks.from).toHaveBeenCalledWith('study_sessions')
    expect(mocks.select).toHaveBeenCalledWith('*')
    expect(mocks.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(mocks.order).toHaveBeenCalledWith('started_at', { ascending: false })
    expect(mocks.limit).toHaveBeenCalledWith(30)
  })

  it('deletes a single history session', async () => {
    await studyService.deleteSession('session-1')

    expect(mocks.from).toHaveBeenCalledWith('study_sessions')
    expect(mocks.delete).toHaveBeenCalled()
    expect(mocks.eq).toHaveBeenCalledWith('id', 'session-1')
  })

  it('clears all history for the current user', async () => {
    await studyService.clearHistory('user-1')

    expect(mocks.from).toHaveBeenCalledWith('study_sessions')
    expect(mocks.delete).toHaveBeenCalled()
    expect(mocks.eq).toHaveBeenCalledWith('user_id', 'user-1')
  })

  it('prunes history beyond the newest 30 sessions', async () => {
    mocks.range.mockResolvedValue({
      data: [{ id: 'old-1' }, { id: 'old-2' }],
      error: null,
    })

    await studyService.pruneHistory('user-1')

    expect(mocks.select).toHaveBeenCalledWith('id')
    expect(mocks.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(mocks.order).toHaveBeenCalledWith('started_at', { ascending: false })
    expect(mocks.range).toHaveBeenCalledWith(30, 1000)
    expect(mocks.in).toHaveBeenCalledWith('id', ['old-1', 'old-2'])
  })
})
