import { useCallback, useEffect, useMemo, useState } from 'react'
import { ShieldCheck, UsersRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input, SearchInput } from '@/components/ui/input'
import { usePermissions } from '@/hooks/usePermissions'
import { rbacService, type RbacPermission, type RbacRole, type RbacUser, type RoleManagementOverview } from '@/services/supabase/rbac.service'
import { supabase } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'

type Mutation =
  | { kind: 'role'; action: 'grant' | 'revoke'; targetUserId: string; roleCode: string; reason: string }
  | { kind: 'permission'; action: 'grant' | 'revoke'; roleCode: string; permissionCode: string; reason: string }

const emptyOverview: RoleManagementOverview = { roles: [], permissions: [], users: [], total: 0 }

function roleLabel(role: RbacRole) {
  return role.name || role.code.replaceAll('_', ' ')
}

export default function AdminRolesPage() {
  const userId = useAuthStore((state) => state.user?.id)
  const { loading: permissionLoading, hasPermission } = usePermissions()
  const [overview, setOverview] = useState<RoleManagementOverview>(emptyOverview)
  const [activeTab, setActiveTab] = useState<'users' | 'matrix'>('users')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<RbacUser | null>(null)
  const [draftRoles, setDraftRoles] = useState<Set<string>>(new Set())
  const [reason, setReason] = useState('')
  const [pendingMutations, setPendingMutations] = useState<Mutation[]>([])
  const [submitting, setSubmitting] = useState(false)

  const canAssignRoles = hasPermission('role.assign') || hasPermission('role.revoke')
  const canEditMatrix = isSuperAdmin

  const loadOverview = useCallback(async (search: string) => {
    try {
      setLoading(true)
      setError(null)
      setOverview(await rbacService.getOverview(search))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải cấu hình phân quyền.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadOverview('') }, [loadOverview])
  useEffect(() => {
    if (!userId) {
      setIsSuperAdmin(false)
      return
    }
    void supabase.rpc('has_role', { p_role_code: 'super_admin' })
      .then(({ data, error }) => { if (!error) setIsSuperAdmin(Boolean(data)) })
  }, [userId])

  const roleByCode = useMemo(() => new Map(overview.roles.map((role) => [role.code, role])), [overview.roles])

  const openUserDialog = (target: RbacUser) => {
    setSelectedUser(target)
    setDraftRoles(new Set(target.roleCodes))
    setReason('')
  }

  const queueRoleChanges = () => {
    if (!selectedUser || !reason.trim()) return
    const changes = overview.roles
      .filter((role) => draftRoles.has(role.code) !== selectedUser.roleCodes.includes(role.code))
      .map((role): Mutation => ({
        kind: 'role',
        action: draftRoles.has(role.code) ? 'grant' : 'revoke',
        targetUserId: selectedUser.id,
        roleCode: role.code,
        reason: reason.trim(),
      }))
    if (!changes.length) {
      setSelectedUser(null)
      return
    }
    setPendingMutations(changes)
  }

  const queuePermissionChange = (permission: RbacPermission, roleCode: string, checked: boolean) => {
    setPendingMutations([{
      kind: 'permission',
      action: checked ? 'grant' : 'revoke',
      roleCode,
      permissionCode: permission.code,
      reason: reason.trim() || 'Cập nhật ma trận quyền từ giao diện quản trị.',
    }])
  }

  const confirmMutation = async () => {
    if (!pendingMutations.length) return
    try {
      setSubmitting(true)
      for (const mutation of pendingMutations) {
        const { error: invokeError } = await supabase.functions.invoke('manage-rbac', { body: mutation })
        if (invokeError) throw invokeError
      }
      setPendingMutations([])
      setSelectedUser(null)
      setReason('')
      await loadOverview(query)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật quyền.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 pb-16">
      <header className="neo-card flex flex-col gap-4 border-3 border-border bg-card p-5 shadow-[4px_4px_0_var(--border)] md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center border-3 border-border bg-primary shadow-[2px_2px_0_var(--border)]"><ShieldCheck size={25} /></div>
          <div><h1 className="text-2xl font-black">VAI TRÒ & MA TRẬN QUYỀN</h1><p className="mt-1 text-xs font-bold text-muted-foreground">Phân quyền trực quan, bắt buộc MFA và lưu vết đầy đủ.</p></div>
        </div>
        <Badge className="bg-amber-100 text-amber-950">{overview.total} tài khoản</Badge>
      </header>

      {error ? <div role="alert" className="border-3 border-rose-400 bg-rose-100 p-4 text-sm font-bold text-rose-950">{error}</div> : null}
      <div className="flex flex-wrap gap-2">
        <Button variant={activeTab === 'users' ? 'primary' : 'ghost'} onClick={() => setActiveTab('users')}>Phân quyền người dùng</Button>
        <Button variant={activeTab === 'matrix' ? 'primary' : 'ghost'} onClick={() => setActiveTab('matrix')}>Ma trận quyền</Button>
      </div>

      {activeTab === 'users' ? (
        <section className="neo-card border-3 border-border bg-card p-5 shadow-[4px_4px_0_var(--border)]">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h2 className="text-lg font-black">PHÂN QUYỀN NGƯỜI DÙNG</h2><p className="text-xs font-semibold text-muted-foreground">Mỗi thay đổi đều cần lý do, MFA và phiên quản trị đang hoạt động.</p></div><SearchInput value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void loadOverview(query) }} placeholder="Tìm theo tên hoặc email" aria-label="Tìm người dùng" className="md:w-80" /></div>
          {loading || permissionLoading ? <p className="font-bold">Đang tải phân quyền…</p> : <div className="space-y-3">{overview.users.map((target) => <div key={target.id} className="flex flex-col gap-3 border-2 border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black">{target.displayName || target.email || 'Chưa đặt tên'}</p><p className="text-xs font-semibold text-muted-foreground">{target.email}</p><div className="mt-2 flex flex-wrap gap-2">{target.roleCodes.length ? target.roleCodes.map((code) => <Badge key={code} className="bg-purple-100 text-purple-950">{roleByCode.get(code)?.name || code}</Badge>) : <span className="text-xs font-bold text-muted-foreground">Chưa có vai trò quản trị</span>}</div></div><Button variant="secondary" disabled={!canAssignRoles || target.id === userId} aria-label={`Quản lý vai trò ${target.displayName || target.email}`} onClick={() => openUserDialog(target)}><UsersRound size={16} /> Quản lý vai trò</Button></div>)}</div>}
        </section>
      ) : (
        <section className="neo-card overflow-x-auto border-3 border-border bg-card p-5 shadow-[4px_4px_0_var(--border)]">
          <div className="mb-4"><h2 className="text-lg font-black">MA TRẬN QUYỀN</h2><p className="text-xs font-semibold text-muted-foreground">Chỉ super administrator có thể thay đổi. Các ô super administrator được khóa để bảo toàn đường khôi phục.</p><div className="mt-3 max-w-xl"><Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Lý do cho thay đổi ma trận" aria-label="Lý do thay đổi ma trận" /></div></div>
          <table className="min-w-full border-collapse text-left text-xs"><thead><tr><th className="border-2 border-border bg-amber-100 p-3 font-black">Quyền</th>{overview.roles.map((role) => <th key={role.code} className="border-2 border-border bg-amber-100 p-3 font-black">{roleLabel(role)}</th>)}</tr></thead><tbody>{overview.permissions.map((permission) => <tr key={permission.code}><td className="border-2 border-border p-3"><p className="font-black">{permission.code}</p><p className="text-muted-foreground">{permission.description}</p></td>{overview.roles.map((role) => { const checked = permission.roleCodes.includes(role.code); const disabled = role.code === 'super_admin' || !canEditMatrix; return <td key={role.code} className="border-2 border-border p-3 text-center"><input type="checkbox" className="h-5 w-5 accent-[#fdc800]" aria-label={`${permission.code} ${role.name}`} checked={checked} disabled={disabled} onChange={(event) => queuePermissionChange(permission, role.code, event.target.checked)} /></td> })}</tr>)}</tbody></table>
        </section>
      )}

      {selectedUser ? <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"><div role="dialog" aria-modal="true" className="neo-card w-full max-w-xl border-3 border-border bg-card p-6 shadow-[5px_5px_0_var(--border)]"><h2 className="text-xl font-black">Phân quyền cho {selectedUser.displayName || selectedUser.email}</h2><div className="mt-4 space-y-3">{overview.roles.map((role) => <label key={role.code} className="flex items-center gap-3 border-2 border-border p-3 font-bold"><input type="checkbox" aria-label={role.name} checked={draftRoles.has(role.code)} disabled={role.code === 'super_admin' && !isSuperAdmin} onChange={(event) => setDraftRoles((current) => { const next = new Set(current); if (event.target.checked) next.add(role.code); else next.delete(role.code); return next })} />{role.name}<span className="ml-auto text-xs text-muted-foreground">{role.description}</span></label>)}</div><div className="mt-4"><Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ví dụ: Bổ sung người trực hỗ trợ ca tối" aria-label="Lý do thay đổi" /></div><div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={() => setSelectedUser(null)}>Hủy</Button><Button disabled={!reason.trim()} onClick={queueRoleChanges}>Tiếp tục xác nhận</Button></div></div></div> : null}

      <ConfirmModal open={pendingMutations.length > 0} title="Xác nhận thay đổi phân quyền" description={`Áp dụng ${pendingMutations.length} thay đổi ngay trên các yêu cầu được bảo vệ và ghi vào audit log.`} confirmLabel="Xác nhận thay đổi" cancelLabel="Hủy" variant="primary" confirmDisabled={submitting} onConfirm={() => void confirmMutation()} onCancel={() => setPendingMutations([])} />
    </div>
  )
}
