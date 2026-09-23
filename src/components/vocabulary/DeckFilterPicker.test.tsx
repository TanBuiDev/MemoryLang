import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DeckFilterPicker } from '@/components/vocabulary/DeckFilterPicker'

describe('DeckFilterPicker', () => {
  it('tìm bộ thẻ không phân biệt dấu tiếng Việt', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DeckFilterPicker decks={[{ id: 'deck-a', name: 'Bài học', parentId: null }]} deckId={null} noDeck={false} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Bộ thẻ: Tất cả bộ thẻ' }))
    expect(screen.getByRole('button', { name: 'Tất cả bộ thẻ' })).toHaveAttribute('aria-pressed', 'true')
    await user.type(screen.getByRole('searchbox', { name: 'Tìm bộ thẻ…' }), 'bai hoc')
    await user.click(screen.getByRole('button', { name: 'Bài học' }))

    expect(onChange).toHaveBeenCalledWith({ deckId: 'deck-a', noDeck: false })
  })

  it('không giả vờ đang chọn Tất cả khi URL chứa bộ thẻ đã bị xóa', () => {
    render(<DeckFilterPicker decks={[]} deckId="missing-deck" noDeck={false} onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Bộ thẻ: Bộ thẻ không còn tồn tại' })).toBeInTheDocument()
  })

  it('cho chọn Chưa có bộ thẻ và đóng bằng Escape mà không đổi lựa chọn', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DeckFilterPicker decks={[{ id: 'deck-a', name: 'Bài học', parentId: null }]} deckId="deck-a" noDeck={false} onChange={onChange} />)

    const trigger = screen.getByRole('button', { name: 'Bộ thẻ: Bài học' })
    await user.click(trigger)
    await user.keyboard('{Escape}')
    expect(trigger).toHaveFocus()
    expect(screen.queryByRole('dialog', { name: 'Chọn bộ thẻ' })).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()

    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'Chưa có bộ thẻ' }))
    expect(onChange).toHaveBeenCalledWith({ deckId: null, noDeck: true })
  })
})
