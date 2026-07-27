import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { InlineChoicePassageAttempt } from './InlineChoicePassageAttempt'

describe('InlineChoicePassageAttempt', () => {
  it('lets a learner choose the option text for a numbered gap directly in the passage', async () => {
    const onAnswer = vi.fn()
    const user = userEvent.setup()
    render(<InlineChoicePassageAttempt
      passage="I get up (1) ____."
      questions={[{ source_key: 'q-1', source_number: '1', options: [{ key: 'A', text: 'early' }, { key: 'B', text: 'late' }] }]}
      answers={{}}
      onAnswer={onAnswer}
    />)

    await user.click(screen.getByRole('button', { name: /Chọn đáp án cho câu 1/i }))
    await user.click(screen.getByRole('button', { name: /late/i }))

    expect(onAnswer).toHaveBeenCalledWith('q-1', 'B')
  })
})
