import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { adminExamContentService } from '@/services/supabase/adminExamContent.service'
import { AdminB1ExamContentBuilderPage } from './AdminB1ExamContentBuilderPage'

vi.mock('@/services/supabase/adminExamContent.service', () => ({
  adminExamContentService: {
    getExamContent: vi.fn(), updateResourcePresentation: vi.fn(), updateQuestion: vi.fn(), updateResourceContent: vi.fn(), updatePromptText: vi.fn(),
    listPromptSamples: vi.fn(), savePromptSample: vi.fn(), deletePromptSample: vi.fn(),
  },
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
          presentation_type: 'choice_list', grading_mode: 'single_choice', is_published: false, passage: 'I like (1) ____ after school.', questions: [{
            id: 'question-1', activity_id: 'activity-1', source_key: 'listening-1-q1', source_number: '1', prompt: 'Choose one', order_index: 0,
            options: [{ key: 'A', text: 'First', is_correct: true }, { key: 'B', text: 'Second', is_correct: false }], accepted_answers: ['football'], translation: null, explanation: null,
          }],
        },
      }],
    } as never)
    vi.mocked(adminExamContentService.updateResourcePresentation).mockResolvedValue(undefined)
    vi.mocked(adminExamContentService.updateQuestion).mockResolvedValue(undefined)
    vi.mocked(adminExamContentService.updateResourceContent).mockResolvedValue(undefined)
    vi.mocked(adminExamContentService.updatePromptText).mockResolvedValue(undefined)
    vi.mocked(adminExamContentService.listPromptSamples).mockResolvedValue([])
    vi.mocked(adminExamContentService.deletePromptSample).mockResolvedValue(undefined)
  })

  it('switches the editor guidance when an admin chooses inline text gaps', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Trình xây dựng nội dung đề B1' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Điền từ trong đoạn văn/i }))

    expect(screen.getByText(/Trình soạn đoạn văn có ô trống/i)).toBeInTheDocument()
    expect(screen.queryByText(/JSON/i)).not.toBeInTheDocument()
  })

  it('shows a publish checklist with actionable missing-content issues', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Kiểm tra trước khi xuất bản' })).toBeInTheDocument()
    expect(screen.getByText(/thiếu audio bắt buộc/i)).toBeInTheDocument()
  })

  it('saves the visual choice editor fields together with the selected presentation', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Học viên làm bài' })).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Lưu cách trình bày' }))

    expect(adminExamContentService.updateResourcePresentation).toHaveBeenCalled()
    expect(adminExamContentService.updateQuestion).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ prompt: expect.any(String) }))
  })

  it('saves structured passage blocks when inline text gaps are selected', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /Điền từ trong đoạn văn/i }))
    await user.click(screen.getByRole('button', { name: 'Lưu cách trình bày' }))

    expect(adminExamContentService.updateResourceContent).toHaveBeenCalledWith(expect.objectContaining({
      resourceKind: 'activity', contentBlocks: expect.any(Array),
    }))
    expect(adminExamContentService.updateQuestion).toHaveBeenCalledWith('question-1', expect.objectContaining({ accepted_answers: expect.any(Array) }))
  })

  it('lets an admin save a Writing sample for learner comparison', async () => {
    vi.mocked(adminExamContentService.getExamContent).mockResolvedValueOnce({
      id: 'exam-1', title: 'Đề B1', source_key: 'b1-de-full-copy', is_published: false,
      sections: [{
        id: 'section-writing', source_key: 'writing-7', skill: 'writing', title: 'Writing Topic 7',
        resource_type: 'prompt', resource_id: 'prompt-1', order_index: 0, is_required: true, suggested_time_minutes: 20,
        resource: {
          id: 'prompt-1', source_key: 'writing-7', title: 'Writing Topic 7', skill: 'writing', kind: 'prompt',
          presentation_type: 'long_form_prompt', grading_mode: 'sample_compare', is_published: false,
          prompt: 'Write an application.', instructions: 'Write 100 words.', questions: [],
        },
      }],
    } as never)
    vi.mocked(adminExamContentService.savePromptSample).mockResolvedValue({
      id: 'sample-1', prompt_id: 'prompt-1', title: 'Bài mẫu', content: 'Dear ...', created_at: '2026-07-28T00:00:00Z', updated_at: '2026-07-28T00:00:00Z',
    })
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('heading', { name: 'Trình xây dựng nội dung đề B1' })
    await user.click(screen.getByRole('button', { name: 'Thêm bài mẫu' }))
    await user.type(screen.getByLabelText('Tên bài mẫu'), 'Bài mẫu thư xin việc')
    await user.type(screen.getByLabelText('Nội dung bài mẫu'), 'Dear ...,')
    await user.click(screen.getByRole('button', { name: 'Lưu bài mẫu' }))

    expect(adminExamContentService.savePromptSample).toHaveBeenCalledWith({
      promptId: 'prompt-1', title: 'Bài mẫu thư xin việc', content: 'Dear ...,',
    })
  })
})
