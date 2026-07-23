import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readingService } from '@/services/supabase/reading.service'

vi.mock('@/services/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'art-1',
            title: 'Test Article',
            cefr_level: 'B1',
            difficulty: 'medium',
            topics: ['Tech'],
            purpose: 'IELTS',
            word_count: 500,
            estimated_reading_time: 4,
            is_published: true,
            access_tier: 'free',
            created_at: '2026-07-23T00:00:00Z',
            updated_at: '2026-07-23T00:00:00Z',
          },
        ],
        error: null,
        count: 1,
      }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-123' } } },
      }),
    },
  },
}))

describe('readingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches list of published reading articles', async () => {
    const result = await readingService.listArticles({ level: 'B1' })
    expect(result.articles).toHaveLength(1)
    expect(result.articles[0].title).toBe('Test Article')
    expect(result.total).toBe(1)
  })

  it('calculates quiz score correctly in submitQuiz', async () => {
    const questions = [
      {
        id: 'q1',
        article_id: 'art-1',
        question_text: 'Is AI good?',
        question_type: 'multiple_choice' as const,
        options: [
          { text: 'Yes', is_correct: true },
          { text: 'No', is_correct: false },
        ],
        order_index: 1,
        points: 2,
      },
    ]

    const answers = [{ question_id: 'q1', selected_option: 'Yes' }]

    const result = await readingService.submitQuiz('attempt-1', answers, questions)
    expect(result.score).toBe(2)
    expect(result.total).toBe(2)
    expect(result.percentage).toBe(100)
  })
})
