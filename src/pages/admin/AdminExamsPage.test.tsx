import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { adminExamService } from '@/services/supabase/adminExam.service'
import type { Exam } from '@/types/exam.types'
import AdminExamsPage from './AdminExamsPage'

vi.mock('@/services/supabase/adminExam.service', () => ({
  adminExamService: {
    listExams: vi.fn(),
    createExam: vi.fn(),
    createB1Exam: vi.fn(),
    updateExam: vi.fn(),
    deleteExam: vi.fn(),
    listB1CloneSources: vi.fn().mockResolvedValue([]),
  },
}))

const baseExam: Exam = {
  id: 'exam-1',
  title: 'B1 Practice Set',
  category: 'GENERAL',
  description: null,
  source_key: 'not-the-seeded-key',
  cefr_level: 'B1',
  default_time_minutes: 120,
  time_limit_minutes: 120,
  total_questions: 0,
  is_published: false,
  access_tier: 'free',
  exam_format: 'b1_practice',
  cloned_from_exam_id: null,
  clone_mode: 'blank',
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
}

function CurrentLocation() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname}</output>
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/app/admin/exams']}>
      <Routes>
        <Route path="/app/admin/exams" element={<AdminExamsPage />} />
        <Route path="*" element={<CurrentLocation />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminExamsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(adminExamService.listExams).mockResolvedValue([])
    vi.mocked(adminExamService.createB1Exam).mockResolvedValue('new-b1-exam')
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'request-1') })
  })

  it('opens the visual creation wizard from the create action', async () => {
    renderPage()

    await screen.findByText('Chưa có đề thi nào')
    fireEvent.click(screen.getByRole('button', { name: 'Tạo Đề thi mới' }))

    expect(screen.getByRole('dialog', { name: 'Trình tạo đề trực quan' })).toBeInTheDocument()
  })

  it('refreshes the list and opens the reusable builder after creating a B1 exam', async () => {
    vi.mocked(adminExamService.listExams)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ ...baseExam, id: 'new-b1-exam' }])
    renderPage()

    await screen.findByText('Chưa có đề thi nào')
    fireEvent.click(screen.getByRole('button', { name: 'Tạo Đề thi mới' }))
    fireEvent.click(screen.getByRole('button', { name: /B1 Practice/i }))
    fireEvent.change(screen.getByLabelText('Tiêu đề đề B1'), { target: { value: 'B1 mới' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tạo đề B1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận tạo đề' }))

    await waitFor(() => expect(adminExamService.listExams).toHaveBeenCalledTimes(2))
    expect(await screen.findByTestId('location')).toHaveTextContent('/app/admin/exams/new-b1-exam/content')
  })

  it('routes B1 cards to scoped content and media while legacy cards keep the legacy builder', async () => {
    vi.mocked(adminExamService.listExams).mockResolvedValue([
      baseExam,
      { ...baseExam, id: 'legacy-1', title: 'TOEIC Test', exam_format: 'legacy', source_key: 'b1-de-full-copy' },
    ])
    renderPage()

    expect(await screen.findByRole('link', { name: /Quản lý nội dung B1/i })).toHaveAttribute('href', '/app/admin/exams/exam-1/content')
    expect(screen.getByRole('link', { name: /Media/i })).toHaveAttribute('href', '/app/admin/exams/exam-1/media')
    expect(screen.getByRole('link', { name: /Xây dựng Đề/i })).toHaveAttribute('href', '/app/admin/exams/legacy-1/builder')
  })
})
