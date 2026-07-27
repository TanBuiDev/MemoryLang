import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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

  it('moves focus to the next answer when Enter is pressed in an inline listening gap', async () => {
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
              passage: 'Being a Kid (1) ____ and (2) ____.',
              questions: [
                { source_key: 'listening-1-q1', source_number: '1', prompt: 'Blank 1' },
                { source_key: 'listening-1-q2', source_number: '2', prompt: 'Blank 2' },
              ],
            },
          }],
        },
      },
      sections: [{ id: 'section-1', exam_section_source_key: 'listening-1', progress: {}, status: 'not_started' }],
    } as never)

    renderPage()

    const answers = await screen.findAllByPlaceholderText('gõ đáp án...')
    answers[0].focus()
    fireEvent.keyDown(answers[0], { key: 'Enter' })

    await waitFor(() => expect(document.activeElement).toBe(answers[1]))
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
})
