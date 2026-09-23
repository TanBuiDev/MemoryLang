import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FilterModal } from '@/components/vocabulary/FilterModal'

const emptyFilters = {
  statuses: new Set<never>(),
  itemTypes: new Set<never>(),
  flagged: false,
  due: false,
  noDeck: false,
  deckId: null,
}

describe('FilterModal', () => {
  it('chỉ cập nhật bộ lọc sau khi người dùng nhấn Áp dụng', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onClose = vi.fn()

    render(<FilterModal open filters={emptyFilters} onChange={onChange} onClose={onClose} />)

    await user.click(screen.getByRole('checkbox', { name: 'Từ khó' }))
    expect(onChange).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Áp dụng bộ lọc' }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      statuses: new Set(['difficult']),
    }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('hủy thay đổi tạm khi nhấn Escape', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onClose = vi.fn()

    render(<FilterModal open filters={emptyFilters} onChange={onChange} onClose={onClose} />)
    await user.click(screen.getByRole('checkbox', { name: 'Đã gắn cờ' }))
    await user.keyboard('{Escape}')

    expect(onChange).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('để lựa chọn bộ thẻ ở thanh lọc chính và làm rõ trạng thái cần ôn', () => {
    render(<FilterModal open filters={emptyFilters} onChange={vi.fn()} onClose={vi.fn()} />)

    expect(screen.queryByRole('checkbox', { name: 'Chưa có bộ thẻ' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tất cả bộ thẻ' })).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Trạng thái: cần ôn' })).toBeInTheDocument()
  })

  it('có ngữ nghĩa dialog và nút đóng có tên truy cập', () => {
    render(<FilterModal open filters={emptyFilters} onChange={vi.fn()} onClose={vi.fn()} />)

    expect(screen.getByRole('dialog', { name: 'Bộ lọc' })).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('button', { name: 'Đóng bộ lọc' })).toBeInTheDocument()
  })

  it('đặt lại điều kiện nâng cao mà không xóa bộ thẻ và lịch ôn đã chọn ở ngoài', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<FilterModal open filters={{ ...emptyFilters, deckId: 'deck-a', due: true, flagged: true }} onChange={onChange} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Đặt lại' }))
    await user.click(screen.getByRole('button', { name: 'Áp dụng bộ lọc' }))

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ deckId: 'deck-a', due: true, flagged: false }))
  })

  it('cho biết số từ sẽ hiển thị trước khi áp dụng', async () => {
    const user = userEvent.setup()
    render(<FilterModal open filters={emptyFilters} onChange={vi.fn()} onClose={vi.fn()} getPreviewCount={(draft) => draft.statuses.has('difficult') ? 1 : 3} />)

    expect(screen.getByRole('button', { name: 'Xem 3 từ' })).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Từ khó' }))
    expect(screen.getByRole('button', { name: 'Xem 1 từ' })).toBeInTheDocument()
  })
})
