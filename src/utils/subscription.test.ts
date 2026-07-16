import { describe, expect, it } from 'vitest'
import { getSubscriptionAccess, isSubscriptionPro } from './subscription'
import type { Subscription } from '@/types/subscription.types'

const now = new Date('2026-07-16T00:00:00.000Z')

function subscription(overrides: Partial<Subscription>): Subscription {
  return {
    id: 'sub-1',
    user_id: 'user-1',
    plan_type: 'pro',
    status: 'active',
    billing_cycle: 'monthly',
    payos_order_code: null,
    current_period_start: '2026-07-01T00:00:00.000Z',
    current_period_end: '2026-08-01T00:00:00.000Z',
    cancel_at_period_end: false,
    canceled_at: null,
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('subscription access helpers', () => {
  it('treats active pro with a future period as pro', () => {
    expect(isSubscriptionPro(subscription({}), now)).toBe(true)
    expect(getSubscriptionAccess(subscription({}), now)).toBe('pro')
  })

  it('treats active pro with an expired period as free', () => {
    expect(isSubscriptionPro(subscription({ current_period_end: '2026-07-01T00:00:00.000Z' }), now)).toBe(false)
  })

  it('accepts active pro with a null period as lifetime/manual pro for the MVP', () => {
    expect(isSubscriptionPro(subscription({ current_period_end: null }), now)).toBe(true)
  })

  it('treats cancelled or free subscriptions as free', () => {
    expect(isSubscriptionPro(subscription({ status: 'cancelled' }), now)).toBe(false)
    expect(isSubscriptionPro(subscription({ plan_type: 'free' }), now)).toBe(false)
  })

  it('treats a missing subscription as free', () => {
    expect(isSubscriptionPro(null, now)).toBe(false)
    expect(getSubscriptionAccess(null, now)).toBe('free')
  })
})
