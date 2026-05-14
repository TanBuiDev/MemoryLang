import { beforeEach, describe, expect, it, vi } from 'vitest'
import { studyService } from '@/services/supabase/study.service'
import type { VocabularyItem } from '@/types/vocabulary.types'

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
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
  last_reviewed_at: null,
  next_review_at: null,
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
}

describe('studyService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.rpc.mockResolvedValue({ error: null })
    mocks.eq.mockResolvedValue({ error: null })
    mocks.update.mockReturnValue({ eq: mocks.eq })
    mocks.from.mockReturnValue({ update: mocks.update })
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
})
