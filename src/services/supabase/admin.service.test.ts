import { beforeEach, describe, expect, it, vi } from 'vitest'
import { adminService } from '@/services/supabase/admin.service'
import { supabase } from '@/services/supabase/client'

vi.mock('@/services/supabase/client', () => ({
  supabase: {
    auth: { getSession: vi.fn() },
    from: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}))

const from = vi.mocked(supabase.from)
const getSession = vi.mocked(supabase.auth.getSession)
const invoke = vi.mocked(supabase.functions.invoke)

describe('adminService subscription plan pricing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSession.mockResolvedValue({
      data: { session: { user: { id: 'admin-1' } } },
      error: null,
    } as never)
  })

  it('lists subscription plan prices for admin management', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn(),
    }
    query.order
      .mockReturnValueOnce(query)
      .mockResolvedValueOnce({
        data: [
          {
            id: 'plan-pro-monthly',
            plan_type: 'pro',
            billing_cycle: 'monthly',
            display_name: 'Pro',
            amount: 49000,
            currency: 'VND',
            features: ['Không giới hạn'],
            is_active: true,
            updated_by: null,
            created_at: '2026-07-16T00:00:00.000Z',
            updated_at: '2026-07-16T00:00:00.000Z',
          },
        ],
        error: null,
      })
    from.mockReturnValueOnce(query as never)

    await expect(adminService.listSubscriptionPlans()).resolves.toHaveLength(1)

    expect(from).toHaveBeenCalledWith('subscription_plans')
    expect(query.select).toHaveBeenCalledWith('*')
  })

  it('updates a Pro monthly price and writes an audit log', async () => {
    const updateQuery = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'plan-pro-monthly',
          plan_type: 'pro',
          billing_cycle: 'monthly',
          display_name: 'Pro',
          amount: 59000,
          currency: 'VND',
          features: ['Không giới hạn'],
          is_active: true,
          updated_by: null,
          created_at: '2026-07-16T00:00:00.000Z',
          updated_at: '2026-07-16T00:00:00.000Z',
        },
        error: null,
      }),
    }
    const auditQuery = {
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    from
      .mockReturnValueOnce(updateQuery as never)
      .mockReturnValueOnce(auditQuery as never)

    await expect(adminService.updateSubscriptionPlanPrice({
      planType: 'pro',
      billingCycle: 'monthly',
      amount: 59000,
      currency: 'VND',
      isActive: true,
      reason: 'Điều chỉnh giá tháng',
    })).resolves.toMatchObject({ amount: 59000 })

    expect(updateQuery.update).toHaveBeenCalledWith(expect.objectContaining({
      amount: 59000,
      currency: 'VND',
      is_active: true,
    }))
    expect(updateQuery.eq).toHaveBeenCalledWith('plan_type', 'pro')
    expect(updateQuery.eq).toHaveBeenCalledWith('billing_cycle', 'monthly')
    expect(auditQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
      admin_id: 'admin-1',
      action: 'admin_update_subscription_price',
      target_type: 'subscription_plan',
      target_id: 'plan-pro-monthly',
      details: expect.objectContaining({
        amount: 59000,
        reason: 'Điều chỉnh giá tháng',
      }),
    }))
  })

  it('rejects a non-positive price before calling Supabase', async () => {
    await expect(adminService.updateSubscriptionPlanPrice({
      planType: 'pro',
      billingCycle: 'monthly',
      amount: 0,
      currency: 'VND',
      isActive: true,
      reason: 'Sai giá',
    })).rejects.toThrow('Giá gói phải lớn hơn 0.')

    expect(from).not.toHaveBeenCalled()
  })
})

describe('adminService user subscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSession.mockResolvedValue({
      data: { session: { user: { id: 'admin-1' } } },
      error: null,
    } as never)
  })

  it('lists users with subscription period and payment counts', async () => {
    const profilesQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'user-1',
            email: 'learner@example.com',
            display_name: 'Learner',
            is_admin: false,
            created_at: '2026-07-01T00:00:00.000Z',
            subscriptions: [{
              id: 'sub-1',
              plan_type: 'pro',
              status: 'active',
              billing_cycle: 'monthly',
              current_period_end: '2026-08-01T00:00:00.000Z',
            }],
          },
        ],
        error: null,
      }),
    }
    const countQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ count: 3, error: null }),
    }
    const latestQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{ created_at: '2026-07-15T00:00:00.000Z' }],
        error: null,
      }),
    }
    from
      .mockReturnValueOnce(profilesQuery as never)
      .mockReturnValueOnce(countQuery as never)
      .mockReturnValueOnce(latestQuery as never)

    const users = await adminService.listSubscriptionUsers({ plan: 'pro' })

    expect(from).toHaveBeenCalledWith('profiles')
    expect(profilesQuery.select).toHaveBeenCalledWith(expect.stringContaining('subscriptions'))
    expect(countQuery.select).toHaveBeenCalledWith('id', { count: 'exact', head: true })
    expect(users).toEqual([
      expect.objectContaining({
        id: 'user-1',
        subscription: expect.objectContaining({ plan_type: 'pro' }),
        payment_count: 3,
        last_payment_at: '2026-07-15T00:00:00.000Z',
      }),
    ])
  })

  it('loads payment history for a selected user', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{ id: 'pay-1', user_id: 'user-1', amount: 49000 }],
        error: null,
      }),
    }
    from.mockReturnValueOnce(query as never)

    await expect(adminService.getUserPaymentLogs('user-1')).resolves.toEqual([
      expect.objectContaining({ id: 'pay-1', amount: 49000 }),
    ])

    expect(from).toHaveBeenCalledWith('payment_logs')
    expect(query.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(query.limit).toHaveBeenCalledWith(50)
  })

  it('grants manual Pro with a future current_period_end and audit details', async () => {
    const upsertQuery = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'sub-1', user_id: 'user-1', plan_type: 'pro', status: 'active' },
        error: null,
      }),
    }
    const auditQuery = { insert: vi.fn().mockResolvedValue({ data: null, error: null }) }
    from.mockReturnValueOnce(upsertQuery as never).mockReturnValueOnce(auditQuery as never)

    await expect(adminService.setUserSubscription({
      userId: 'user-1',
      planType: 'pro',
      status: 'active',
      billingCycle: 'monthly',
      currentPeriodEnd: '2026-08-16T00:00:00.000Z',
      cancelAtPeriodEnd: false,
      reason: 'Tặng Pro thủ công',
    })).resolves.toMatchObject({ plan_type: 'pro' })

    expect(upsertQuery.upsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      plan_type: 'pro',
      status: 'active',
      billing_cycle: 'monthly',
      current_period_end: '2026-08-16T00:00:00.000Z',
      cancel_at_period_end: false,
      canceled_at: null,
    }), { onConflict: 'user_id' })
    expect(auditQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
      action: 'admin_set_subscription',
      details: expect.objectContaining({ reason: 'Tặng Pro thủ công' }),
    }))
  })

  it('downgrades to Free by cancelling active Pro immediately', async () => {
    const upsertQuery = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'sub-1', user_id: 'user-1', plan_type: 'free', status: 'cancelled' },
        error: null,
      }),
    }
    const auditQuery = { insert: vi.fn().mockResolvedValue({ data: null, error: null }) }
    from.mockReturnValueOnce(upsertQuery as never).mockReturnValueOnce(auditQuery as never)

    await adminService.setUserSubscription({
      userId: 'user-1',
      planType: 'free',
      status: 'cancelled',
      billingCycle: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      reason: 'Hạ Free',
    })

    expect(upsertQuery.upsert).toHaveBeenCalledWith(expect.objectContaining({
      plan_type: 'free',
      status: 'cancelled',
      billing_cycle: null,
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      canceled_at: expect.any(String),
    }), { onConflict: 'user_id' })
  })

  it('marks cancel_at_period_end without changing current access', async () => {
    const upsertQuery = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'sub-1', user_id: 'user-1', plan_type: 'pro', status: 'active' },
        error: null,
      }),
    }
    const auditQuery = { insert: vi.fn().mockResolvedValue({ data: null, error: null }) }
    from.mockReturnValueOnce(upsertQuery as never).mockReturnValueOnce(auditQuery as never)

    await adminService.setUserSubscription({
      userId: 'user-1',
      planType: 'pro',
      status: 'active',
      billingCycle: 'yearly',
      currentPeriodEnd: '2027-07-16T00:00:00.000Z',
      cancelAtPeriodEnd: true,
      reason: 'Hủy cuối kỳ',
    })

    expect(upsertQuery.upsert).toHaveBeenCalledWith(expect.objectContaining({
      plan_type: 'pro',
      status: 'active',
      billing_cycle: 'yearly',
      current_period_end: '2027-07-16T00:00:00.000Z',
      cancel_at_period_end: true,
      canceled_at: expect.any(String),
    }), { onConflict: 'user_id' })
  })
})

describe('adminService role management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts an MFA-backed admin session before changing a user role', async () => {
    invoke
      .mockResolvedValueOnce({ data: { data: { expiresAt: '2026-07-29T12:00:00.000Z' } }, error: null } as never)
      .mockResolvedValueOnce({ data: { data: { isAdmin: true } }, error: null } as never)

    await expect(adminService.updateUserAdminStatus('user-1', true)).resolves.toEqual({ isAdmin: true })

    expect(invoke).toHaveBeenNthCalledWith(1, 'start-admin-session')
    expect(invoke).toHaveBeenNthCalledWith(2, 'manage-user-role', expect.objectContaining({
      body: expect.objectContaining({ targetUserId: 'user-1', action: 'grant' }),
    }))
  })
})
