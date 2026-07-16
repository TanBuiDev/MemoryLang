import { beforeEach, describe, expect, it, vi } from 'vitest'
import { adminService } from '@/services/supabase/admin.service'
import { supabase } from '@/services/supabase/client'

vi.mock('@/services/supabase/client', () => ({
  supabase: {
    auth: { getSession: vi.fn() },
    from: vi.fn(),
  },
}))

const from = vi.mocked(supabase.from)
const getSession = vi.mocked(supabase.auth.getSession)

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
