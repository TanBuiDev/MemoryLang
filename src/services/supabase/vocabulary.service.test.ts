import { beforeEach, describe, expect, it, vi } from 'vitest'
import { vocabularyService } from '@/services/supabase/vocabulary.service'

const range = vi.fn()

vi.mock('@/services/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(() => ({ range })),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
  },
}))

function buildItem(id: string, globalTermId: string) {
  return {
    id,
    global_term_id: globalTermId,
    status: 'new',
    view_count: 0,
    correct_count: 0,
    wrong_count: 0,
    audio_play_count: 0,
    last_reviewed_at: null,
    next_review_at: null,
    flagged: false,
    deleted_at: null,
    created_at: '2026-07-09T00:00:00.000Z',
    source_text: id,
    normalized_text: id,
    source_language: 'en',
    native_language: 'vi',
    item_type: 'word',
    part_of_speech: null,
    ipa: null,
    audio_url: null,
    image_url: null,
    meanings: [],
    examples: [],
    note: null,
    tags: [],
    translation: null,
  }
}

describe('vocabularyService.list', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    range.mockReset()
  })

  it('paginates RPC beyond the Supabase max-rows cap by looping .range() until a short page arrives', async () => {
    const pageSize = 1000
    const pageOne = Array.from({ length: pageSize }, (_, i) => buildItem(`u-${i}`, `g-${i}`))
    const pageTwo = Array.from({ length: 561 }, (_, i) => buildItem(`u-${1000 + i}`, `g-${1000 + i}`))

    range.mockImplementation((from: number) => {
      if (from === 0) return Promise.resolve({ data: pageOne, error: null })
      if (from === pageSize) return Promise.resolve({ data: pageTwo, error: null })
      return Promise.resolve({ data: [], error: null })
    })

    const result = await vocabularyService.list('user-1')

    expect(range).toHaveBeenCalledTimes(2)
    expect(range).toHaveBeenNthCalledWith(1, 0, pageSize - 1)
    expect(range).toHaveBeenNthCalledWith(2, pageSize, pageSize * 2 - 1)
    expect(result).toHaveLength(pageSize + 561)
    expect(result[0].id).toBe('u-0')
    expect(result[pageSize + 560].id).toBe('u-1560')
  })

  it('returns the first page as-is when it is shorter than the page size', async () => {
    const smallPage = Array.from({ length: 30 }, (_, i) => buildItem(`u-${i}`, `g-${i}`))
    range.mockImplementation(() => Promise.resolve({ data: smallPage, error: null }))

    const result = await vocabularyService.list('user-1')

    expect(range).toHaveBeenCalledTimes(1)
    expect(range).toHaveBeenCalledWith(0, 999)
    expect(result).toHaveLength(30)
  })

  it('throws when the RPC returns an error', async () => {
    range.mockImplementation(() => Promise.resolve({ data: null, error: new Error('rpc failed') }))

    await expect(vocabularyService.list('user-1')).rejects.toThrow('rpc failed')
  })

  it('stops the pagination loop after a safety ceiling to avoid infinite fetches', async () => {
    const fullPage = Array.from({ length: 1000 }, (_, i) => buildItem(`u-${i}`, `g-${i}`))
    range.mockImplementation(() => Promise.resolve({ data: fullPage, error: null }))

    const result = await vocabularyService.list('user-1')

    expect(range.mock.calls.length).toBeLessThan(200)
    expect(result.length).toBe(1000 * range.mock.calls.length)
  })
})