import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MatchingResult } from './MatchingResult'

describe('MatchingResult', () => {
  it('shows the learner choice in red and the matching answer text in yellow', () => {
    render(
      <MatchingResult
        leftItems={[{ id: 'left-1', text: 'Monday' }]}
        rightItems={[
          { id: 'right-1', text: 'Thứ Hai' },
          { id: 'right-2', text: 'Thứ Ba' },
        ]}
        reviews={[{
          section_source_key: 'matching-1',
          question_source_key: 'matching:left-1',
          question: 'Monday',
          user_answer: 'right-2',
          correct_option_keys: [],
          accepted_answers: ['right-1'],
          translation: null,
          explanation: null,
          is_correct: false,
        }]}
      />,
    )

    expect(screen.getByText('Monday')).toBeInTheDocument()
    expect(screen.getByText('Thứ Ba')).toHaveClass('bg-danger')
    expect(screen.getByText('Thứ Hai')).toHaveClass('bg-yellow-300')
  })
})
