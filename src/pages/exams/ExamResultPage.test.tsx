import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { examPracticeService } from '@/services/supabase/examPractice.service'
import { ExamResultPage } from './ExamResultPage'

vi.mock('@/services/supabase/examPractice.service', () => ({
  examPracticeService: { getAttempt: vi.fn(), listPromptSamples: vi.fn(), startAttempt: vi.fn() },
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

  it('shows the selected wrong option and option text inside a Cloze passage', async () => {
    vi.mocked(examPracticeService.getAttempt).mockResolvedValue({
      attempt: {
        id: 'attempt-1', status: 'submitted',
        exam_snapshot: {
          sections: [{
            source_key: 'cloze-1', skill: 'cloze', resource_type: 'activity',
            resource: {
              passage: 'William called (1) ____ an ambulance.',
              questions: [{
                source_key: 'cloze-1-q1', source_number: '1', prompt: 'Blank 1',
                options: [{ key: 'A', text: 'to' }, { key: 'B', text: 'for' }],
              }],
            },
          }],
        },
      },
      sections: [{
        id: 'section-cloze', exam_section_source_key: 'cloze-1', score: 0, max_score: 1,
        progress: { review: [{
          section_source_key: 'cloze-1', question_source_key: 'cloze-1-q1', question: 'Blank 1',
          user_answer: 'A', correct_option_keys: ['B'], accepted_answers: [], translation: null, explanation: null, is_correct: false,
        }] },
      }],
    } as never)

    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={['/app/exams/attempt/attempt-1/result']}><Routes><Route path="/app/exams/attempt/:attemptId/result" element={<ExamResultPage />} /></Routes></MemoryRouter></QueryClientProvider>)

    expect(await screen.findByText('for')).toBeInTheDocument()
    expect(screen.getByText('to')).toHaveClass('text-danger')
    expect(screen.getByText('to')).not.toHaveClass('line-through')
  })

  it('shows option text instead of its letter for a correct inline Cloze answer', async () => {
    vi.mocked(examPracticeService.getAttempt).mockResolvedValue({
      attempt: {
        id: 'attempt-1', status: 'submitted',
        exam_snapshot: {
          sections: [{
            source_key: 'cloze-1', skill: 'cloze', resource_type: 'activity',
            resource: {
              passage: 'William called (1) ____ an ambulance.',
              questions: [{
                source_key: 'cloze-1-q1', source_number: '1', prompt: 'Blank 1',
                options: [{ key: 'A', text: 'to' }, { key: 'B', text: 'for' }],
              }],
            },
          }],
        },
      },
      sections: [{
        id: 'section-cloze', exam_section_source_key: 'cloze-1', score: 1, max_score: 1,
        progress: { review: [{
          section_source_key: 'cloze-1', question_source_key: 'cloze-1-q1', question: 'Blank 1',
          user_answer: 'B', correct_option_keys: ['B'], accepted_answers: [], translation: null, explanation: null, is_correct: true,
        }] },
      }],
    } as never)

    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={['/app/exams/attempt/attempt-1/result']}><Routes><Route path="/app/exams/attempt/:attemptId/result" element={<ExamResultPage />} /></Routes></MemoryRouter></QueryClientProvider>)

    expect(await screen.findByText('for')).toBeInTheDocument()
    expect(screen.queryByText('B')).not.toBeInTheDocument()
  })

  it('uses the snapshot section title instead of deriving a title from a source key', async () => {
    vi.mocked(examPracticeService.getAttempt).mockResolvedValue({
      attempt: { id: 'attempt-1', status: 'submitted', exam_snapshot: { sections: [{ source_key: 'b1-section-opaque', title: 'Bài đọc về môi trường', skill: 'reading', resource_type: 'activity', resource: { questions: [] } }] } },
      sections: [{ id: 'section-1', exam_section_source_key: 'b1-section-opaque', score: 1, max_score: 1, progress: { review: [{ section_source_key: 'b1-section-opaque', question_source_key: 'opaque-q1', question: 'Question', user_answer: 'A', correct_option_keys: ['A'], accepted_answers: [], translation: null, explanation: null, is_correct: true }] } }],
    } as never)

    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={['/app/exams/attempt/attempt-1/result']}><Routes><Route path="/app/exams/attempt/:attemptId/result" element={<ExamResultPage />} /></Routes></MemoryRouter></QueryClientProvider>)

    expect(await screen.findByRole('heading', { name: 'Bài đọc về môi trường' })).toBeInTheDocument()
  })

  it('renders a structured inline-passage snapshot using its presentation type', async () => {
    vi.mocked(examPracticeService.getAttempt).mockResolvedValue({
      attempt: {
        id: 'attempt-1', status: 'submitted',
        exam_snapshot: {
          sections: [{
            source_key: 'cloze-1', skill: 'cloze', resource_type: 'activity',
            resource: {
              presentation_type: 'passage_choice_inline',
              content_blocks: [{
                type: 'inline_gap_passage',
                segments: [
                  { type: 'text', value: 'William called ' },
                  { type: 'gap', gapId: 'cloze-1-q1', label: '1' },
                  { type: 'text', value: ' an ambulance.' },
                ],
              }],
              questions: [{
                source_key: 'cloze-1-q1', source_number: '1', prompt: 'Blank 1',
                options: [{ key: 'A', text: 'to' }, { key: 'B', text: 'for' }],
              }],
            },
          }],
        },
      },
      sections: [{
        id: 'section-cloze', exam_section_source_key: 'cloze-1', score: 0, max_score: 1,
        progress: { review: [{
          section_source_key: 'cloze-1', question_source_key: 'cloze-1-q1', question: 'Blank 1',
          user_answer: 'A', correct_option_keys: ['B'], accepted_answers: [], translation: null, explanation: null, is_correct: false,
        }] },
      }],
    } as never)

    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={['/app/exams/attempt/attempt-1/result']}><Routes><Route path="/app/exams/attempt/:attemptId/result" element={<ExamResultPage />} /></Routes></MemoryRouter></QueryClientProvider>)

    expect(await screen.findByText('Văn bản và kết quả điền đáp án trực tiếp:')).toBeInTheDocument()
    expect(screen.getByText('for')).toBeInTheDocument()
    expect(screen.getByText('to')).toHaveClass('text-danger')
  })

  it('renders a matching review from presentation metadata with answer text instead of internal IDs', async () => {
    vi.mocked(examPracticeService.getAttempt).mockResolvedValue({
      attempt: {
        id: 'attempt-1', status: 'submitted',
        exam_snapshot: {
          sections: [{
            source_key: 'matching-1', title: 'Ghép ngày', skill: 'reading', resource_type: 'activity',
            resource: {
              presentation_type: 'matching',
              presentation_config: {
                matching: {
                  leftItems: [{ id: 'left-1', text: 'Monday' }],
                  rightItems: [{ id: 'right-1', text: 'Thứ Hai' }, { id: 'right-2', text: 'Thứ Ba' }],
                },
              },
              questions: [],
            },
          }],
        },
      },
      sections: [{
        id: 'section-matching', exam_section_source_key: 'matching-1', score: 0, max_score: 1,
        progress: { review: [{
          section_source_key: 'matching-1', question_source_key: 'matching:left-1', question: 'Monday',
          user_answer: 'right-2', correct_option_keys: [], accepted_answers: ['right-1'],
          translation: null, explanation: null, is_correct: false,
        }] },
      }],
    } as never)

    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={['/app/exams/attempt/attempt-1/result']}><Routes><Route path="/app/exams/attempt/:attemptId/result" element={<ExamResultPage />} /></Routes></MemoryRouter></QueryClientProvider>)

    expect(await screen.findByLabelText('Kết quả ghép cặp')).toBeInTheDocument()
    expect(screen.getByText('Thứ Ba')).toHaveClass('bg-danger')
    expect(screen.getByText('Thứ Hai')).toHaveClass('bg-yellow-300')
    expect(screen.queryByText('right-1')).not.toBeInTheDocument()
  })

  it('renders an ordering review from presentation metadata', async () => {
    vi.mocked(examPracticeService.getAttempt).mockResolvedValue({
      attempt: { id: 'attempt-1', status: 'submitted', exam_snapshot: { sections: [{
        source_key: 'ordering-1', title: 'Sắp xếp', skill: 'reading', resource_type: 'activity',
        resource: { presentation_type: 'ordering', presentation_config: { ordering: { items: [{ id: 'one', text: 'First', correctPosition: 1 }, { id: 'two', text: 'Second', correctPosition: 2 }] } }, questions: [] },
      }] } },
      sections: [{ id: 'section-ordering', exam_section_source_key: 'ordering-1', score: 0, max_score: 2, progress: { review: [{ section_source_key: 'ordering-1', question_source_key: 'ordering', question: 'Sắp xếp', user_answer: '["two","one"]', correct_option_keys: [], accepted_answers: [], translation: null, explanation: null, is_correct: false }] } }],
    } as never)

    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={['/app/exams/attempt/attempt-1/result']}><Routes><Route path="/app/exams/attempt/:attemptId/result" element={<ExamResultPage />} /></Routes></MemoryRouter></QueryClientProvider>)

    expect(await screen.findByLabelText('Kết quả sắp xếp')).toBeInTheDocument()
    expect(screen.getByText('Thứ tự đúng')).toBeInTheDocument()
  })

  it('creates a new attempt with the same timer when the learner starts over', async () => {
    vi.mocked(examPracticeService.getAttempt).mockResolvedValue({
      attempt: {
        id: 'attempt-1', status: 'submitted', exam_id: 'exam-1', target_duration_seconds: 5400,
      },
      sections: [],
    } as never)
    vi.mocked(examPracticeService.startAttempt).mockResolvedValue({ id: 'attempt-2' } as never)

    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={['/app/exams/attempt/attempt-1/result']}><Routes><Route path="/app/exams/attempt/:attemptId/result" element={<ExamResultPage />} /><Route path="/app/exams/attempt/:attemptId" element={<div>New attempt</div>} /></Routes></MemoryRouter></QueryClientProvider>)

    fireEvent.click(await screen.findByRole('button', { name: 'Làm lại bài thi' }))

    await waitFor(() => expect(examPracticeService.startAttempt).toHaveBeenCalledWith('exam-1', 5400))
    expect(await screen.findByText('New attempt')).toBeInTheDocument()
  })
})
