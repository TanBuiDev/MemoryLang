import { describe, expect, it } from 'vitest'
import { buildTutorPrompt } from './prompt'

describe('buildTutorPrompt', () => {
  it('requires replies to follow the language of the latest user message', () => {
    expect(buildTutorPrompt({ nativeLanguage: 'vi', sourceLanguage: 'en' })).toContain(
      'Reply in the same language as the learner\'s latest message.',
    )
  })
})
