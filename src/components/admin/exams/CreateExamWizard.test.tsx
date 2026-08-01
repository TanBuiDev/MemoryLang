import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CreateExamWizard } from '@/components/admin/exams/CreateExamWizard'
import { adminExamService } from '@/services/supabase/adminExam.service'

vi.mock('@/services/supabase/adminExam.service', () => ({
  adminExamService: {
    createExam: vi.fn(),
    createB1Exam: vi.fn(),
    listB1CloneSources: vi.fn().mockResolvedValue([]),
  },
}))

const createExam = vi.mocked(adminExamService.createExam)
const createB1Exam = vi.mocked(adminExamService.createB1Exam)

function chooseB1() {
  fireEvent.click(screen.getByRole('button', { name: /B1 Practice/i }))
}

function continueB1Details(title = 'B1 PET Practice') {
  fireEvent.change(screen.getByLabelText('Tiêu đề đề B1'), { target: { value: title } })
  fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }))
}

describe('CreateExamWizard', () => {
  beforeEach(() => {
    createExam.mockReset()
    createB1Exam.mockReset()
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'request-1') })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('routes legacy format to its existing creation behavior', async () => {
    createExam.mockResolvedValue({ id: 'legacy-1', title: 'TOEIC Test' } as never)
    const onCreated = vi.fn()
    render(<CreateExamWizard open onClose={vi.fn()} onCreated={onCreated} />)

    fireEvent.click(screen.getByRole('button', { name: /Đề thi truyền thống/i }))
    fireEvent.change(screen.getByLabelText('Tên đề thi'), { target: { value: 'TOEIC Test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo đề thi' }))

    await waitFor(() => expect(createExam).toHaveBeenCalledWith(expect.objectContaining({
      title: 'TOEIC Test',
      category: 'TOEIC',
      is_published: false,
    })))
    expect(onCreated).toHaveBeenCalledWith('legacy-1', 'legacy')
  })

  it('starts B1 details with the documented defaults', () => {
    render(<CreateExamWizard open onClose={vi.fn()} onCreated={vi.fn()} />)
    chooseB1()

    expect(screen.getByLabelText('Khung năng lực')).toHaveValue('B1')
    expect(screen.getByLabelText('Danh mục')).toHaveValue('Tổng hợp (GENERAL)')
    expect(screen.getByLabelText('Quyền truy cập')).toHaveValue('free')
    expect(screen.getByLabelText('Thời lượng (phút)')).toHaveValue(120)
  })

  it('does not require a source for blank B1 and explains clone summaries', () => {
    render(<CreateExamWizard open onClose={vi.fn()} onCreated={vi.fn()} />)
    chooseB1()
    continueB1Details()
    fireEvent.click(screen.getByRole('button', { name: /Tạo đề trống/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }))
    expect(screen.queryByLabelText('Tìm đề B1 nguồn')).not.toBeInTheDocument()
    expect(screen.getByText(/Bắt đầu với một đề B1 trống/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Quay lại' }))
    fireEvent.click(screen.getByRole('button', { name: /Sao chép cấu trúc/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }))
    expect(screen.getByLabelText('Tìm đề B1 nguồn')).toBeInTheDocument()
  })

  it('requires a source for clone modes and explains structure-only versus independent content', async () => {
    vi.useFakeTimers()
    try {
      vi.mocked(adminExamService.listB1CloneSources).mockResolvedValue([{
        id: 'source-1', title: 'Nguồn B1', is_published: false, section_count: 4, updated_at: '2026-08-01T00:00:00Z',
      }])
      render(<CreateExamWizard open onClose={vi.fn()} onCreated={vi.fn()} />)
      chooseB1()
      continueB1Details()
      fireEvent.click(screen.getByRole('button', { name: /Sao chép cấu trúc/i }))
      fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }))
      await act(async () => vi.advanceTimersByTime(250))
      fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }))
      expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng chọn đề B1 nguồn.')
      fireEvent.click(screen.getByRole('button', { name: /Nguồn B1/i }))
      fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }))
      expect(screen.getByText(/chỉ sao chép bố cục/i)).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Quay lại' }))
      fireEvent.click(screen.getByRole('button', { name: 'Quay lại' }))
      fireEvent.click(screen.getByRole('button', { name: /Sao chép toàn bộ nội dung/i }))
      fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }))
      await act(async () => vi.advanceTimersByTime(250))
      fireEvent.click(screen.getByRole('button', { name: /Nguồn B1/i }))
      fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }))
      expect(screen.getByText(/nội dung riêng độc lập/i)).toBeInTheDocument()
      expect(screen.getByText(/media được dùng chung/i)).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('prevents invalid B1 title and duration submissions with Vietnamese feedback', () => {
    render(<CreateExamWizard open onClose={vi.fn()} onCreated={vi.fn()} />)
    chooseB1()
    fireEvent.change(screen.getByLabelText('Thời lượng (phút)'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }))
    expect(screen.getByText('Vui lòng nhập tiêu đề đề B1.')).toBeInTheDocument()
    expect(screen.getByText('Thời lượng phải từ 1 đến 480 phút.')).toBeInTheDocument()
  })

  it('keeps the B1 form state and request ID after a failed submit, then calls onCreated once on success', async () => {
    let rejectFirstRequest: (reason?: unknown) => void
    createB1Exam.mockImplementationOnce(() => new Promise((_, reject) => { rejectFirstRequest = reject })).mockResolvedValueOnce('b1-1')
    const onCreated = vi.fn()
    render(<CreateExamWizard open onClose={vi.fn()} onCreated={onCreated} />)
    chooseB1()
    continueB1Details('B1 giữ nguyên')
    fireEvent.click(screen.getByRole('button', { name: /Tạo đề trống/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tạo đề B1' }))
    const confirm = screen.getByRole('dialog', { name: 'Tạo đề B1?' })
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận tạo đề' }))
    expect(within(confirm).getByRole('button', { name: 'Đang tạo...' })).toBeDisabled()

    await act(async () => rejectFirstRequest!(new Error('Mạng không ổn định')))
    expect(screen.getByRole('alert')).toHaveTextContent('Mạng không ổn định')
    expect(createB1Exam).toHaveBeenCalledWith(expect.objectContaining({ requestId: 'request-1', title: 'B1 giữ nguyên' }))
    expect(screen.getByText('B1 giữ nguyên')).toBeInTheDocument()

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Xác nhận tạo đề' })))
    expect(onCreated).toHaveBeenCalledTimes(1)
    expect(onCreated).toHaveBeenCalledWith('b1-1', 'b1_practice')
    expect(createB1Exam.mock.calls[1][0].requestId).toBe('request-1')
    expect(globalThis.crypto.randomUUID).toHaveBeenCalledTimes(1)
  })
})
