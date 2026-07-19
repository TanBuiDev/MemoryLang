import { describe, expect, it } from 'vitest'
import { detectResponseLanguage } from './response-language'

describe('detectResponseLanguage', () => {
  it('selects Vietnamese for a Vietnamese message', () => {
    expect(detectResponseLanguage('tôi đã học được bao nhiêu từ', 'vi')).toBe('vi')
  })

  it('selects English for an English message from a Vietnamese learner', () => {
    expect(detectResponseLanguage('How many words have I learned?', 'vi')).toBe('en')
  })
})
