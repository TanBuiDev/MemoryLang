import { supabase } from '@/services/supabase/client'
import type {
  Subscription,
  PaymentLog,
  BillingCycle,
  PlanType,
} from '@/types/subscription.types'

export const subscriptionService = {
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
   * Trả về QR code URL + order info từ PayOS.
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
