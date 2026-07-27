import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ExamAttemptPage } from './ExamAttemptPage'
import { examPracticeService } from '@/services/supabase/examPractice.service'

vi.mock('@/services/supabase/examPractice.service', () => ({
  examPracticeService: {
    getAttempt: vi.fn(),
    saveSectionProgress: vi.fn(),
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
    expect(screen.getByRole('button', { name: 'Lưu phiên bản này' })).toBeInTheDocument()
  })
})
