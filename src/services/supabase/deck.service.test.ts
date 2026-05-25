import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deckService } from '@/services/supabase/deck.service'

const from = vi.fn()

vi.mock('@/services/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => from(...args) },
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
    created_at: '2026-05-25T00:00:00.000Z',
    updated_at: '2026-05-25T00:00:00.000Z',
  } as const
}

describe('deckService.createLessonBatch', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates each prepared lesson and links only its selected term ids', async () => {
    const insertLinks = vi.fn().mockResolvedValue({ error: null })
    const create = vi.spyOn(deckService, 'create')
      .mockResolvedValueOnce(createdDeck('deck-1', 'Bai hoc 01'))
      .mockResolvedValueOnce(createdDeck('deck-2', 'Bai hoc 02'))
    from.mockReturnValue({ insert: insertLinks })

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
      { deck_id: 'deck-1', user_term_id: 'term-1' },
      { deck_id: 'deck-1', user_term_id: 'term-2' },
    ])
    expect(insertLinks).toHaveBeenNthCalledWith(2, [
      { deck_id: 'deck-2', user_term_id: 'term-3' },
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
    from.mockReturnValue({ insert: insertLinks })

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
    from.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: linkError }) })

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
    from.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: linkError }) })

    const result = await deckService.createLessonBatch({
      base: { user_id: 'user-1', source_language: 'en', native_language: 'vi' },
      lessons: [{ name: 'Bai hoc 01', termIds: ['term-1'] }],
    })

    expect(result.createdDecks).toEqual([])
    expect(result.error).toBeInstanceOf(AggregateError)
    expect((result.error as AggregateError).errors).toEqual([linkError, cleanupError])
  })
})
