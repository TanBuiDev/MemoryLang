import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deckService } from '@/services/supabase/deck.service'
import { subscriptionService } from '@/services/supabase/subscription.service'
import { SubscriptionLimitError, isSubscriptionLimitError } from '@/services/supabase/subscription.errors'

const { from, select, eq } = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
}))

vi.mock('@/services/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => from(...args),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    }
  },
}))

vi.mock('@/services/supabase/subscription.service', () => ({
  subscriptionService: {
    canAddDeck: vi.fn().mockResolvedValue(true),
    canCreateDecks: vi.fn().mockResolvedValue(true),
  },
}))

function createdDeck(id: string, name: string) {
  return {
    id,
    user_id: 'user-1',
    name,
    description: null,
    source_language: 'en',
    native_language: 'vi',
    color: null,
    icon: null,
    visibility: 'private',
    parent_id: null,
    created_at: '2026-05-25T00:00:00.000Z',
    updated_at: '2026-05-25T00:00:00.000Z',
  } as const
}

describe('deckService visible terms', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('counts only non-deleted terms in deck summaries', async () => {
    const deckSelect = vi.fn().mockReturnValue({
      or: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [createdDeck('deck-1', 'TEST 01')], error: null }),
      }),
    })
    const countIds = vi.fn().mockResolvedValue({ data: [{ deck_id: 'deck-1', term_count: 79 }], error: null })
    const countSelect = vi.fn().mockReturnValue({ in: countIds })
    from.mockImplementation((table) => table === 'decks'
      ? { select: deckSelect }
      : { select: countSelect })

    const decks = await deckService.list('user-1')

    expect(deckSelect).toHaveBeenCalledWith('*')
    expect(from).toHaveBeenCalledWith('active_deck_term_counts')
    expect(countSelect).toHaveBeenCalledWith('deck_id, term_count')
    expect(countIds).toHaveBeenCalledWith('deck_id', ['deck-1'])
    expect(decks[0]?.term_count).toBe(79)
  })

  it('excludes deleted global terms from the studyable deck list', async () => {
    const activeFilter = vi.fn()
    const order = vi.fn().mockResolvedValue({ data: [], error: null })
    const inDecks = vi.fn().mockReturnValue({ is: activeFilter, order })
    activeFilter.mockReturnValue({ order })
    const deckTermsSelect = vi.fn().mockReturnValue({ in: inDecks })
    from.mockImplementation((table) => table === 'decks'
      ? { select: vi.fn().mockResolvedValue({ data: [{ id: 'deck-1', parent_id: null }], error: null }) }
      : { select: deckTermsSelect })

    await deckService.listTerms('deck-1')

    expect(deckTermsSelect).toHaveBeenCalledWith(expect.stringContaining('global_terms!fk_deck_terms_global_term!inner'))
    expect(activeFilter).toHaveBeenCalledWith('global_terms.deleted_at', null)
  })
})

describe('deckService.createLessonBatch', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    vi.mocked(subscriptionService.canAddDeck).mockResolvedValue(true)
    vi.mocked(subscriptionService.canCreateDecks).mockResolvedValue(true)
    
    // Dynamic mock: eq returns a object with maybeSingle resolving to the passed value
    eq.mockImplementation((_, val) => {
      return {
        maybeSingle: vi.fn().mockResolvedValue({
          data: val ? { id: val, global_term_id: val } : null,
          error: null
        })
      }
    })
    
    select.mockReturnValue({ eq })
    
    from.mockImplementation((table) => {
      if (table === 'user_terms') {
        return { select }
      }
      return {
        insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: {}, error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: {}, error: null })
        })
      }
    })
  })

  it('blocks create when deck quota is exhausted', async () => {
    vi.mocked(subscriptionService.canAddDeck).mockResolvedValueOnce(false)

    await expect(deckService.create({
      user_id: 'user-1',
      name: 'Blocked deck',
      source_language: 'en',
      native_language: 'vi',
    })).rejects.toBeInstanceOf(SubscriptionLimitError)

    expect(subscriptionService.canAddDeck).toHaveBeenCalledWith('user-1')
    expect(from).not.toHaveBeenCalledWith('decks')
  })

  it('blocks createLessonBatch before creating any deck when batch quota is exhausted', async () => {
    vi.mocked(subscriptionService.canCreateDecks).mockResolvedValueOnce(false)
    const create = vi.spyOn(deckService, 'create')

    const result = await deckService.createLessonBatch({
      base: { user_id: 'user-1', source_language: 'en', native_language: 'vi' },
      lessons: [
        { name: 'Bai hoc 01', termIds: ['term-1'] },
        { name: 'Bai hoc 02', termIds: ['term-2'] },
      ],
    })

    expect(subscriptionService.canCreateDecks).toHaveBeenCalledWith('user-1', 2)
    expect(create).not.toHaveBeenCalled()
    expect(result.createdDecks).toEqual([])
    expect(isSubscriptionLimitError(result.error)).toBe(true)
  })

  it('creates each prepared lesson and links only its selected term ids', async () => {
    const insertLinks = vi.fn().mockResolvedValue({ error: null })
    const create = vi.spyOn(deckService, 'create')
      .mockResolvedValueOnce(createdDeck('deck-1', 'Bai hoc 01'))
      .mockResolvedValueOnce(createdDeck('deck-2', 'Bai hoc 02'))
    from.mockImplementation((table) => {
      if (table === 'deck_terms') return { insert: insertLinks }
      return { select }
    })

    const result = await deckService.createLessonBatch({
      base: { user_id: 'user-1', source_language: 'en', native_language: 'vi' },
      lessons: [
        { name: 'Bai hoc 01', termIds: ['term-1', 'term-2'] },
        { name: 'Bai hoc 02', termIds: ['term-3'] },
      ],
    })

    expect(create).toHaveBeenCalledTimes(2)
    expect(create).toHaveBeenNthCalledWith(1, {
      user_id: 'user-1',
      source_language: 'en',
      native_language: 'vi',
      name: 'Bai hoc 01',
    })
    expect(insertLinks).toHaveBeenNthCalledWith(1, [
      { deck_id: 'deck-1', global_term_id: 'term-1' },
      { deck_id: 'deck-1', global_term_id: 'term-2' },
    ])
    expect(insertLinks).toHaveBeenNthCalledWith(2, [
      { deck_id: 'deck-2', global_term_id: 'term-3' },
    ])
    expect(result).toEqual({
      createdDecks: [
        expect.objectContaining({ id: 'deck-1' }),
        expect.objectContaining({ id: 'deck-2' }),
      ],
      error: null,
    })
  })

  it('returns already-created decks when a later lesson cannot be created', async () => {
    const insertLinks = vi.fn().mockResolvedValue({ error: null })
    vi.spyOn(deckService, 'create')
      .mockResolvedValueOnce(createdDeck('deck-1', 'Bai hoc 01'))
      .mockRejectedValueOnce(new Error('insert failed'))
    from.mockImplementation((table) => {
      if (table === 'deck_terms') return { insert: insertLinks }
      return { select }
    })

    const result = await deckService.createLessonBatch({
      base: { user_id: 'user-1', source_language: 'en', native_language: 'vi' },
      lessons: [
        { name: 'Bai hoc 01', termIds: ['term-1'] },
        { name: 'Bai hoc 02', termIds: ['term-2'] },
      ],
    })

    expect(insertLinks).toHaveBeenCalledTimes(1)
    expect(result.createdDecks.map((deck) => deck.name)).toEqual(['Bai hoc 01'])
    expect(result.error).toBeInstanceOf(Error)
  })

  it('removes a just-created deck when linking its terms fails', async () => {
    const linkError = new Error('link failed')
    const remove = vi.spyOn(deckService, 'remove').mockResolvedValueOnce(undefined)
    vi.spyOn(deckService, 'create').mockResolvedValueOnce(createdDeck('deck-1', 'Bai hoc 01'))
    from.mockImplementation((table) => {
      if (table === 'deck_terms') return { insert: vi.fn().mockResolvedValue({ error: linkError }) }
      return { select }
    })

    const result = await deckService.createLessonBatch({
      base: { user_id: 'user-1', source_language: 'en', native_language: 'vi' },
      lessons: [{ name: 'Bai hoc 01', termIds: ['term-1'] }],
    })

    expect(remove).toHaveBeenCalledWith('deck-1')
    expect(result.createdDecks).toEqual([])
    expect(result.error).toBe(linkError)
  })

  it('reports both link and cleanup failures without claiming the failed deck was created', async () => {
    const linkError = new Error('link failed')
    const cleanupError = new Error('cleanup failed')
    vi.spyOn(deckService, 'remove').mockRejectedValueOnce(cleanupError)
    vi.spyOn(deckService, 'create').mockResolvedValueOnce(createdDeck('deck-1', 'Bai hoc 01'))
    from.mockImplementation((table) => {
      if (table === 'deck_terms') return { insert: vi.fn().mockResolvedValue({ error: linkError }) }
      return { select }
    })

    const result = await deckService.createLessonBatch({
      base: { user_id: 'user-1', source_language: 'en', native_language: 'vi' },
      lessons: [{ name: 'Bai hoc 01', termIds: ['term-1'] }],
    })

    expect(result.createdDecks).toEqual([])
    expect(result.error).toBeInstanceOf(AggregateError)
    expect((result.error as AggregateError).errors).toEqual([linkError, cleanupError])
  })
})
