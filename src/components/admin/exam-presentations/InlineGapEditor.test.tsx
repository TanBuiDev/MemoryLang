import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { InlineGapDraft } from '@/features/exam-content/inlineGapDraft'
import { InlineGapEditor } from './InlineGapEditor'

const initialDraft: InlineGapDraft = {
  segments: [{ type: 'text', value: 'I like ' }, { type: 'gap', gapId: 'q-1', label: '1' }, { type: 'text', value: ' after school.' }],
  gaps: [{ id: 'q-1', label: '1', acceptedAnswers: ['football'] }],
}

describe('InlineGapEditor', () => {
  it('updates a gap answer through visual controls without requiring marker syntax', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    function Harness() {
      const [draft, setDraft] = useState(initialDraft)
      return <InlineGapEditor draft={draft} onChange={(next) => { setDraft(next); onChange(next) }} />
    }
    render(<Harness />)

    const answer = screen.getByLabelText('Đáp án chấp nhận cho ô trống 1')
    await user.clear(answer)
    expect(answer).toHaveValue('')
    await user.type(answer, 'football, soccer')

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      gaps: [expect.objectContaining({ acceptedAnswers: ['football', 'soccer'] })],
    }))
    expect(screen.queryByText(/\(1\) ____/)).not.toBeInTheDocument()
  })
})
