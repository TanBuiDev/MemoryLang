import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ShortAnswerListAttempt } from './ShortAnswerListAttempt'

describe('ShortAnswerListAttempt', () => {
  it('moves focus to the next answer after Enter', async () => {
    const user = userEvent.setup()
    render(<ShortAnswerListAttempt questions={[{ source_key: 'q1', prompt: 'First' }, { source_key: 'q2', prompt: 'Second' }]} answers={{}} onAnswer={vi.fn()} />)
    const inputs = screen.getAllByPlaceholderText('Gõ đáp án')
    await user.click(inputs[0])
    await user.keyboard('{Enter}')
    expect(document.activeElement).toBe(inputs[1])
  })
})
