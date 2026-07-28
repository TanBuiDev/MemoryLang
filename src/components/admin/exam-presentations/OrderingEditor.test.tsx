import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OrderingEditor } from './OrderingEditor'

describe('OrderingEditor', () => {
  it('adds a numbered item with its correct position', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<OrderingEditor value={{ items: [] }} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Thêm mục' }))

    expect(onChange).toHaveBeenCalledWith({ items: [expect.objectContaining({ correctPosition: 1 })] })
  })
})
