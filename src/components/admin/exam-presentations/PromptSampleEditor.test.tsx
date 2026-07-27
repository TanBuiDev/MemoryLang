import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PromptSampleEditor } from './PromptSampleEditor'

describe('PromptSampleEditor', () => {
  it('lets an admin create a named Writing sample with visual form fields', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()
    render(<PromptSampleEditor samples={[]} onSave={onSave} onRequestDelete={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Thêm bài mẫu' }))
    await user.type(screen.getByLabelText('Tên bài mẫu'), 'Bài mẫu thư xin việc')
    await user.type(screen.getByLabelText('Nội dung bài mẫu'), 'Dear ...,')
    await user.click(screen.getByRole('button', { name: 'Lưu bài mẫu' }))

    expect(onSave).toHaveBeenCalledWith({ id: undefined, title: 'Bài mẫu thư xin việc', content: 'Dear ...,' })
    expect(screen.queryByText(/JSON|HTML/i)).not.toBeInTheDocument()
  })
})
