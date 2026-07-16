import { supabase } from '@/services/supabase/client'
import { FALLBACK_PRICING_PLANS } from '@/types/subscription.types'
import type {
  Subscription,
  PaymentLog,
  BillingCycle,
  PlanType,
  PricingPlan,
  SubscriptionPlanPrice,
} from '@/types/subscription.types'

export const subscriptionService = {
  async listPricingPlans(): Promise<PricingPlan[]> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('plan_type', { ascending: true })
      .order('billing_cycle', { ascending: true })

    if (error) return FALLBACK_PRICING_PLANS

    const rows = (data ?? []) as SubscriptionPlanPrice[]
    const byPlan = new Map<PlanType, SubscriptionPlanPrice[]>()

    for (const row of rows) {
      byPlan.set(row.plan_type, [...(byPlan.get(row.plan_type) ?? []), row])
    }

    const freeRows = byPlan.get('free') ?? []
    const proRows = byPlan.get('pro') ?? []
    const freeMonthly = freeRows.find((row) => row.billing_cycle === 'monthly')
    const freeYearly = freeRows.find((row) => row.billing_cycle === 'yearly')
    const proMonthly = proRows.find((row) => row.billing_cycle === 'monthly')
    const proYearly = proRows.find((row) => row.billing_cycle === 'yearly')

    if (!freeMonthly || !freeYearly || !proMonthly || !proYearly) {
      return FALLBACK_PRICING_PLANS
    }

    return [
      {
        type: 'free',
        name: freeMonthly.display_name,
        monthlyPrice: freeMonthly.amount,
        yearlyPrice: freeYearly.amount,
        features: freeMonthly.features,
      },
      {
        type: 'pro',
        name: proMonthly.display_name,
        monthlyPrice: proMonthly.amount,
        yearlyPrice: proYearly.amount,
        features: proMonthly.features,
        isPopular: true,
      },
      FALLBACK_PRICING_PLANS.find((plan) => plan.type === 'team')!,
    ]
  },

  /**
   * Lấy subscription hiện tại của user đang đăng nhập.
   * Trả về null nếu chưa có (user cũ chưa backfill).
   */
  async getMySubscription(userId?: string): Promise<Subscription | null> {
    let targetUserId = userId
    if (!targetUserId) {
      const { data: { session } } = await supabase.auth.getSession()
      targetUserId = session?.user?.id
    }

    if (!targetUserId) return null

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', targetUserId)
      .maybeSingle()

    if (error) throw error
    return data as Subscription | null
  },

  /**
   * Tạo payment link qua Edge Function process-payment.
   * Trả về payload VietQR, checkout URL và thông tin đơn hàng từ PayOS.
   */
  async createPayment(
    plan: PlanType,
    cycle: BillingCycle
  ): Promise<{
    checkoutUrl: string
    qrCode: string
    orderCode: string
    amount: number
  }> {
    const { data, error } = await supabase.functions.invoke('process-payment', {
      body: { action: 'create', plan, cycle },
    })

    if (error) throw error
    return data
  },

  /**
   * Kiểm tra trạng thái thanh toán (polling fallback).
   */
  async checkPaymentStatus(orderCode: string): Promise<{
    status: 'pending' | 'succeeded' | 'failed' | 'cancelled'
    subscription?: Subscription
  }> {
    const { data, error } = await supabase.functions.invoke('process-payment', {
      body: { action: 'check-status', orderCode },
    })

    if (error) throw error
    return data
  },

  /**
   * Hủy giao dịch chưa hoàn tất.
   */
  async cancelPayment(orderCode: string): Promise<void> {
    const { error } = await supabase.functions.invoke('process-payment', {
      body: { action: 'cancel', orderCode },
    })

    if (error) throw error
  },

  /**
   * Hủy subscription (downgrade về Free khi hết kỳ hiện tại).
   */
  async cancelSubscription(): Promise<void> {
    const { error } = await supabase.functions.invoke('process-payment', {
      body: { action: 'cancel-subscription' },
    })

    if (error) throw error
  },

  /**
   * Lấy lịch sử thanh toán.
   */
  async getPaymentHistory(): Promise<PaymentLog[]> {
    const { data, error } = await supabase
      .from('payment_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return (data ?? []) as PaymentLog[]
  },

  /**
   * Kiểm tra user có quyền thêm từ mới không (gọi RPC).
   */
  async canAddTerm(userId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('can_user_add_term', {
      p_user_id: userId,
    })

    if (error) throw error
    return data as boolean
  },

  /**
   * Kiểm tra user có quyền tạo deck mới không (gọi RPC).
   */
  async canAddDeck(userId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('can_user_add_deck', {
      p_user_id: userId,
    })

    if (error) throw error
    return data as boolean
  },

  /**
   * Kiểm tra user có quyền tạo nhiều deck trong một batch không (gọi RPC).
   */
  async canCreateDecks(userId: string, deckCount: number): Promise<boolean> {
    const { data, error } = await supabase.rpc('can_user_create_decks', {
      p_user_id: userId,
      p_new_deck_count: deckCount,
    })

    if (error) throw error
    return data as boolean
  },

  /**
   * Bulk update access_tier cho listening/grammar topics (admin).
   */
  async bulkUpdateAccessTier(
    table: 'listening_topics' | 'grammar_topics',
    ids: string[],
    tier: 'free' | 'pro'
  ): Promise<void> {
    const { error } = await supabase.rpc('bulk_update_access_tier', {
      p_table: table,
      p_ids: ids,
      p_tier: tier,
    })

    if (error) throw error
  },

  /**
   * Update teaser_config cho một topic (admin).
   */
  async updateTeaserConfig(
    table: 'listening_topics' | 'grammar_topics',
    id: string,
    config: { enabled: boolean; type: string }
  ): Promise<void> {
    const { error } = await supabase.rpc('update_teaser_config', {
      p_table: table,
      p_id: id,
      p_config: config,
    })

    if (error) throw error
  },
}
