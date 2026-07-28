import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OrderingResult } from './OrderingResult'

describe('OrderingResult', () => {
  it('shows the learner order and flags positions that differ from the answer', () => {
    render(<OrderingResult items={[
      { id: 'one', text: 'First', correctPosition: 1 },
      { id: 'two', text: 'Second', correctPosition: 2 },
    ]} learnerOrder={['two', 'one']} />)

    expect(screen.getByText('Second')).toHaveClass('bg-danger')
    expect(screen.getByText('First')).toHaveClass('bg-danger')
    expect(screen.getByText('Thứ tự đúng')).toBeInTheDocument()
  })
})
