import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmModal } from '@/components/ui/confirm-modal'

describe('ConfirmModal', () => {
  it('labels the dialog and keeps keyboard focus within its actions', () => {
    render(
      <ConfirmModal
        open
        title="Hoàn thành phiên học?"
        description="Lưu kết quả vào SRS."
        confirmLabel="Lưu kết quả"
        cancelLabel="Xem lại thẻ"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    const dialog = screen.getByRole('dialog', { name: 'Hoàn thành phiên học?' })
    const cancel = screen.getByRole('button', { name: 'Xem lại thẻ' })
    const confirm = screen.getByRole('button', { name: 'Lưu kết quả' })

    expect(dialog).toHaveAccessibleDescription('Lưu kết quả vào SRS.')
    expect(dialog).toHaveFocus()

    confirm.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(cancel).toHaveFocus()

    cancel.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(confirm).toHaveFocus()
  })
})
