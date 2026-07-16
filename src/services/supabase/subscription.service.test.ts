import { beforeEach, describe, expect, it, vi } from 'vitest'
import { subscriptionService } from '@/services/supabase/subscription.service'
import { supabase } from '@/services/supabase/client'

vi.mock('@/services/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    auth: { getSession: vi.fn() },
    from: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}))

const rpc = vi.mocked(supabase.rpc)
const from = vi.mocked(supabase.from)

describe('subscriptionService quota RPCs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls can_user_add_term with p_user_id', async () => {
    rpc.mockResolvedValueOnce({ data: true, error: null } as any)

    await expect(subscriptionService.canAddTerm('user-1')).resolves.toBe(true)

    expect(rpc).toHaveBeenCalledWith('can_user_add_term', { p_user_id: 'user-1' })
  })

  it('calls can_user_add_deck with p_user_id', async () => {
    rpc.mockResolvedValueOnce({ data: false, error: null } as any)

    await expect(subscriptionService.canAddDeck('user-1')).resolves.toBe(false)

    expect(rpc).toHaveBeenCalledWith('can_user_add_deck', { p_user_id: 'user-1' })
  })

  it('calls can_user_create_decks with p_new_deck_count', async () => {
    rpc.mockResolvedValueOnce({ data: true, error: null } as any)

    await expect(subscriptionService.canCreateDecks('user-1', 3)).resolves.toBe(true)

    expect(rpc).toHaveBeenCalledWith('can_user_create_decks', {
      p_user_id: 'user-1',
      p_new_deck_count: 3,
    })
  })
})

describe('subscriptionService pricing plans', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads active pricing plans from subscription_plans', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn(),
    }
    query.order
      .mockReturnValueOnce(query)
      .mockResolvedValueOnce({
        data: [
          {
            plan_type: 'free',
            billing_cycle: 'monthly',
            display_name: 'Free',
            amount: 0,
            features: ['100 từ vựng'],
          },
          {
            plan_type: 'free',
            billing_cycle: 'yearly',
            display_name: 'Free',
            amount: 0,
            features: ['100 từ vựng'],
          },
          {
            plan_type: 'pro',
            billing_cycle: 'monthly',
            display_name: 'Pro',
            amount: 59000,
            features: ['Không giới hạn'],
          },
          {
            plan_type: 'pro',
            billing_cycle: 'yearly',
            display_name: 'Pro',
            amount: 590000,
            features: ['Không giới hạn'],
          },
        ],
        error: null,
      })
    from.mockReturnValueOnce(query as never)

    const plans = await subscriptionService.listPricingPlans()

    expect(from).toHaveBeenCalledWith('subscription_plans')
    expect(query.select).toHaveBeenCalledWith('*')
    expect(query.eq).toHaveBeenCalledWith('is_active', true)
    expect(plans.find((plan) => plan.type === 'pro')).toMatchObject({
      monthlyPrice: 59000,
      yearlyPrice: 590000,
      features: ['Không giới hạn'],
    })
  })

  it('falls back to safe static pricing when pricing load fails', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn(),
    }
    query.order
      .mockReturnValueOnce(query)
      .mockResolvedValueOnce({
        data: null,
        error: new Error('missing table'),
      })
    from.mockReturnValueOnce(query as never)

    const plans = await subscriptionService.listPricingPlans()

    expect(plans.find((plan) => plan.type === 'pro')).toMatchObject({
      monthlyPrice: 49000,
      yearlyPrice: 430000,
    })
  })
})
