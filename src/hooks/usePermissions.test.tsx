import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { getMyPermissions, getMyAuthorizationVersion } = vi.hoisted(() => ({ getMyPermissions: vi.fn(), getMyAuthorizationVersion: vi.fn() }))

vi.mock('@/services/supabase/permissions.service', () => ({ permissionsService: { getMyPermissions, getMyAuthorizationVersion } }))
vi.mock('@/stores/useAuthStore', () => ({ useAuthStore: (selector: (state: { user: { id: string } | null }) => unknown) => selector({ user: { id: 'user-1' } }) }))

import { usePermissions } from './usePermissions'

describe('usePermissions', () => {
  afterEach(() => vi.useRealTimers())

  it('reloads permissions when the authorization version changes', async () => {
    getMyPermissions.mockResolvedValue(new Set(['exam.read']))
    getMyAuthorizationVersion.mockResolvedValueOnce(1).mockResolvedValueOnce(2)
    vi.useFakeTimers()

    renderHook(() => usePermissions())
    await vi.advanceTimersByTimeAsync(0)
    expect(getMyPermissions).toHaveBeenCalledTimes(1)
    expect(getMyAuthorizationVersion).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(5000)

    expect(getMyPermissions).toHaveBeenCalledTimes(2)
    expect(getMyAuthorizationVersion).toHaveBeenCalledTimes(2)
  })
})
