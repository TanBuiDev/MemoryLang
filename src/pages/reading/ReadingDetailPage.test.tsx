import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReadingDetailPage } from '@/pages/reading/ReadingDetailPage'

const mocks = vi.hoisted(() => ({
  showToast: vi.fn(),
  generateAudio: vi.fn(),
  getArticleDetail: vi.fn(),
  getArticleTerms: vi.fn(),
  startAttempt: vi.fn(),
  submitQuiz: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useParams: () => ({ articleId: 'article-1' }),
  Link: ({ children }: { children: React.ReactNode }) => <a href="/app/reading">{children}</a>,
}))

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ profile: { is_admin: true } }),
}))

vi.mock('@/stores/useSubscriptionStore', () => ({
  useSubscriptionStore: (selector: (state: unknown) => unknown) =>
    selector({ isPro: false }),
}))

vi.mock('@/services/supabase/reading.service', () => ({
  readingService: {
    getArticleDetail: mocks.getArticleDetail,
    getArticleTerms: mocks.getArticleTerms,
    startAttempt: mocks.startAttempt,
    submitQuiz: mocks.submitQuiz,
  },
}))

vi.mock('@/components/ui/toast', () => ({
  showToast: mocks.showToast,
}))

vi.mock('@/services/api/generateAudio.api', () => ({
  generateAudio: mocks.generateAudio,
}))

describe('ReadingDetailPage audio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getArticleDetail.mockResolvedValue({
      id: 'article-1',
      title: 'William the hero!',
      subtitle: null,
      content_html: '<p>Full article content</p>',
      plain_text: 'Full article content',
      cefr_level: 'B1',
      difficulty: 'medium',
      topics: [],
      purpose: 'General',
      word_count: 3,
      estimated_reading_time: 1,
      audio_url: null,
      audio_duration: null,
      is_published: true,
      access_tier: 'free',
      created_at: '2026-07-24T00:00:00Z',
      updated_at: '2026-07-24T00:00:00Z',
      questions: [],
    })
    mocks.getArticleTerms.mockResolvedValue([])
    mocks.startAttempt.mockResolvedValue({
      id: 'attempt-1',
      user_id: 'user-1',
      article_id: 'article-1',
      started_at: '2026-07-24T00:00:00Z',
      time_spent_seconds: 0,
      score: null,
      total_questions: 0,
      is_completed: false,
    })
  })

  it('notifies the reader instead of generating a shortened audio file', async () => {
    render(<ReadingDetailPage />)

    await screen.findByRole('heading', { name: 'William the hero!' })
    const audioTitle = screen.getByText('Âm thanh phát bài đọc (TTS)')
    const playButton = audioTitle.parentElement?.parentElement?.querySelector('button')
    expect(playButton).not.toBeNull()

    fireEvent.click(playButton!)

    await waitFor(() => {
      expect(mocks.showToast).toHaveBeenCalledWith({
        type: 'warning',
        title: 'Bài đọc chưa có audio',
        message: 'Vui lòng quay lại sau khi quản trị viên tạo audio cho bài đọc này.',
      })
    })
    expect(mocks.generateAudio).not.toHaveBeenCalled()
  })

  it('warns when the reader has not answered every question', async () => {
    mocks.getArticleDetail.mockResolvedValue({
      ...(await mocks.getArticleDetail()),
      content_html: '<p>Choose (1) ______ and (2) ______.</p>',
      questions: [
        {
          id: 'q1',
          article_id: 'article-1',
          question_text: 'Blank 1',
          question_type: 'multiple_choice',
          options: [{ text: 'one', is_correct: true }],
          order_index: 1,
          points: 1,
        },
        {
          id: 'q2',
          article_id: 'article-1',
          question_text: 'Blank 2',
          question_type: 'multiple_choice',
          options: [{ text: 'two', is_correct: true }],
          order_index: 2,
          points: 1,
        },
      ],
    })

    render(<ReadingDetailPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Nộp Bài Đọc Hiểu' }))

    expect(mocks.showToast).toHaveBeenCalledWith({
      type: 'warning',
      title: 'Bạn chưa chọn hết đáp án',
      message: 'Vui lòng trả lời đầy đủ 2 câu hỏi trước khi nộp bài.',
    })
    expect(mocks.submitQuiz).not.toHaveBeenCalled()
  })

  it('labels choices A-D and fills correct answers into the article after submission', async () => {
    mocks.getArticleDetail.mockResolvedValue({
      ...(await mocks.getArticleDetail()),
      content_html: '<p>Choose (1) ______ and (2) ______.</p>',
      questions: [
        {
          id: 'q1',
          article_id: 'article-1',
          question_text: 'Blank 1',
          question_type: 'multiple_choice',
          options: [
            { text: 'one', is_correct: true },
            { text: 'wrong', is_correct: false },
          ],
          order_index: 1,
          points: 1,
        },
        {
          id: 'q2',
          article_id: 'article-1',
          question_text: 'Blank 2',
          question_type: 'multiple_choice',
          options: [
            { text: 'bad', is_correct: false },
            { text: 'a very long correct answer', is_correct: true },
          ],
          order_index: 2,
          points: 1,
        },
      ],
    })
    mocks.submitQuiz.mockResolvedValue({ score: 2, total: 2, percentage: 100 })

    render(<ReadingDetailPage />)
    const firstAnswer = (await screen.findByText('one')).closest('button')
    const secondAnswer = screen.getByText('a very long correct answer').closest('button')
    expect(firstAnswer).toHaveTextContent('A.')
    expect(secondAnswer).toHaveTextContent('B.')
    fireEvent.click(firstAnswer!)
    fireEvent.click(secondAnswer!)
    fireEvent.click(screen.getByRole('button', { name: 'Nộp Bài Đọc Hiểu' }))

    await waitFor(() => {
      expect(document.querySelectorAll('[data-reading-quiz-answer]')).toHaveLength(2)
    })
    expect(document.body).toHaveTextContent('Choose (1) one and (2) a very long correct answer.')
  })
})
