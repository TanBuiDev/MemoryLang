import { describe, expect, it, vi } from 'vitest'

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))

vi.mock('@/services/supabase/client', () => ({ supabase: { rpc } }))

import { rbacService } from './rbac.service'

describe('rbacService', () => {
  it('loads an RBAC overview through its protected RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: { roles: [], permissions: [], users: [], total: 0 },
      error: null,
    })

    await rbacService.getOverview('tony')

    expect(rpc).toHaveBeenCalledWith('get_role_management_overview', {
      p_query: 'tony',
      p_limit: 100,
      p_offset: 0,
    })
  })
})
