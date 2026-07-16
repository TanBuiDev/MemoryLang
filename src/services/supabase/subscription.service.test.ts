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
