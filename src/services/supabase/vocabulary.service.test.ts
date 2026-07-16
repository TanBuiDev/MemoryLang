import { beforeEach, describe, expect, it, vi } from 'vitest'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { subscriptionService } from '@/services/supabase/subscription.service'
import { SubscriptionLimitError, isSubscriptionLimitError } from '@/services/supabase/subscription.errors'

const { range, from, getUser } = vi.hoisted(() => ({
  range: vi.fn(),
  from: vi.fn(),
  getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
}))

vi.mock('@/services/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(() => ({ range })),
    from: (...args: unknown[]) => from(...args),
    auth: { getUser },
  },
}))

vi.mock('@/services/supabase/subscription.service', () => ({
  subscriptionService: {
    canAddTerm: vi.fn().mockResolvedValue(true),
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
    from.mockReset()
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    vi.mocked(subscriptionService.canAddTerm).mockResolvedValue(true)
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

describe('vocabularyService quota enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    range.mockReset()
    from.mockReset()
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    vi.mocked(subscriptionService.canAddTerm).mockResolvedValue(true)
  })

  it('blocks create before touching global_terms when term quota is exhausted', async () => {
    vi.mocked(subscriptionService.canAddTerm).mockResolvedValueOnce(false)

    let thrown: unknown
    try {
      await vocabularyService.create('user-1', {
        source_text: 'hello',
        source_language: 'en',
        native_language: 'vi',
        item_type: 'word',
        meanings: [],
        deck_ids: [],
      } as any)
    } catch (error) {
      thrown = error
    }

    expect(thrown).toBeInstanceOf(SubscriptionLimitError)
    expect(isSubscriptionLimitError(thrown)).toBe(true)
    expect(subscriptionService.canAddTerm).toHaveBeenCalledWith('user-1')
    expect(from).not.toHaveBeenCalledWith('global_terms')
  })

  it('updates an existing user term without checking add-term quota', async () => {
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    from.mockImplementation((table) => {
      if (table === 'user_terms') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'term-1', global_term_id: 'global-1' },
                error: null,
              }),
            }),
          }),
          update,
        }
      }

      if (table === 'global_terms') {
        return { update }
      }

      return {}
    })
    vi.spyOn(vocabularyService, 'get').mockResolvedValueOnce(buildItem('term-1', 'global-1') as any)

    await vocabularyService.update('term-1', {
      source_text: 'hello',
      part_of_speech: null,
      ipa: null,
      audio_url: null,
      image_url: null,
      meanings: [],
      examples: [],
      translation: null,
      note: null,
      tags: [],
      status: 'learning',
    } as any)

    expect(subscriptionService.canAddTerm).not.toHaveBeenCalled()
  })

  it('blocks update when it would create a new user term', async () => {
    vi.mocked(subscriptionService.canAddTerm).mockResolvedValueOnce(false)
    const insert = vi.fn()
    const userTermResults = [
      { data: null, error: null },
      { data: null, error: null },
    ]
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })

    from.mockImplementation((table) => {
      if (table === 'user_terms') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(userTermResults.shift())),
          }),
          insert,
        }
      }

      if (table === 'global_terms') {
        return { update }
      }

      return {}
    })

    await expect(vocabularyService.update('global-1', {
      source_text: 'hello',
      part_of_speech: null,
      ipa: null,
      audio_url: null,
      image_url: null,
      meanings: [],
      examples: [],
      translation: null,
      note: null,
      tags: [],
      status: 'new',
    } as any)).rejects.toBeInstanceOf(SubscriptionLimitError)

    expect(subscriptionService.canAddTerm).toHaveBeenCalledWith('user-1')
    expect(insert).not.toHaveBeenCalled()
  })

  it('blocks flagTerm when it would create a new user term', async () => {
    vi.mocked(subscriptionService.canAddTerm).mockResolvedValueOnce(false)
    const insert = vi.fn()

    from.mockImplementation((table) => {
      if (table === 'user_terms') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
          insert,
        }
      }

      return {}
    })

    await expect(vocabularyService.flagTerm('global-1')).rejects.toBeInstanceOf(SubscriptionLimitError)

    expect(subscriptionService.canAddTerm).toHaveBeenCalledWith('user-1')
    expect(insert).not.toHaveBeenCalled()
  })

  it('blocks unflagTerm when it would create a new user term', async () => {
    vi.mocked(subscriptionService.canAddTerm).mockResolvedValueOnce(false)
    const insert = vi.fn()

    from.mockImplementation((table) => {
      if (table === 'user_terms') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
          insert,
        }
      }

      return {}
    })

    await expect(vocabularyService.unflagTerm('global-1')).rejects.toBeInstanceOf(SubscriptionLimitError)

    expect(subscriptionService.canAddTerm).toHaveBeenCalledWith('user-1')
    expect(insert).not.toHaveBeenCalled()
  })
})
