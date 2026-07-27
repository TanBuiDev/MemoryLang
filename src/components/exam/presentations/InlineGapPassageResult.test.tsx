import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { InlineGapPassageResult } from './InlineGapPassageResult'

describe('InlineGapPassageResult', () => {
  it('shows the learner’s incorrect option text and the correct option text instead of option keys', () => {
    render(
      <InlineGapPassageResult
        passage="William quickly rang (1) ____ an ambulance."
        reviews={[{
          section_source_key: 'cloze', question_source_key: 'cloze-q1', question: '1', user_answer: 'A', correct_option_keys: ['C'], accepted_answers: [], translation: null, explanation: null, is_correct: false,
        }]}
        optionsMap={{ 'cloze-q1': [{ key: 'A', text: 'to' }, { key: 'C', text: 'for' }] }}
      />,
    )

    expect(screen.getByText('to')).toHaveClass('bg-danger/10')
    expect(screen.getByText('for')).toBeInTheDocument()
    expect(screen.queryByText(/^C$/)).not.toBeInTheDocument()
  })
})
