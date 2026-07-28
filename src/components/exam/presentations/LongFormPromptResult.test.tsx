import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { LongFormPromptResult } from './LongFormPromptResult'

describe('LongFormPromptResult', () => {
  it('shows the submitted response and lets the learner switch sample comparisons', async () => {
    const user = userEvent.setup()
    render(<LongFormPromptResult
      draftContent="I work in a shop"
      samples={[
        { id: 'sample-1', prompt_id: 'prompt-1', title: 'Mẫu 1', content: 'I work in a shop', created_at: '', updated_at: '' },
        { id: 'sample-2', prompt_id: 'prompt-1', title: 'Mẫu 2', content: 'I work in a store', created_at: '', updated_at: '' },
      ]}
      isLoadingSamples={false}
    />)

    expect(screen.getByText('Bài tự luận đã nộp của bạn')).toBeInTheDocument()
    expect(screen.getByText(/Nội dung bài viết khớp với bài mẫu/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mẫu 2' }))
    expect(screen.getByText(/Các từ khác nhau được tô màu/)).toBeInTheDocument()
  })
})
