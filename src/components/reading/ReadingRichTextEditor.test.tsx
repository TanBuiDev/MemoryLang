import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

  it('does not expose raw HTML editing to admins', () => {
    render(
      <ReadingRichTextEditor
        value="<p>Hello world</p>"
        onChange={vi.fn()}
      />
    )

    expect(screen.queryByRole('button', { name: 'Chỉnh sửa HTML' })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Mã HTML bài đọc' })).not.toBeInTheDocument()
  })

  it('inserts a table and exposes visual table controls', async () => {
    const onChange = vi.fn()
    render(
      <ReadingRichTextEditor
        value="<p>Hello world</p>"
        onChange={onChange}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Chèn bảng' }))

    await waitFor(() => {
      expect(document.querySelector('table')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Thêm hàng bên dưới' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thêm cột bên phải' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Xóa bảng' })).toBeInTheDocument()
    expect(onChange).toHaveBeenCalled()
  })

  it('offers clear formatting choices for pasted content', () => {
    render(
      <ReadingRichTextEditor
        value="<p>Hello world</p>"
        onChange={vi.fn()}
      />
    )

    const pasteMode = screen.getByLabelText('Khi dán')
    expect(pasteMode).toHaveValue('formatted')
    expect(screen.getByRole('option', { name: 'Giữ định dạng' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Chỉ giữ văn bản' })).toBeInTheDocument()

    fireEvent.change(pasteMode, { target: { value: 'plain' } })
    expect(pasteMode).toHaveValue('plain')
  })
})
