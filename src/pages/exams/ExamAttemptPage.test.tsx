import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { ExamAttemptPage } from './ExamAttemptPage'
import { examPracticeService } from '@/services/supabase/examPractice.service'

vi.mock('@/services/supabase/examPractice.service', () => ({
  examPracticeService: {
    getAttempt: vi.fn(),
    saveSectionProgress: vi.fn(),
    submitAttempt: vi.fn(),
    listDraftVersions: vi.fn(),
    createDraftVersion: vi.fn(),
  },
}))

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/app/exams/attempt/attempt-1']}>
        <Routes><Route path="/app/exams/attempt/:attemptId" element={<ExamAttemptPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ExamAttemptPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(examPracticeService.getAttempt).mockResolvedValue({
      attempt: {
        id: 'attempt-1',
        started_at: '2026-07-27T10:00:00.000Z',
        target_duration_seconds: 1,
        exam_snapshot: {
          exam: { title: 'B1 DeFull' },
          sections: [{
            source_key: 'writing-1', skill: 'writing', title: 'Viết thư', resource_type: 'prompt',
            resource: { id: 'prompt-1', prompt: 'Viết email cho bạn của bạn.', instructions: 'Viết ít nhất 80 từ.' },
          }],
        },
      },
      sections: [{ id: 'section-1', exam_section_source_key: 'writing-1', progress: {}, status: 'not_started' }],
    } as never)
    vi.mocked(examPracticeService.listDraftVersions).mockResolvedValue([])
    vi.mocked(examPracticeService.saveSectionProgress).mockResolvedValue({ id: 'section-1' } as never)
    vi.mocked(examPracticeService.submitAttempt).mockResolvedValue({ attempt_id: 'attempt-1', score: 1, max_score: 1, reviews: [] })
  })

  it('keeps the attempt open after the timer is over and shows the writing draft workspace', async () => {
    renderPage()

    expect(await screen.findByText('B1 DeFull')).toBeInTheDocument()
    expect(screen.getByText('Bạn đang làm quá giờ')).toBeInTheDocument()
    expect(screen.getByText('Viết email cho bạn của bạn.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lưu thành phiên bản' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nộp bài & xem đáp án' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Lưu phần này' })).not.toBeInTheDocument()
  })

  it('renders one editable input per Listening question even when its number is repeated in the text', async () => {
    vi.mocked(examPracticeService.getAttempt).mockResolvedValue({
      attempt: {
        id: 'attempt-1',
        started_at: '2026-07-27T10:00:00.000Z',
        target_duration_seconds: 3600,
        exam_snapshot: {
          exam: { title: 'B1 DeFull' },
          sections: [{
            source_key: 'listening-1', skill: 'listening', title: 'Listening Text 1', resource_type: 'activity',
            resource: {
              id: 'activity-1', activity_type: 'fill_blank',
              passage: 'Being a Kid (9) ____ and (10) ____. You do not have (10) ____ when you are an adult.',
              questions: [
                { source_key: 'listening-1-q9', source_number: '9', prompt: 'Blank 9' },
                { source_key: 'listening-1-q10', source_number: '10', prompt: 'Blank 10' },
              ],
            },
          }],
        },
      },
      sections: [{ id: 'section-1', exam_section_source_key: 'listening-1', progress: {}, status: 'not_started' }],
    } as never)

    renderPage()

    const answers = await screen.findAllByPlaceholderText('gõ đáp án...')
    expect(answers).toHaveLength(2)
    answers[0].focus()
    fireEvent.keyDown(answers[0], { key: 'Enter' })

    await waitFor(() => expect(document.activeElement).toBe(answers[1]))
  })

  it('renders editable inline gaps from a structured presentation snapshot', async () => {
    vi.mocked(examPracticeService.getAttempt).mockResolvedValue({
      attempt: {
        id: 'attempt-1', started_at: '2026-07-27T10:00:00.000Z', target_duration_seconds: 3600,
        exam_snapshot: {
          exam: { title: 'B1 DeFull' },
          sections: [{
            source_key: 'listening-structured', skill: 'listening', title: 'Listening Text', resource_type: 'activity',
            resource: {
              id: 'activity-1', activity_type: 'fill_blank', presentation_type: 'passage_text_inline',
              content_blocks: [{
                type: 'inline_gap_passage',
                segments: [
                  { type: 'text', value: 'I like ' },
                  { type: 'gap', gapId: 'listening-structured-q1', label: '1' },
                  { type: 'text', value: ' after school.' },
                ],
              }],
              questions: [{ source_key: 'listening-structured-q1', source_number: '1', prompt: 'Blank 1' }],
            },
          }],
        },
      },
      sections: [{ id: 'section-1', exam_section_source_key: 'listening-structured', progress: {}, status: 'not_started' }],
    } as never)

    renderPage()

    expect(await screen.findByText('Điền đáp án trực tiếp vào văn bản:')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('gõ đáp án...')).toBeEnabled()
  })

  it('saves the selected answer before submitting the attempt', async () => {
    vi.mocked(examPracticeService.getAttempt).mockResolvedValue({
      attempt: {
        id: 'attempt-1',
        started_at: '2026-07-27T10:00:00.000Z',
        target_duration_seconds: 3600,
        exam_snapshot: {
          exam: { title: 'B1 DeFull' },
          sections: [{
            source_key: 'reading-1', skill: 'reading', title: 'Reading', resource_type: 'activity',
            resource: {
              id: 'activity-1', activity_type: 'multiple_choice',
              questions: [{
                source_key: 'reading-1-q1', prompt: 'Choose one.',
                options: [{ key: 'A', text: 'First' }, { key: 'B', text: 'Second' }],
              }],
            },
          }],
        },
      },
      sections: [{ id: 'section-1', exam_section_source_key: 'reading-1', progress: {}, status: 'not_started' }],
    } as never)

    renderPage()
    fireEvent.click(await screen.findByText('First'))
    fireEvent.click(screen.getByRole('button', { name: 'Nộp bài & xem đáp án' }))
    fireEvent.click(screen.getByRole('button', { name: 'Nộp bài ngay' }))

    await waitFor(() => expect(examPracticeService.submitAttempt).toHaveBeenCalledWith('attempt-1'))
    expect(examPracticeService.saveSectionProgress).toHaveBeenCalledWith(expect.objectContaining({
      sectionSourceKey: 'reading-1',
      progress: { answers: { 'reading-1-q1': 'A' } },
    }))
  })

  it('moves focus to the next sentence transformation answer when Enter is pressed', async () => {
    vi.mocked(examPracticeService.getAttempt).mockResolvedValue({
      attempt: {
        id: 'attempt-1',
        started_at: '2026-07-27T10:00:00.000Z',
        target_duration_seconds: 3600,
        exam_snapshot: {
          exam: { title: 'B1 DeFull' },
          sections: [{
            source_key: 'transformation-1', skill: 'writing', title: 'Sentence Transformation', resource_type: 'activity',
            resource: {
              id: 'activity-1', activity_type: 'sentence_transformation',
              questions: [
                { source_key: 'transformation-q1', prompt: 'I am tired. (SO)\nI am ___ tired.' },
                { source_key: 'transformation-q2', prompt: 'She is happy. (VERY)\nShe is ___ happy.' },
              ],
            },
          }],
        },
      },
      sections: [{ id: 'section-1', exam_section_source_key: 'transformation-1', progress: {}, status: 'not_started' }],
    } as never)

    renderPage()

    const answers = await screen.findAllByPlaceholderText('...................................')
    answers[0].focus()
    fireEvent.keyDown(answers[0], { key: 'Enter' })

    await waitFor(() => expect(document.activeElement).toBe(answers[1]))
  })

  it('renders a matching section from presentation metadata instead of the legacy question list', async () => {
    vi.mocked(examPracticeService.getAttempt).mockResolvedValue({
      attempt: {
        id: 'attempt-1', started_at: '2026-07-27T10:00:00.000Z', target_duration_seconds: 3600,
        exam_snapshot: {
          exam: { title: 'B1 DeFull' },
          sections: [{
            source_key: 'matching-1', skill: 'reading', title: 'Ghép từ', resource_type: 'activity',
            resource: {
              id: 'activity-1', activity_type: 'multiple_choice', presentation_type: 'matching',
              presentation_config: {
                matching: {
                  leftItems: [{ id: 'left-1', text: 'Monday' }],
                  rightItems: [{ id: 'right-1', text: 'Thứ Hai' }],
                },
              },
              questions: [],
            },
          }],
        },
      },
      sections: [{ id: 'section-1', exam_section_source_key: 'matching-1', progress: {}, status: 'not_started' }],
    } as never)

    renderPage()

    expect(await screen.findByLabelText('Ghép cặp')).toBeInTheDocument()
    expect(screen.getByText('Monday')).toBeInTheDocument()
  })

  it('autosaves matching selections with a section-scoped answer key', async () => {
    const user = userEvent.setup()
    vi.mocked(examPracticeService.getAttempt).mockResolvedValue({
      attempt: {
        id: 'attempt-1', status: 'in_progress', started_at: '2026-07-27T10:00:00.000Z', target_duration_seconds: 3600,
        exam_snapshot: {
          exam: { title: 'B1 DeFull' },
          sections: [{
            source_key: 'matching-1', skill: 'reading', title: 'Ghép từ', resource_type: 'activity',
            resource: {
              id: 'activity-1', activity_type: 'multiple_choice', presentation_type: 'matching',
              presentation_config: {
                matching: {
                  leftItems: [{ id: 'left-1', text: 'Monday' }],
                  rightItems: [{ id: 'right-1', text: 'Thứ Hai' }],
                },
              },
              questions: [],
            },
          }],
        },
      },
      sections: [{ id: 'section-1', exam_section_source_key: 'matching-1', progress: {}, status: 'not_started' }],
    } as never)

    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Chọn mục tương ứng' }))
    await user.click(screen.getAllByText('Thứ Hai').at(-1)!)

    await waitFor(() => expect(examPracticeService.saveSectionProgress).toHaveBeenCalledWith(expect.objectContaining({
      sectionSourceKey: 'matching-1',
      progress: { answers: { 'matching-1:matching:left-1': 'right-1' } },
    })), { timeout: 1500 })
  })

  it('renders an ordering section from presentation metadata', async () => {
    vi.mocked(examPracticeService.getAttempt).mockResolvedValue({
      attempt: { id: 'attempt-1', status: 'in_progress', started_at: '2026-07-28T00:00:00.000Z', target_duration_seconds: 7200, exam_snapshot: { exam: { title: 'B1' }, sections: [{
        source_key: 'ordering-1', skill: 'reading', title: 'Sắp xếp', resource_type: 'activity',
        resource: { id: 'activity-1', presentation_type: 'ordering', activity_type: 'multiple_choice', presentation_config: { ordering: { items: [{ id: 'one', text: 'First', correctPosition: 1 }, { id: 'two', text: 'Second', correctPosition: 2 }] } }, questions: [] },
      }] } },
      sections: [{ id: 'section-1', exam_section_source_key: 'ordering-1', progress: {}, status: 'not_started' }],
    } as never)

    renderPage()

    expect(await screen.findByLabelText('Sắp xếp thứ tự')).toBeInTheDocument()
    expect(screen.getByText('First')).toBeInTheDocument()
  })
})
