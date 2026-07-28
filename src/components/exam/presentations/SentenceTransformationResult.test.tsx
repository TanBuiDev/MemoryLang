import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SentenceTransformationResult } from './SentenceTransformationResult'

describe('SentenceTransformationResult', () => {
  it('keeps the rewrite sentence continuous while showing the learner and expected text', () => {
    render(<SentenceTransformationResult question={'You’ll be caught! (away)\nYou won’t ...!'} userAnswer="get away" acceptedAnswers={['get away with it']} correctOptionKeys={[]} isCorrect={false} />)
    expect(screen.getByText('You’ll be caught!')).toBeInTheDocument()
    expect(screen.getAllByText('get away')).toHaveLength(2)
    expect(screen.getByText((_, element) => element?.textContent === ' with it')).toBeInTheDocument()
  })
})
