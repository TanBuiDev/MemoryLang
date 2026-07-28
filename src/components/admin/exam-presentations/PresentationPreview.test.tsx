import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { PresentationPreview } from './PresentationPreview'

describe('PresentationPreview', () => {
  it('switches between learner attempt and answer review previews for a choice activity', async () => {
    const user = userEvent.setup()
    render(<PresentationPreview
      presentationType="choice_list"
      questions={[{
        id: 'q-1', prompt: 'Choose the correct answer.', acceptedAnswers: [],
        options: [{ key: 'A', text: 'Wrong answer', is_correct: false }, { key: 'B', text: 'Correct answer', is_correct: true }],
      }]}
    />)

    expect(screen.getByRole('heading', { name: 'Học viên làm bài' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Xem đáp án' }))

    expect(screen.getByText('Đáp án đúng')).toBeInTheDocument()
    expect(screen.getByText('Correct answer').closest('div')).toHaveClass('bg-primary')
    expect(screen.queryByText(/JSON|HTML/i)).not.toBeInTheDocument()
  })

  it('previews an image-choice question with its persisted crop', () => {
    render(<PresentationPreview presentationType="image_choice_list" questions={[{ id: 'q-1', prompt: 'Choose.', image_url: 'https://example.com/sign.png', metadata: { image_crop: 'top' }, acceptedAnswers: [] }]} />)
    expect(screen.getByRole('img')).toHaveClass('object-cover')
    expect(screen.getByRole('img')).toHaveStyle({ objectPosition: 'top' })
  })

  it('shows rich passage content above passage questions in the learner preview', () => {
    render(<PresentationPreview presentationType="passage_questions" passage="<p>Read this <strong>passage</strong>.</p>" questions={[]} />)

    expect(screen.getByText((_, element) => element?.tagName === 'P' && element.textContent === 'Read this passage.')).toBeInTheDocument()
    expect(screen.getByText('passage').tagName).toBe('STRONG')
  })
})
