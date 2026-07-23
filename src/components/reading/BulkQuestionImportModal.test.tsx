import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BulkQuestionImportModal } from '@/components/reading/BulkQuestionImportModal'

describe('BulkQuestionImportModal', () => {
  it('parses pasted lines, previews choices, and imports confirmed answers', () => {
    const onImport = vi.fn()
    render(
      <BulkQuestionImportModal
        open
        onCancel={vi.fn()}
        onImport={onImport}
      />
    )

    fireEvent.change(screen.getByLabelText('Danh sách câu hỏi và lựa chọn'), {
      target: {
        value:
          '1. A. to B. off C. for D. with\n2. A. called back B. looked after C. waited for D. ran into',
      },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Phân tích danh sách' }))

    expect(screen.getByText('Đã nhận diện 2 câu hỏi')).toBeInTheDocument()
    expect(screen.getByDisplayValue('to')).toBeInTheDocument()
    expect(screen.getByDisplayValue('looked after')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: 'Câu 1, chọn đáp án A' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Câu 2, chọn đáp án B' }))
    fireEvent.click(screen.getByRole('button', { name: 'Thêm 2 câu hỏi' }))

    expect(onImport).toHaveBeenCalledWith([
      {
        questionText: 'Chọn đáp án phù hợp cho chỗ trống (1)',
        options: [
          { text: 'to', is_correct: true },
          { text: 'off', is_correct: false },
          { text: 'for', is_correct: false },
          { text: 'with', is_correct: false },
        ],
      },
      {
        questionText: 'Chọn đáp án phù hợp cho chỗ trống (2)',
        options: [
          { text: 'called back', is_correct: false },
          { text: 'looked after', is_correct: true },
          { text: 'waited for', is_correct: false },
          { text: 'ran into', is_correct: false },
        ],
      },
    ])
  })

  it('blocks importing when a line cannot be parsed', () => {
    render(
      <BulkQuestionImportModal
        open
        onCancel={vi.fn()}
        onImport={vi.fn()}
      />
    )

    fireEvent.change(screen.getByLabelText('Danh sách câu hỏi và lựa chọn'), {
      target: { value: '1. A. one B. two' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Phân tích danh sách' }))

    expect(screen.getByText('Cần đủ 4 lựa chọn A, B, C và D.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thêm 0 câu hỏi' })).toBeDisabled()
  })
})
