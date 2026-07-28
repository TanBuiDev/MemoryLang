import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { adminService } from '@/services/supabase/admin.service'
import AdminUsersPage from './AdminUsersPage'

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
        id: 'admin-1', display_name: 'Admin User', email: 'admin@example.com', is_admin: true,
        allow_password_login: false, native_language: 'vi', current_target_language: 'en',
        created_at: '2026-07-28T00:00:00Z', subscriptions: { plan_type: 'pro', status: 'active' },
      },
      {
        id: 'user-1', display_name: 'Regular User', email: 'user@example.com', is_admin: false,
        allow_password_login: false, native_language: 'vi', current_target_language: 'de',
        created_at: '2026-07-28T00:00:00Z', subscriptions: { plan_type: 'free', status: 'active' },
      },
    ] as never)

    render(<MemoryRouter><AdminUsersPage /></MemoryRouter>)

    expect(await screen.findByRole('heading', { name: 'QUẢN LÝ NGƯỜI DÙNG & PHÂN QUYỀN' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Cho phép mật khẩu' })).toHaveLength(1)
    expect(screen.getByText('Admin User')).toBeInTheDocument()
    expect(screen.getByText('Regular User')).toBeInTheDocument()
  })

  it('filters users when clicking filter tabs', async () => {
    const user = userEvent.setup()
    vi.mocked(adminService.listUsers).mockResolvedValue([
      {
        id: 'admin-1', display_name: 'Admin User', email: 'admin@example.com', is_admin: true,
        allow_password_login: false, native_language: 'vi', current_target_language: 'en',
        created_at: '2026-07-28T00:00:00Z', subscriptions: { plan_type: 'pro', status: 'active' },
      },
      {
        id: 'user-1', display_name: 'Regular User', email: 'user@example.com', is_admin: false,
        allow_password_login: false, native_language: 'vi', current_target_language: 'de',
        created_at: '2026-07-28T00:00:00Z', subscriptions: { plan_type: 'free', status: 'active' },
      },
    ] as never)

    render(<MemoryRouter><AdminUsersPage /></MemoryRouter>)
    await screen.findByRole('heading', { name: 'QUẢN LÝ NGƯỜI DÙNG & PHÂN QUYỀN' })

    // Click Admin filter tab
    await user.click(screen.getByRole('button', { name: /Admin \(1\)/i }))
    expect(screen.getByText('Admin User')).toBeInTheDocument()
    expect(screen.queryByText('Regular User')).not.toBeInTheDocument()
  })
})
