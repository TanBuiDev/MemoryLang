import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authService } from './auth.service'

const mocks = vi.hoisted(() => ({
  mfa: {
    enroll: vi.fn(),
    challenge: vi.fn(),
    verify: vi.fn(),
  },
}))

vi.mock('@/services/supabase/client', () => ({
  supabase: { auth: { mfa: mocks.mfa }, rpc: vi.fn() },
}))

describe('authService', () => {
  it('enrolls a TOTP factor and verifies its challenge before treating MFA as active', async () => {
    mocks.mfa.enroll.mockResolvedValue({ data: { id: 'factor-1', totp: { qr_code: '<svg/>', secret: 'secret' } }, error: null })
    mocks.mfa.challenge.mockResolvedValue({ data: { id: 'challenge-1' }, error: null })
    mocks.mfa.verify.mockResolvedValue({ data: {}, error: null })

    const enrollment = await authService.enrollTotp('MemoryLang')
    await authService.verifyTotp(enrollment.id, '123456')

    expect(mocks.mfa.enroll).toHaveBeenCalledWith({ factorType: 'totp', friendlyName: 'MemoryLang' })
    expect(mocks.mfa.challenge).toHaveBeenCalledWith({ factorId: 'factor-1' })
    expect(mocks.mfa.verify).toHaveBeenCalledWith({ factorId: 'factor-1', challengeId: 'challenge-1', code: '123456' })
  })
  beforeEach(() => vi.clearAllMocks())

})
