import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CreatableReadingSelect } from '@/components/reading/CreatableReadingSelect'

describe('CreatableReadingSelect', () => {
  it('creates and selects a new option', async () => {
    const onChange = vi.fn()
    const onCreate = vi.fn().mockResolvedValue({
      value: 'exam-preparation',
      label: 'Luyện thi chuyên sâu',
    })

    render(
      <CreatableReadingSelect
        value="General"
        options={[{ value: 'General', label: 'Đọc Giao tiếp Chung' }]}
        onChange={onChange}
        onCreate={onCreate}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Thêm tùy chọn mới' }))
    fireEvent.change(screen.getByPlaceholderText('Tên tùy chọn mới'), {
      target: { value: 'Luyện thi chuyên sâu' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu tùy chọn' }))

    expect(onCreate).toHaveBeenCalledWith('Luyện thi chuyên sâu')
    expect(await screen.findByText('Đã thêm “Luyện thi chuyên sâu”')).toBeInTheDocument()
    expect(onChange).toHaveBeenCalledWith('exam-preparation')
  })
})
