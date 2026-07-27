import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ExamHubPage } from './ExamHubPage'
import { examPracticeService } from '@/services/supabase/examPractice.service'
import { useAuthStore } from '@/stores/useAuthStore'

vi.mock('@/services/supabase/client', () => ({ isSupabaseConfigured: true, supabase: {} }))
vi.mock('@/services/supabase/examPractice.service', () => ({
  examPracticeService: {
    listAvailableExams: vi.fn(),
    startAttempt: vi.fn(),
  },
}))

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/app/exams']}>
        <Routes>
          <Route path="/app/exams" element={<ExamHubPage />} />
          <Route path="/app/exams/attempt/:attemptId" element={<div>Attempt session reached</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ExamHubPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ user: { id: 'learner-1' } as never, profile: null })
    vi.mocked(examPracticeService.listAvailableExams).mockResolvedValue([
      {
        id: 'b1-1',
        title: 'B1 DeFull – Đề tổng hợp',
        description: 'Luyện đủ kỹ năng',
        default_time_minutes: 120,
        access_tier: 'free',
      },
    ] as never)
  })

  it('offers a shared-timer mock exam and lets the learner start it', async () => {
    vi.mocked(examPracticeService.startAttempt).mockResolvedValue({ id: 'attempt-1' } as never)
    const user = userEvent.setup()

    renderPage()

    expect(await screen.findByText('B1 DeFull – Đề tổng hợp')).toBeInTheDocument()
    expect(screen.getByText('Đồng hồ chung cho toàn bộ kỳ thi')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Bắt đầu đề' }))

    expect(examPracticeService.startAttempt).toHaveBeenCalledWith('b1-1', 7200)
    expect(await screen.findByText('Attempt session reached')).toBeInTheDocument()
  })
})
