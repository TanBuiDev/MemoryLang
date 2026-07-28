import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OrderingAttempt } from './OrderingAttempt'

describe('OrderingAttempt', () => {
  it('moves an item upward and returns the complete learner order', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<OrderingAttempt items={[
      { id: 'first', text: 'First' },
      { id: 'second', text: 'Second' },
    ]} order={['first', 'second']} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Đưa Second lên' }))

    expect(onChange).toHaveBeenCalledWith(['second', 'first'])
  })
})
