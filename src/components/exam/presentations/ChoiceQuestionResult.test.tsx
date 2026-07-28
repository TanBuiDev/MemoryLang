import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChoiceQuestionResult } from './ChoiceQuestionResult'

describe('ChoiceQuestionResult', () => {
  it('shows the learner’s incorrect choice in red and the correct choice in yellow', () => {
    render(
      <ChoiceQuestionResult
        options={[
          { key: 'A', text: 'Wrong answer' },
          { key: 'B', text: 'Correct answer' },
          { key: 'C', text: 'Other answer' },
        ]}
        userAnswer="A"
        correctOptionKeys={['B']}
      />,
    )

    expect(screen.getByText('Wrong answer').closest('[data-option-key="A"]')).toHaveClass('bg-danger')
    expect(screen.getByText('Correct answer').closest('[data-option-key="B"]')).toHaveClass('bg-yellow-300')
    expect(screen.getByText('Đáp án đúng')).toBeInTheDocument()
  })

  it('does not mark a selected correct answer as incorrect', () => {
    render(
      <ChoiceQuestionResult
        options={[{ key: 'A', text: 'Correct answer' }]}
        userAnswer="A"
        correctOptionKeys={['A']}
      />,
    )

    expect(screen.getByText('Correct answer').closest('[data-option-key="A"]')).not.toHaveClass('bg-danger')
  })
})
