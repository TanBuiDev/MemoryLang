import { beforeEach, describe, expect, it, vi } from 'vitest'
import { adminReadingService } from '@/services/supabase/adminReading.service'
import { readingService } from '@/services/supabase/reading.service'

const rpcMock = vi.fn()
vi.mock('@/services/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}))

describe('reading vocabulary services', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('asks the database to rescan a saved article', async () => {
    rpcMock.mockResolvedValue({ data: 12, error: null })

    await expect(adminReadingService.scanArticleTerms('article-1')).resolves.toBe(12)
    expect(rpcMock).toHaveBeenCalledWith('scan_reading_article_terms', {
      p_article_id: 'article-1',
    })
  })

  it('loads persisted global term details for the reader', async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          global_term_id: 'term-grace',
          normalized_text: 'grace',
          source_text: 'Grace',
          ipa: '/ɡreɪs/',
          part_of_speech: 'noun',
          audio_url: 'https://audio.example/grace.mp3',
          translation: 'duyên dáng',
          meanings: [],
        },
      ],
      error: null,
    })

    const terms = await readingService.getArticleTerms('article-1')

    expect(terms).toHaveLength(1)
    expect(terms[0]).toMatchObject({
      global_term_id: 'term-grace',
      normalized_text: 'grace',
      translation: 'duyên dáng',
    })
    expect(rpcMock).toHaveBeenCalledWith('get_reading_article_terms', {
      p_article_id: 'article-1',
    })
  })
})
