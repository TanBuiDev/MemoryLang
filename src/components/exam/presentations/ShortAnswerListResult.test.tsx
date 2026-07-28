import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ShortAnswerListResult } from './ShortAnswerListResult'

describe('ShortAnswerListResult', () => {
  it('shows the learner response in red and accepted answer in yellow for an incorrect short answer', () => {
    render(<ShortAnswerListResult reviews={[{
      section_source_key: 'short-answers', question_source_key: 'short-1', question: 'Name a fruit.',
      user_answer: 'apple', correct_option_keys: [], accepted_answers: ['banana'],
      translation: 'Kể tên một loại trái cây.', explanation: 'Đáp án mẫu là banana.', is_correct: false,
    }]} />)

    expect(screen.getByLabelText('Kết quả câu trả lời ngắn')).toBeInTheDocument()
    expect(screen.getByText('apple')).toHaveClass('text-danger')
    expect(screen.getByText('banana')).toHaveClass('bg-yellow-300')
    expect(screen.getByText('Kể tên một loại trái cây.')).toBeInTheDocument()
    expect(screen.getByText('Đáp án mẫu là banana.')).toBeInTheDocument()
  })
})
