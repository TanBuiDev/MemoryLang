import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FilterModal } from '@/components/vocabulary/FilterModal'

const emptyFilters = {
  statuses: new Set<never>(),
  itemTypes: new Set<never>(),
  flagged: false,
  noDeck: false,
  deckId: null,
}

describe('FilterModal', () => {
  it('chỉ cập nhật bộ lọc sau khi người dùng nhấn Áp dụng', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onClose = vi.fn()

    render(<FilterModal open filters={emptyFilters} onChange={onChange} onClose={onClose} decks={[]} />)

    await user.click(screen.getByRole('checkbox', { name: 'Từ khó' }))
    expect(onChange).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Áp dụng' }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      statuses: new Set(['difficult']),
    }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('hủy thay đổi tạm khi nhấn Escape', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onClose = vi.fn()

    render(<FilterModal open filters={emptyFilters} onChange={onChange} onClose={onClose} decks={[]} />)
    await user.click(screen.getByRole('checkbox', { name: 'Đã gắn cờ' }))
    await user.keyboard('{Escape}')

    expect(onChange).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('không cho kết hợp Chưa có bộ thẻ với một bộ thẻ cụ thể', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <FilterModal
        open
        filters={emptyFilters}
        onChange={onChange}
        onClose={vi.fn()}
        decks={[{ id: 'deck-a', name: 'Bộ A' }]}
      />,
    )

    await user.click(screen.getByRole('checkbox', { name: 'Chưa có bộ thẻ' }))
    await user.click(screen.getByRole('button', { name: 'Tất cả bộ thẻ' }))
    await user.click(screen.getAllByText('Bộ A').at(-1)!)
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }))

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ noDeck: false, deckId: 'deck-a' }))
  })

  it('có ngữ nghĩa dialog và nút đóng có tên truy cập', () => {
    render(<FilterModal open filters={emptyFilters} onChange={vi.fn()} onClose={vi.fn()} decks={[]} />)

    expect(screen.getByRole('dialog', { name: 'Bộ lọc' })).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('button', { name: 'Đóng bộ lọc' })).toBeInTheDocument()
  })
})
