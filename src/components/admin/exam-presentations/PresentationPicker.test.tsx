import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PresentationPicker } from './PresentationPicker'

describe('PresentationPicker', () => {
  it('selects the inline-gap presentation from a visual card without exposing a raw schema field', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(
      <PresentationPicker
        resourceKind="activity"
        value="choice_list"
        onChange={onChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: /Điền từ trong đoạn văn/i }))

    expect(onChange).toHaveBeenCalledWith('passage_text_inline')
    expect(screen.queryByLabelText(/JSON/i)).not.toBeInTheDocument()
  })

  it('only shows prompt-compatible presentations for a Writing or Speaking resource', () => {
    render(
      <PresentationPicker
        resourceKind="prompt"
        value="long_form_prompt"
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /Viết bài/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Chuẩn bị bài nói/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Điền từ trong đoạn văn/i })).not.toBeInTheDocument()
  })

  it('allows matching and ordering presentations with complete renderer chains', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<PresentationPicker resourceKind="activity" value="choice_list" onChange={onChange} />)

    const matching = screen.getByRole('button', { name: /Ghép cặp/i })
    expect(matching).toBeEnabled()
    await user.click(matching)
    expect(onChange).toHaveBeenCalledWith('matching')

    const ordering = screen.getByRole('button', { name: /Sắp xếp/i })
    expect(ordering).toBeEnabled()
    await user.click(ordering)
    expect(onChange).toHaveBeenCalledWith('ordering')
  })
})
