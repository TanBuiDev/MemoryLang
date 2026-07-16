import type { AccessTier } from '@/types/subscription.types'

export function isProContent(accessTier: AccessTier | null | undefined): boolean {
  return accessTier === 'pro'
}

export function canAccessContent(
  accessTier: AccessTier | null | undefined,
  isPro: boolean
): boolean {
  return !isProContent(accessTier) || isPro
}
