import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { B1SourceExamPicker } from '@/components/admin/exams/B1SourceExamPicker'
import { adminExamService } from '@/services/supabase/adminExam.service'

vi.mock('@/services/supabase/adminExam.service', () => ({
  adminExamService: {
    listB1CloneSources: vi.fn(),
  },
}))

const listB1CloneSources = vi.mocked(adminExamService.listB1CloneSources)

describe('B1SourceExamPicker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    listB1CloneSources.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces the server-side title search by exactly 250 ms', async () => {
    listB1CloneSources.mockResolvedValue([])
    render(<B1SourceExamPicker selectedSourceId={null} onSelect={vi.fn()} />)

    const search = screen.getByRole('searchbox', { name: 'Tìm đề B1 nguồn' })
    fireEvent.change(search, { target: { value: 'PET 2026' } })

    act(() => vi.advanceTimersByTime(249))
    expect(listB1CloneSources).not.toHaveBeenCalled()

    await act(async () => vi.advanceTimersByTime(1))
    expect(listB1CloneSources).toHaveBeenCalledWith('PET 2026')
  })

  it('shows loading, empty, error, result metadata and selected states', async () => {
    let resolveSources: (value: Awaited<ReturnType<typeof adminExamService.listB1CloneSources>>) => void
    listB1CloneSources.mockImplementation(() => new Promise((resolve) => { resolveSources = resolve }))
    const onSelect = vi.fn()
    const { rerender } = render(<B1SourceExamPicker selectedSourceId={null} onSelect={onSelect} />)

    await act(async () => vi.advanceTimersByTime(250))
    expect(screen.getByText('Đang tìm đề B1...')).toBeInTheDocument()

    await act(async () => resolveSources!([]))
    expect(screen.getByText('Không tìm thấy đề B1 phù hợp.')).toBeInTheDocument()

    listB1CloneSources.mockRejectedValueOnce(new Error('Không thể kết nối'))
    fireEvent.change(screen.getByRole('searchbox', { name: 'Tìm đề B1 nguồn' }), { target: { value: 'khác' } })
    await act(async () => vi.advanceTimersByTime(250))
    expect(screen.getByRole('alert')).toHaveTextContent('Không thể kết nối')

    listB1CloneSources.mockResolvedValueOnce([{
      id: 'source-1',
      title: 'B1 PET tháng 8',
      is_published: true,
      section_count: 4,
      updated_at: '2026-08-01T10:00:00.000Z',
    }])
    fireEvent.change(screen.getByRole('searchbox', { name: 'Tìm đề B1 nguồn' }), { target: { value: 'PET' } })
    await act(async () => vi.advanceTimersByTime(250))

    const result = screen.getByRole('button', { name: /B1 PET tháng 8/i })
    expect(result).toHaveTextContent('Đã xuất bản')
    expect(result).toHaveTextContent('4 phần')
    expect(result).toHaveTextContent('Cập nhật')
    fireEvent.click(result)
    expect(onSelect).toHaveBeenCalledWith('source-1')

    rerender(<B1SourceExamPicker selectedSourceId="source-1" onSelect={onSelect} />)
    expect(screen.getByText(/Đã chọn đề nguồn:/)).toBeInTheDocument()
  })
})
