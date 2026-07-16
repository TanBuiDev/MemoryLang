import type { Subscription } from '@/types/subscription.types'

const PRO_STATUSES = new Set(['active', 'trialing'])

export function isSubscriptionPro(
  subscription: Subscription | null,
  now = new Date(),
): boolean {
  if (!subscription) return false
  if (subscription.plan_type !== 'pro') return false
  if (!PRO_STATUSES.has(subscription.status)) return false
  if (!subscription.current_period_end) return true

  return new Date(subscription.current_period_end).getTime() > now.getTime()
}

export function getSubscriptionAccess(
  subscription: Subscription | null,
  now = new Date(),
): 'free' | 'pro' {
  return isSubscriptionPro(subscription, now) ? 'pro' : 'free'
}
