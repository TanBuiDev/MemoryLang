import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminUsersPage from './AdminUsersPage'
import { adminService } from '@/services/supabase/admin.service'

vi.mock('@/services/supabase/admin.service', () => ({
  adminService: {
    listUsers: vi.fn(),
    updateUserAdminStatus: vi.fn(),
    setAdminPasswordLogin: vi.fn(),
  },
}))

describe('AdminUsersPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('only shows the password-login setting after a user has admin privileges', async () => {
    vi.mocked(adminService.listUsers).mockResolvedValue([
      {
        id: 'admin-1', display_name: 'Admin', email: 'admin@example.com', is_admin: true,
        allow_password_login: false, native_language: 'vi', current_target_language: 'en',
        created_at: '2026-07-28T00:00:00Z',
      },
      {
        id: 'user-1', display_name: 'User', email: 'user@example.com', is_admin: false,
        allow_password_login: false, native_language: 'vi', current_target_language: 'en',
        created_at: '2026-07-28T00:00:00Z',
      },
    ] as never)

    render(<MemoryRouter><AdminUsersPage /></MemoryRouter>)

    expect(await screen.findByRole('button', { name: 'Cho phép mật khẩu' })).toBeInTheDocument()
    expect(screen.queryAllByRole('button', { name: 'Cho phép mật khẩu' })).toHaveLength(1)
  })
})
