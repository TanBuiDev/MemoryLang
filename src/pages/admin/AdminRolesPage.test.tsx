import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getOverview, invoke, listUsers } = vi.hoisted(() => ({
  getOverview: vi.fn(),
  invoke: vi.fn(),
  listUsers: vi.fn(),
}))

vi.mock('@/services/supabase/rbac.service', () => ({ rbacService: { getOverview } }))
vi.mock('@/services/supabase/admin.service', () => ({ adminService: { listUsers } }))
vi.mock('@/services/supabase/client', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    functions: { invoke },
  },
}))
vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: (selector: (state: { user: { id: string } | null }) => unknown) => selector({ user: { id: 'actor' } }),
}))
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    loading: false,
    hasPermission: (permission: string) => permission === 'role.assign' || permission === 'role.revoke',
  }),
}))

import AdminRolesPage from './AdminRolesPage'

describe('AdminRolesPage', () => {
  beforeEach(() => {
    invoke.mockResolvedValue({ data: { data: {} }, error: null })
    listUsers.mockResolvedValue([
      {
        id: 'actor',
        email: 'actor@example.com',
        display_name: 'Current Admin',
        is_admin: true,
        allow_password_login: false,
        native_language: 'vi',
        current_target_language: 'en',
        created_at: '2026-07-28T00:00:00Z',
        subscriptions: { plan_type: 'pro', status: 'active' },
      },
      {
        id: 'target',
        email: 'target@example.com',
        display_name: 'Target User',
        is_admin: false,
        allow_password_login: false,
        native_language: 'vi',
        current_target_language: 'en',
        created_at: '2026-07-28T00:00:00Z',
        subscriptions: { plan_type: 'free', status: 'active' },
      },
    ])
    getOverview.mockResolvedValue({
      total: 2,
      roles: [
        { code: 'user', name: 'User', description: 'Learner account' },
        { code: 'super_admin', name: 'Super administrator', description: 'Recovery' },
        { code: 'security_admin', name: 'Security administrator', description: 'Security' },
        { code: 'exam_admin', name: 'Exam administrator', description: 'Exam content' },
      ],
      permissions: [{ code: 'exam.read', description: 'Read exams', roleCodes: ['exam_admin'] }],
      users: [
        { id: 'actor', email: 'actor@example.com', displayName: 'Current Admin', roleCodes: ['super_admin'] },
        { id: 'target', email: 'target@example.com', displayName: 'Target User', roleCodes: ['exam_admin'] },
      ],
    })
  })

  it('renders Tab 1 Accounts and allows opening RBAC role assignment modal', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AdminRolesPage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('button', { name: /danh sách tài khoản/i })).toBeInTheDocument()
    expect(await screen.findByText('Target User')).toBeInTheDocument()

    const assignButtons = screen.getAllByRole('button', { name: /phân quyền target user/i })
    await user.click(assignButtons[0])
    expect(screen.getByRole('checkbox', { name: /security administrator/i })).toBeInTheDocument()
  })

  it('uses the RBAC dialog as the only administrator role action in the account list', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AdminRolesPage />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('button', { name: /phân quyền target user/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /thao tác tài khoản target user/i }))
    expect(screen.queryByRole('button', { name: /cấp quyền admin/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /gỡ quyền admin/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /quản lý gói/i })).toBeInTheDocument()
  })

  it('shows role badges in Tab 2 and opens visual assignment dialog', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AdminRolesPage />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /phân quyền vai trò/i }))
    expect(await screen.findByText('Exam administrator')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /quản lý vai trò target user/i }))
    expect(screen.getByRole('checkbox', { name: /security administrator/i })).toBeInTheDocument()
  })

  it('keeps matrix edits as drafts until an administrator saves and confirms them in Tab 3', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AdminRolesPage />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: /ma trận quyền/i }))
    expect(await screen.findByRole('checkbox', { name: /exam.read.*user/i })).toBeDisabled()
    await user.click(screen.getByRole('checkbox', { name: /exam.read.*security administrator/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(invoke).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /lưu thay đổi \(1\)/i }))
    expect(screen.getByRole('dialog')).toHaveTextContent('exam.read')
    expect(invoke).not.toHaveBeenCalled()
  })

  it('closes the RBAC confirmation while a role revocation is synchronizing', async () => {
    const user = userEvent.setup()
    let resolveMutation: (() => void) | undefined
    const mutationPending = new Promise<void>((resolve) => {
      resolveMutation = resolve
    })
    invoke.mockImplementation((functionName: string) =>
      functionName === 'start-admin-session'
        ? Promise.resolve({ data: { data: {} }, error: null })
        : mutationPending.then(() => ({ data: { data: {} }, error: null })),
    )
    render(
      <MemoryRouter>
        <AdminRolesPage />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: /phân quyền vai trò/i }))
    await user.click(screen.getByRole('button', { name: /quản lý vai trò target user/i }))
    await user.click(screen.getByRole('checkbox', { name: /exam administrator/i }))
    await user.click(screen.getByRole('button', { name: /tiếp tục xác nhận/i }))
    await user.click(screen.getByRole('button', { name: /xác nhận thay đổi/i }))

    expect(screen.queryByRole('dialog', { name: /xác nhận thay đổi phân quyền/i })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Đang áp dụng thay đổi phân quyền')

    resolveMutation?.()
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument())
  })
})
