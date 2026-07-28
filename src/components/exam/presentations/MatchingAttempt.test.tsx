import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MatchingAttempt } from './MatchingAttempt'

describe('MatchingAttempt', () => {
  it('stores the right-side item selected for each left-side item', async () => {
    const onAnswer = vi.fn()
    const user = userEvent.setup()
    render(
      <MatchingAttempt
        leftItems={[{ id: 'l-1', text: 'Monday' }]}
        rightItems={[{ id: 'r-1', text: 'Thứ Hai' }, { id: 'r-2', text: 'Thứ Ba' }]}
        answers={{}}
        onAnswer={onAnswer}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Chọn mục tương ứng' }))
    await user.click(screen.getAllByText('Thứ Hai').at(-1)!)

    expect(onAnswer).toHaveBeenCalledWith('l-1', 'r-1')
  })
})
