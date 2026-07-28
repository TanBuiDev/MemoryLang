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

  it('separates admin and learner accounts into two distinct tables and renders Kebab actions', async () => {
    const user = userEvent.setup()
    vi.mocked(adminService.listUsers).mockResolvedValue([
      {
        id: 'admin-1', display_name: 'Admin User', email: 'admin@example.com', is_admin: true,
        allow_password_login: false, native_language: 'vi', current_target_language: 'en',
        created_at: '2026-07-28T00:00:00Z', subscriptions: { plan_type: 'pro', status: 'active' },
      },
      {
        id: 'user-1', display_name: 'Regular Learner', email: 'user@example.com', is_admin: false,
        allow_password_login: false, native_language: 'vi', current_target_language: 'de',
        created_at: '2026-07-28T00:00:00Z', subscriptions: { plan_type: 'free', status: 'active' },
      },
    ] as never)

    render(<MemoryRouter><AdminUsersPage /></MemoryRouter>)

    expect(await screen.findByRole('heading', { name: 'QUẢN LÝ NGƯỜI DÙNG & TÀI KHOẢN RBAC' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /DANH SÁCH QUẢN TRỊ VIÊN & STAFF RBAC/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /DANH SÁCH NGƯỜI HỌC & HỌC VIÊN/i })).toBeInTheDocument()

    // Test Kebab Menu for Admin user
    const kebabButtons = screen.getAllByRole('button', { name: /Thao tác tài khoản/i })
    expect(kebabButtons).toHaveLength(2)

    await user.click(kebabButtons[0]) // Click kebab on Admin user row
    expect(await screen.findByText('Cho phép mật khẩu')).toBeInTheDocument()
    expect(screen.getByText('Gỡ quyền Admin')).toBeInTheDocument()
  })

  it('filters learners by plan type in Table 2', async () => {
    const user = userEvent.setup()
    vi.mocked(adminService.listUsers).mockResolvedValue([
      {
        id: 'admin-1', display_name: 'Admin User', email: 'admin@example.com', is_admin: true,
        allow_password_login: false, native_language: 'vi', current_target_language: 'en',
        created_at: '2026-07-28T00:00:00Z', subscriptions: { plan_type: 'pro', status: 'active' },
      },
      {
        id: 'user-1', display_name: 'Free Learner', email: 'free@example.com', is_admin: false,
        allow_password_login: false, native_language: 'vi', current_target_language: 'de',
        created_at: '2026-07-28T00:00:00Z', subscriptions: { plan_type: 'free', status: 'active' },
      },
    ] as never)

    render(<MemoryRouter><AdminUsersPage /></MemoryRouter>)
    await screen.findByRole('heading', { name: 'QUẢN LÝ NGƯỜI DÙNG & TÀI KHOẢN RBAC' })

    // Click Pro filter tab in Table 2 header
    await user.click(screen.getByRole('button', { name: /Gói Pro \(0\)/i }))
    expect(screen.queryByText('Free Learner')).not.toBeInTheDocument()

    // Click Free filter tab
    await user.click(screen.getByRole('button', { name: /Gói Free \(1\)/i }))
    expect(screen.getByText('Free Learner')).toBeInTheDocument()
  })
})
