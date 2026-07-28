import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { adminExamContentService } from '@/services/supabase/adminExamContent.service'
import { AdminB1ExamContentBuilderPage } from './AdminB1ExamContentBuilderPage'

vi.mock('@/services/supabase/adminExamContent.service', () => ({
  adminExamContentService: {
    getExamContent: vi.fn(),
    updateResourcePresentation: vi.fn(),
    updateResourcePresentationConfig: vi.fn(),
    updateQuestion: vi.fn(),
    updateResourceContent: vi.fn(),
    updatePromptText: vi.fn(),
    listPromptSamples: vi.fn(),
    savePromptSample: vi.fn(),
    deletePromptSample: vi.fn(),
    deleteSection: vi.fn(),
    deleteQuestion: vi.fn(),
    reorderSections: vi.fn(),
    createSection: vi.fn(),
    createQuestion: vi.fn(),
    uploadQuestionImage: vi.fn(),
  },
}))

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/app/admin/exams/exam-1/content']}>
        <Routes>
          <Route path="/app/admin/exams/:id/content" element={<AdminB1ExamContentBuilderPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminB1ExamContentBuilderPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(adminExamContentService.getExamContent).mockResolvedValue({
      id: 'exam-1',
      title: 'Đề B1',
      source_key: 'b1-de-full-copy',
      is_published: false,
      sections: [
        {
          id: 'section-1',
          source_key: 'grammar-1',
          skill: 'grammar',
          title: 'Grammar and Use of English',
          resource_type: 'activity',
          resource_id: 'activity-1',
          order_index: 0,
          is_required: true,
          suggested_time_minutes: 10,
          resource: {
            id: 'activity-1',
            source_key: 'grammar-1',
            kind: 'activity',
            title: 'Grammar and Use of English',
            skill: 'grammar',
            presentation_type: 'choice_list',
            grading_mode: 'single_choice',
            passage: null,
            content: null,
            content_blocks: null,
            instructions: 'Chọn một đáp án đúng',
            questions: [
              {
                id: 'q-1',
                activity_id: 'activity-1',
                source_key: 'q-1',
                source_number: '1',
                prompt: 'Question 1',
                options: [{ key: 'A', text: 'Option A', is_correct: true }],
                accepted_answers: null,
                image_url: null,
                image_alt: null,
                image_crop: null,
                metadata: null,
                translation: null,
                explanation: null,
                order_index: 0,
              },
            ],
          },
        },
        {
          id: 'section-2',
          source_key: 'writing-7',
          skill: 'writing',
          title: 'Writing Topic 7',
          resource_type: 'prompt',
          resource_id: 'prompt-1',
          order_index: 1,
          is_required: true,
          suggested_time_minutes: 20,
          resource: null,
        },
      ],
    } as never)
    vi.mocked(adminExamContentService.listPromptSamples).mockResolvedValue([])
    vi.mocked(adminExamContentService.reorderSections).mockResolvedValue()
  })

  it('renders section structure and editing workspace without JSON textareas', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Trình xây dựng nội dung đề B1' })).toBeInTheDocument()
    expect(screen.getAllByText('Grammar and Use of English').length).toBeGreaterThan(0)
    expect(screen.queryByText(/JSON/i)).not.toBeInTheDocument()
  })

  it('shows a publish checklist with actionable missing-content issues when clicking Tab 3', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Trình xây dựng nội dung đề B1' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Kiểm tra xuất bản/i }))

    expect(await screen.findByRole('heading', { name: 'Kiểm tra trước khi xuất bản' })).toBeInTheDocument()
    expect(screen.getAllByText(/thiếu/i).length).toBeGreaterThan(0)
  })

  it('reorders sections via drag and drop and persists the new exam order', async () => {
    renderPage()

    await screen.findByRole('heading', { name: 'Trình xây dựng nội dung đề B1' })
    const firstSectionCard = screen.getByTestId('section-item-0')
    const secondSectionCard = screen.getByTestId('section-item-1')

    const dragStartEvent = createEvent.dragStart(firstSectionCard)
    Object.defineProperty(dragStartEvent, 'dataTransfer', {
      value: { setData: vi.fn(), getData: () => '0' },
    })
    fireEvent(firstSectionCard, dragStartEvent)

    const dropEvent = createEvent.drop(secondSectionCard)
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: { setData: vi.fn(), getData: () => '0' },
    })
    fireEvent(secondSectionCard, dropEvent)

    await waitFor(() => {
      expect(adminExamContentService.reorderSections).toHaveBeenCalledWith(['section-2', 'section-1'])
    })
  })

  it('creates a draft section from an admin-friendly title and defaults', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('heading', { name: 'Trình xây dựng nội dung đề B1' })
    await user.click(screen.getByRole('button', { name: 'Thêm section' }))
    await user.type(screen.getByLabelText('Tên section'), 'Ngữ pháp mới')
    await user.click(screen.getByRole('button', { name: 'Tạo section' }))

    expect(adminExamContentService.createSection).toHaveBeenCalledWith(
      expect.objectContaining({
        examId: 'exam-1',
        title: 'Ngữ pháp mới',
        skill: 'grammar',
        presentationType: 'choice_list',
        orderIndex: 2,
        sourceKey: expect.stringMatching(/^b1-section-/),
      }),
    )
  })

  it('saves the visual choice editor fields together with the selected presentation', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Trình xây dựng nội dung đề B1' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Lưu cách trình bày' }))

    expect(adminExamContentService.updateResourcePresentation).toHaveBeenCalledWith({
      resourceKind: 'activity',
      resourceId: 'activity-1',
      presentationType: 'choice_list',
      gradingMode: 'single_choice',
    })
  })
})
