// ========================================
// Subscription & Payment Types
// ========================================

export type PlanType = 'free' | 'pro'

export type SubscriptionStatus =
  | 'active'
  | 'cancelled'
  | 'expired'
  | 'past_due'
  | 'trialing'

export type BillingCycle = 'monthly' | 'yearly'

export type PaymentMethod = 'payos' | 'bank_transfer' | 'manual'

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'cancelled'

export interface Subscription {
  id: string
  user_id: string
  plan_type: PlanType
  status: SubscriptionStatus
  billing_cycle: BillingCycle | null
  payos_order_code: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  canceled_at: string | null
  created_at: string
  updated_at: string
}

export interface PaymentLog {
  id: string
  user_id: string
  subscription_id: string | null
  amount: number
  currency: string
  payment_method: PaymentMethod
  payos_order_code: string | null
  status: PaymentStatus
  metadata: Record<string, unknown>
  created_at: string
}

// ========================================
// Content Access Tier
// ========================================

export type AccessTier = 'free' | 'pro'

export type ListeningTeaserType = 'title_only' | 'audio_preview' | 'transcript_preview'

export type GrammarTeaserType = 'title_only' | 'theory_only' | 'partial_exercise'

export interface TeaserConfig {
  enabled: boolean
  type: ListeningTeaserType | GrammarTeaserType
}

// ========================================
// Pricing & UI
// ========================================

export interface PricingPlan {
  type: PlanType | 'team'
  name: string
  monthlyPrice: number      // VND
  yearlyPrice: number       // VND
  features: string[]
  isPopular?: boolean
  isComingSoon?: boolean
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    type: 'free',
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      'Tối đa 100 từ vựng',
      'Tối đa 5 bộ thẻ',
      'Flashcard & Quiz không giới hạn',
      'Ôn tập SRS đầy đủ',
      'Nội dung Listening & Grammar cơ bản',
    ],
  },
  {
    type: 'pro',
    name: 'Pro',
    monthlyPrice: 49_000,
    yearlyPrice: 430_000,
    features: [
      'Từ vựng không giới hạn',
      'Bộ thẻ không giới hạn',
      'Toàn bộ Listening & Grammar',
      'Xuất dữ liệu (CSV/JSON)',
      'Ưu tiên hỗ trợ',
      'Badge Pro trên profile',
    ],
    isPopular: true,
  },
  {
    type: 'team',
    name: 'Team',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      'Tất cả tính năng Pro',
      'Chia sẻ bộ thẻ trong nhóm',
      'Dashboard quản lý nhóm',
      'Báo cáo tiến độ học viên',
    ],
    isComingSoon: true,
  },
]

/** Free tier limits */
export const FREE_LIMITS = {
  maxTerms: 100,
  maxDecks: 5,
} as const
