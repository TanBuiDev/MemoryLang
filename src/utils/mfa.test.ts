import { describe, expect, it } from 'vitest'
import { shouldChallengeMfa } from './mfa'

describe('shouldChallengeMfa', () => {
  it('requires a TOTP challenge when an enrolled factor can raise the session to AAL2', () => {
    expect(shouldChallengeMfa({ currentLevel: 'aal1', nextLevel: 'aal2' })).toBe(true)
  })

  it('does not challenge a session that is already AAL2 or has no enrolled factor', () => {
    expect(shouldChallengeMfa({ currentLevel: 'aal2', nextLevel: 'aal2' })).toBe(false)
    expect(shouldChallengeMfa({ currentLevel: 'aal1', nextLevel: 'aal1' })).toBe(false)
  })
})
