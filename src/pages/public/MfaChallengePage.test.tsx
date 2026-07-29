import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MfaChallengePage } from './MfaChallengePage'

const mocks = vi.hoisted(() => ({
  listTotpFactors: vi.fn(),
  verifyTotp: vi.fn(),
}))

vi.mock('@/services/supabase/auth.service', () => ({
  authService: {
    listTotpFactors: mocks.listTotpFactors,
    verifyTotp: mocks.verifyTotp,
  },
}))

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (selector: (state: { user: { id: string } }) => unknown) => selector({ user: { id: 'user-1' } }),
}))

vi.mock('@/hooks/useMfaChallenge', () => ({
  useMfaChallenge: () => ({ loading: false, requiresChallenge: true }),
}))

describe('MfaChallengePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listTotpFactors.mockResolvedValue([{ id: 'factor-1' }])
    mocks.verifyTotp.mockResolvedValue(undefined)
  })

  it('submits the TOTP code when Enter is pressed in the code field', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><MfaChallengePage /></MemoryRouter>)

    const input = await screen.findByLabelText('Mã xác thực')
    await waitFor(() => expect(mocks.listTotpFactors).toHaveBeenCalledOnce())
    await user.type(input, '123456{Enter}')

    await waitFor(() => expect(mocks.verifyTotp).toHaveBeenCalledWith('factor-1', '123456'))
  })
})
