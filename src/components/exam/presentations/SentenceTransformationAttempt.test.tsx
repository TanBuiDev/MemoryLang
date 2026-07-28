import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import {
  SentenceTransformationAttempt,
  parseSentenceTransformationPrompt,
} from './SentenceTransformationAttempt'

describe('SentenceTransformationAttempt', () => {
  it('keeps the prompt structure and moves focus to the next rewrite after Enter', async () => {
    const user = userEvent.setup()
    render(
      <SentenceTransformationAttempt
        questions={[
          { source_key: 'q1', source_number: '1', prompt: 'You’ll be caught! (away)\nYou won’t ...!' },
          { source_key: 'q2', source_number: '2', prompt: 'I didn’t do anything wrong! (guilty)\nI’m not ...!' },
        ]}
        answers={{}}
        onAnswer={vi.fn()}
      />,
    )

    expect(screen.getByText('You’ll be caught!')).toBeInTheDocument()
    expect(screen.getByText('(away)')).toBeInTheDocument()
    const inputs = screen.getAllByPlaceholderText('...................................')
    await user.click(inputs[0])
    await user.keyboard('{Enter}')
    expect(document.activeElement).toBe(inputs[1])
  })

  it('parses the original sentence, keyword and rewrite fragments', () => {
    expect(parseSentenceTransformationPrompt('You’ll be caught! (away)\nYou won’t ...!')).toEqual({
      originalSentence: 'You’ll be caught!',
      keyword: 'away',
      prefixText: 'You won’t',
      suffixText: '!',
    })
  })

  it('keeps a writable fallback for legacy one-line prompts', () => {
    render(
      <SentenceTransformationAttempt
        questions={[{ source_key: 'legacy', prompt: 'Rewrite this older question.' }]}
        answers={{}}
        onAnswer={vi.fn()}
      />,
    )

    expect(screen.getByText('Rewrite this older question.')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Gõ câu viết lại / đáp án điền từ vào đây:')).toBeInTheDocument()
  })
})
