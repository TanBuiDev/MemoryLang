import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getOverview, invoke } = vi.hoisted(() => ({ getOverview: vi.fn(), invoke: vi.fn() }))

vi.mock('@/services/supabase/rbac.service', () => ({ rbacService: { getOverview } }))
vi.mock('@/services/supabase/client', () => ({ supabase: { rpc: vi.fn().mockResolvedValue({ data: true, error: null }), functions: { invoke } } }))
vi.mock('@/stores/useAuthStore', () => ({ useAuthStore: (selector: (state: { user: { id: string } | null }) => unknown) => selector({ user: { id: 'actor' } }) }))
vi.mock('@/hooks/usePermissions', () => ({ usePermissions: () => ({ loading: false, hasPermission: (permission: string) => permission === 'role.assign' || permission === 'role.revoke' }) }))

import AdminRolesPage from './AdminRolesPage'

describe('AdminRolesPage', () => {
  beforeEach(() => {
    getOverview.mockResolvedValue({
      total: 1,
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

  it('shows role badges and opens a visual assignment dialog', async () => {
    const user = userEvent.setup()
    render(<AdminRolesPage />)

    expect(await screen.findByText('Exam administrator')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /quản lý vai trò target user/i }))
    expect(screen.getByRole('checkbox', { name: /security administrator/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/lý do thay đổi/i)).not.toBeInTheDocument()
  })

  it('keeps matrix edits as drafts until an administrator saves and confirms them', async () => {
    const user = userEvent.setup()
    render(<AdminRolesPage />)
    await screen.findByText('Exam administrator')

    await user.click(screen.getByRole('button', { name: /ma trận quyền/i }))
    expect(screen.getByRole('checkbox', { name: /exam.read.*user/i })).toBeDisabled()
    await user.click(screen.getByRole('checkbox', { name: /exam.read.*security administrator/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(invoke).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: /lưu thay đổi \(1\)/i }))
    expect(screen.getByRole('dialog')).toHaveTextContent('exam.read')
    expect(invoke).not.toHaveBeenCalled()
  })
})
