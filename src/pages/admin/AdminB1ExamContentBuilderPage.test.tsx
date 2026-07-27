import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { adminExamContentService } from '@/services/supabase/adminExamContent.service'
import { AdminB1ExamContentBuilderPage } from './AdminB1ExamContentBuilderPage'

vi.mock('@/services/supabase/adminExamContent.service', () => ({
  adminExamContentService: { getExamContent: vi.fn(), updateResourcePresentation: vi.fn() },
}))

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/app/admin/exams/exam-1/content']}>
        <Routes><Route path="/app/admin/exams/:id/content" element={<AdminB1ExamContentBuilderPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminB1ExamContentBuilderPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(adminExamContentService.getExamContent).mockResolvedValue({
      id: 'exam-1', title: 'Đề B1', source_key: 'b1-de-full-copy', is_published: false,
      sections: [{
        id: 'section-1', source_key: 'listening-1', skill: 'listening', title: 'Listening Text 1',
        resource_type: 'activity', resource_id: 'activity-1', order_index: 0, is_required: true, suggested_time_minutes: 10,
        resource: {
          id: 'activity-1', source_key: 'listening-1', title: 'Listening Text 1', skill: 'listening', kind: 'activity',
          presentation_type: 'choice_list', grading_mode: 'single_choice', is_published: false, questions: [],
        },
      }],
    } as never)
  })

  it('switches the editor guidance when an admin chooses inline text gaps', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Trình xây dựng nội dung đề B1' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Điền từ trong đoạn văn/i }))

    expect(screen.getByText(/Trình soạn đoạn văn có ô trống/i)).toBeInTheDocument()
    expect(screen.queryByText(/JSON/i)).not.toBeInTheDocument()
  })
})
