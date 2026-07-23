import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ReadingRichTextEditor } from '@/components/reading/ReadingRichTextEditor'

describe('ReadingRichTextEditor', () => {
  it('provides familiar formatting controls for non-technical admins', () => {
    render(
      <ReadingRichTextEditor
        value="<p>Hello world</p>"
        onChange={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: 'In đậm' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'In nghiêng' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gạch chân' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Danh sách dấu chấm' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hoàn tác' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Làm lại' })).toBeInTheDocument()
  })

  it('keeps an HTML source mode for advanced editing', () => {
    const onChange = vi.fn()
    render(
      <ReadingRichTextEditor
        value="<p>Hello world</p>"
        onChange={onChange}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa HTML' }))
    const source = screen.getByRole('textbox', { name: 'Mã HTML bài đọc' })
    fireEvent.change(source, { target: { value: '<h2>Updated</h2>' } })

    expect(onChange).toHaveBeenLastCalledWith('<h2>Updated</h2>')
  })
})
