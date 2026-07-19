import { describe, expect, it } from 'vitest'
import { buildTutorPrompt } from './prompt'

describe('buildTutorPrompt', () => {
  it('sets Vietnamese as the mandatory response language for a Vietnamese turn', () => {
    expect(buildTutorPrompt({ nativeLanguage: 'vi', sourceLanguage: 'en', responseLanguage: 'vi' })).toContain(
      'Response language for this turn: Vietnamese. This is mandatory; do not answer in another language.',
    )
  })
})
