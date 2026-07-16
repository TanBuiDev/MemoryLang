import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listeningService } from './listening.service'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  order: vi.fn(),
}))

vi.mock('@/services/supabase/client', () => ({
  supabase: {
    from: mocks.from,
  },
}))

describe('listeningService content metadata helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.from.mockReturnValue({ select: mocks.select })
    mocks.select.mockReturnValue({ eq: mocks.eq, order: mocks.order })
    mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle, order: mocks.order })
    mocks.order.mockResolvedValue({ data: [], error: null })
  })

  it('fetches topic metadata by topic id without child payloads', async () => {
    mocks.maybeSingle.mockResolvedValueOnce({
      data: {
        id: 'topic-1',
        title: 'ETS 2026',
        access_tier: 'pro',
        teaser_config: { enabled: true, type: 'title_only' },
        is_published: true,
      },
      error: null,
    })

    await expect(listeningService.getTopic('topic-1')).resolves.toEqual(expect.objectContaining({
      id: 'topic-1',
      access_tier: 'pro',
    }))
    expect(mocks.from).toHaveBeenCalledWith('listening_topics')
    expect(mocks.select).toHaveBeenCalledWith('id,title,access_tier,teaser_config,is_published')
  })

  it('fetches parent topic metadata by test id', async () => {
    mocks.maybeSingle.mockResolvedValueOnce({
      data: {
        topic: {
          id: 'topic-1',
          title: 'ETS 2026',
          access_tier: 'pro',
          teaser_config: { enabled: true, type: 'title_only' },
          is_published: true,
        },
      },
      error: null,
    })

    await expect(listeningService.getTopicByTestId('test-1')).resolves.toEqual(expect.objectContaining({
      id: 'topic-1',
    }))
    expect(mocks.from).toHaveBeenCalledWith('listening_tests')
  })

  it('fetches parent topic metadata by part id', async () => {
    mocks.maybeSingle.mockResolvedValueOnce({
      data: {
        test: {
          topic: {
            id: 'topic-1',
            title: 'ETS 2026',
            access_tier: 'pro',
            teaser_config: { enabled: true, type: 'title_only' },
            is_published: true,
          },
        },
      },
      error: null,
    })

    await expect(listeningService.getTopicByPartId('part-1')).resolves.toEqual(expect.objectContaining({
      id: 'topic-1',
    }))
    expect(mocks.from).toHaveBeenCalledWith('listening_parts')
  })
})
