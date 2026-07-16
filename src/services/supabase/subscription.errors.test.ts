import { describe, expect, it } from 'vitest'
import { isSubscriptionLimitError, SubscriptionLimitError } from './subscription.errors'

describe('SubscriptionLimitError', () => {
  it('preserves feature and limit details', () => {
    const error = new SubscriptionLimitError('terms', 100)

    expect(error.message).toContain('terms')
    expect(error.feature).toBe('terms')
    expect(error.limit).toBe(100)
    expect(isSubscriptionLimitError(error)).toBe(true)
  })

  it('does not match generic errors', () => {
    expect(isSubscriptionLimitError(new Error('nope'))).toBe(false)
  })
})
