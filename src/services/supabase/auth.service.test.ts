import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '@/services/supabase/client'
import { authService } from './auth.service'

vi.mock('@/services/supabase/client', () => ({
  supabase: { auth: {}, rpc: vi.fn() },
}))

describe('authService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses the password-login eligibility RPC before a password sign-in', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: false, error: null } as never)

    await expect(authService.canUsePasswordLogin('admin@example.com')).resolves.toBe(false)

    expect(supabase.rpc).toHaveBeenCalledWith('can_login_with_password', { check_email: 'admin@example.com' })
  })
})
