import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { LongFormPromptEditor } from './LongFormPromptEditor'

describe('LongFormPromptEditor', () => {
  it('edits a learner-facing prompt and instructions without a raw HTML or JSON field', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    function Harness() {
      const [value, setValue] = useState({ prompt: 'Write an email.', instructions: 'Write 100 words.' })
      return <LongFormPromptEditor value={value} onChange={(next) => { setValue(next); onChange(next) }} />
    }
    render(<Harness />)

    await user.clear(screen.getByLabelText('Đề bài tự luận'))
    await user.type(screen.getByLabelText('Đề bài tự luận'), 'Write about your hobby.')

    expect(onChange).toHaveBeenLastCalledWith({ prompt: 'Write about your hobby.', instructions: 'Write 100 words.' })
    expect(screen.queryByText(/JSON|HTML/i)).not.toBeInTheDocument()
  })
})
