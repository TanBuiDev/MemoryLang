import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { examPracticeService } from '@/services/supabase/examPractice.service'
import { ExamResultPage } from './ExamResultPage'

vi.mock('@/services/supabase/examPractice.service', () => ({
  examPracticeService: { getAttempt: vi.fn() },
}))

describe('ExamResultPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(examPracticeService.getAttempt).mockResolvedValue({
      attempt: { id: 'attempt-1', status: 'submitted' },
      sections: [{
        id: 'section-1', exam_section_source_key: 'grammar', score: 1, max_score: 2,
        progress: { review: [{ question_source_key: 'grammar-101', question: 'Andrew managed ____ a promotion.', user_answer: 'B', correct_option_keys: ['B'], accepted_answers: [], translation: 'Andrew đã xoay xở để được thăng chức.', explanation: 'manage + to-infinitive diễn tả xoay xở làm được việc gì.', is_correct: true }] },
      }],
    } as never)
  })

  it('shows detailed answer translations and explanations on a dedicated result page', async () => {
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={['/app/exams/attempt/attempt-1/result']}><Routes><Route path="/app/exams/attempt/:attemptId/result" element={<ExamResultPage />} /></Routes></MemoryRouter></QueryClientProvider>)

    expect(await screen.findByRole('heading', { name: 'Kết quả bài thi thử' })).toBeInTheDocument()
    expect(screen.getByText('Andrew đã xoay xở để được thăng chức.')).toBeInTheDocument()
    expect(screen.getByText(/manage \+ to-infinitive/)).toBeInTheDocument()
  })
})
