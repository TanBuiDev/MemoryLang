import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChoiceListAttempt } from './ChoiceListAttempt'

describe('ChoiceListAttempt', () => {
  it('renders a sign image and the full text of a long option', () => {
    render(<ChoiceListAttempt questions={[{ source_key: 'sign-1', source_number: '1', prompt: 'What does this sign mean?', image_url: 'https://example.com/sign.png', options: [{ key: 'A', text: 'This is a deliberately long answer that must remain readable.', is_correct: false }] }]} answers={{}} onAnswer={vi.fn()} />)
    expect(screen.getByRole('img', { name: 'Hình minh họa câu 1' })).toBeInTheDocument()
    expect(screen.getByText('This is a deliberately long answer that must remain readable.')).toBeInTheDocument()
  })

  it('applies a saved image crop preset', () => {
    render(<ChoiceListAttempt questions={[{ source_key: 'sign-1', prompt: 'Choose.', image_url: 'https://example.com/sign.png', metadata: { image_crop: 'top' } }]} answers={{}} onAnswer={vi.fn()} />)
    expect(screen.getByRole('img')).toHaveClass('object-cover')
    expect(screen.getByRole('img')).toHaveStyle({ objectPosition: 'top' })
  })
})
