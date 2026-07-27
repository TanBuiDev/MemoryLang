import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { examPracticeService } from '@/services/supabase/examPractice.service'
import { ExamResultPage } from './ExamResultPage'

vi.mock('@/services/supabase/examPractice.service', () => ({
  examPracticeService: { getAttempt: vi.fn(), listPromptSamples: vi.fn() },
}))

describe('ExamResultPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(examPracticeService.getAttempt).mockResolvedValue({
      attempt: { id: 'attempt-1', status: 'submitted' },
      sections: [{
        id: 'section-1', exam_section_source_key: 'grammar', score: 1, max_score: 2,
        progress: { review: [{ section_source_key: 'grammar', question_source_key: 'grammar-101', question: 'Andrew managed ____ a promotion.', user_answer: 'B', correct_option_keys: ['B'], accepted_answers: [], translation: 'Andrew đã xoay xở để được thăng chức.', explanation: 'manage + to-infinitive diễn tả xoay xở làm được việc gì.', is_correct: true }] },
      }, {
        id: 'section-2', exam_section_source_key: 'listening-text-1', score: 0, max_score: 1,
        progress: { review: [{ section_source_key: 'listening-text-1', question_source_key: 'listening-text-1-1', question: 'I love playing ____.', user_answer: 'tennis', correct_option_keys: [], accepted_answers: ['soccer'], translation: 'Tôi thích chơi bóng đá.', explanation: 'Từ cần điền là soccer.', is_correct: false }] },
      }],
    } as never)
    vi.mocked(examPracticeService.listPromptSamples).mockResolvedValue([])
  })

  it('shows detailed answer translations and explanations on a dedicated result page', async () => {
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={['/app/exams/attempt/attempt-1/result']}><Routes><Route path="/app/exams/attempt/:attemptId/result" element={<ExamResultPage />} /></Routes></MemoryRouter></QueryClientProvider>)

    expect(await screen.findByRole('heading', { name: 'Kết quả bài thi thử' })).toBeInTheDocument()
    expect(screen.getByText('Andrew đã xoay xở để được thăng chức.')).toBeInTheDocument()
    expect(screen.getByText(/manage \+ to-infinitive/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Grammar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Listening Text 1/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Quay lại danh sách đề' })).toHaveAttribute('href', '/app/exams')
  })

  it('shows the submitted Writing response with a punctuation-tolerant sample comparison', async () => {
    vi.mocked(examPracticeService.getAttempt).mockResolvedValue({
      attempt: {
        id: 'attempt-1', status: 'submitted',
        exam_snapshot: {
          sections: [{
            source_key: 'writing-topic-7', skill: 'writing', resource_type: 'prompt',
            resource: { id: 'prompt-1', prompt: 'Apply for a part-time job.' },
          }],
        },
      },
      sections: [{
        id: 'section-writing', exam_section_source_key: 'writing-topic-7', score: 0, max_score: 0,
        progress: { draft_content: 'Dear ...,\nI am ready to work.' },
      }],
    } as never)
    vi.mocked(examPracticeService.listPromptSamples).mockResolvedValue([{
      id: 'sample-1', prompt_id: 'prompt-1', title: 'Bài mẫu',
      content: 'Dear I am ready to work', created_at: '', updated_at: '',
    }])

    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={['/app/exams/attempt/attempt-1/result']}><Routes><Route path="/app/exams/attempt/:attemptId/result" element={<ExamResultPage />} /></Routes></MemoryRouter></QueryClientProvider>)

    expect(await screen.findByText('Bài tự luận đã nộp của bạn')).toBeInTheDocument()
    expect(await screen.findByText('So sánh với bài mẫu')).toBeInTheDocument()
    expect(await screen.findByText(/Nội dung bài viết khớp với bài mẫu/)).toBeInTheDocument()
  })
})
