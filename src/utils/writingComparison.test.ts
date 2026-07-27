import { describe, expect, it } from 'vitest'
import { compareExactText, compareWritingContent, normalizeWritingContent } from './writingComparison'

describe('writingComparison', () => {
  it('treats punctuation, whitespace, and line-break-only changes as a match', () => {
    const sample = 'Dear ...,\n\nI am ready to work.'
    const learner = 'Dear I am ready to work'

    expect(normalizeWritingContent(sample)).toBe('dear i am ready to work')
    expect(compareWritingContent(learner, sample).isContentMatch).toBe(true)
  })

  it('marks added learner words and missing sample words separately', () => {
    const comparison = compareWritingContent('I am very ready', 'I am ready to work')

    expect(comparison.isContentMatch).toBe(false)
    expect(comparison.learnerTokens).toEqual([
      { value: 'I', status: 'same' },
      { value: 'am', status: 'same' },
      { value: 'very', status: 'added' },
      { value: 'ready', status: 'same' },
    ])
    expect(comparison.sampleTokens).toEqual([
      { value: 'I', status: 'same' },
      { value: 'am', status: 'same' },
      { value: 'ready', status: 'same' },
      { value: 'to', status: 'missing' },
      { value: 'work', status: 'missing' },
    ])
  })

  it('preserves punctuation in an exact comparison for sentence transformations', () => {
    const comparison = compareExactText('What a surprise', 'What a surprise!')

    expect(comparison.isExactMatch).toBe(false)
    expect(comparison.expected).toContainEqual({ value: '!', status: 'missing' })
  })
})
