import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import {
  Crown,
  Filter,
  Info,
  Lock,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  User,
  UsersRound,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { SearchInput } from '@/components/ui/input'
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

function getRoleBadgeStyle(roleCode: string) {
  switch (roleCode) {
    case 'super_admin':
      return 'bg-rose-100 border-2 border-rose-400 text-rose-950 font-black shadow-[1.5px_1.5px_0_var(--border)]'
    case 'security_admin':
      return 'bg-amber-100 border-2 border-amber-400 text-amber-950 font-black shadow-[1.5px_1.5px_0_var(--border)]'
    case 'exam_admin':
      return 'bg-purple-100 border-2 border-purple-400 text-purple-950 font-black shadow-[1.5px_1.5px_0_var(--border)]'
    case 'user':
      return 'bg-slate-100 border-2 border-slate-300 text-slate-800 font-bold'
    default:
      return 'bg-blue-100 border-2 border-blue-300 text-blue-950 font-black shadow-[1.5px_1.5px_0_var(--border)]'
  }
}

function getRoleIcon(roleCode: string) {
  switch (roleCode) {
    case 'super_admin':
      return <Crown size={14} className="text-rose-600 shrink-0" />
    case 'security_admin':
      return <ShieldAlert size={14} className="text-amber-600 shrink-0" />
    case 'exam_admin':
      return <ShieldCheck size={14} className="text-purple-600 shrink-0" />
    default:
      return <User size={14} className="text-muted-foreground shrink-0" />
  }
}

export default function AdminRolesPage() {
  const userId = useAuthStore((state) => state.user?.id)
  const { loading: permissionLoading, hasPermission } = usePermissions()
  const [overview, setOverview] = useState<RoleManagementOverview>(emptyOverview)
  const [activeTab, setActiveTab] = useState<'users' | 'matrix'>('users')
  const [query, setQuery] = useState('')
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all')
  const [matrixQuery, setMatrixQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<RbacUser | null>(null)
  const [draftRoles, setDraftRoles] = useState<Set<string>>(new Set())
  const [matrixDrafts, setMatrixDrafts] = useState<Map<string, boolean>>(new Map())
  const [pendingMutations, setPendingMutations] = useState<Mutation[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const canAssignRoles = hasPermission('role.assign') || hasPermission('role.revoke')
  const canEditMatrix = isSuperAdmin

  // Auto dismiss error banner after 3 seconds
  useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => {
      setError(null)
    }, 3000)
    return () => clearTimeout(timer)
  }, [error])

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

  useEffect(() => {
    void loadOverview('')
  }, [loadOverview])

  useEffect(() => {
    if (!userId) {
      setIsSuperAdmin(false)
      return
    }
    void supabase
      .rpc('has_role', { p_role_code: 'super_admin' })
      .then(({ data, error }) => {
        if (!error) setIsSuperAdmin(Boolean(data))
      })
  }, [userId])

  const roles = useMemo(
    () =>
      overview.roles.some((role) => role.code === 'user')
        ? overview.roles
        : [{ code: 'user', name: 'User', description: 'Learner account' }, ...overview.roles],
    [overview.roles],
  )
  const roleByCode = useMemo(() => new Map(roles.map((role) => [role.code, role])), [roles])

  // Computed summary metrics
  const metrics = useMemo(() => {
    const totalUsers = overview.total
    const totalRoles = roles.length
    const totalPermissions = overview.permissions.length
    const superAdminsCount = overview.users.filter((u) => u.roleCodes.includes('super_admin')).length
    return { totalUsers, totalRoles, totalPermissions, superAdminsCount }
  }, [overview, roles])

  // Filtered users by search query and role filter
  const filteredUsers = useMemo(() => {
    return overview.users.filter((user) => {
      const matchQuery =
        !query ||
        user.displayName?.toLowerCase().includes(query.toLowerCase()) ||
        user.email?.toLowerCase().includes(query.toLowerCase())
      const matchRole =
        selectedRoleFilter === 'all' ||
        (selectedRoleFilter === 'user' && user.roleCodes.length === 0) ||
        user.roleCodes.includes(selectedRoleFilter)
      return matchQuery && matchRole
    })
  }, [overview.users, query, selectedRoleFilter])

  // Matrix search and grouping by prefix (e.g. "exam", "role", "user", "other")
  const filteredPermissions = useMemo(() => {
    if (!matrixQuery.trim()) return overview.permissions
    const q = matrixQuery.toLowerCase()
    return overview.permissions.filter(
      (p) => p.code.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)),
    )
  }, [overview.permissions, matrixQuery])

  const permissionGroups = useMemo(() => {
    const groups: Map<string, RbacPermission[]> = new Map()
    for (const perm of filteredPermissions) {
      const prefix = perm.code.includes('.') ? perm.code.split('.')[0] : 'other'
      if (!groups.has(prefix)) groups.set(prefix, [])
      groups.get(prefix)!.push(perm)
    }
    return groups
  }, [filteredPermissions])

  const openUserDialog = (target: RbacUser) => {
    setSelectedUser(target)
    setDraftRoles(new Set(target.roleCodes))
  }

  const queueRoleChanges = () => {
    if (!selectedUser) return
    const changes = roles
      .filter((role) => role.code !== 'user')
      .filter((role) => draftRoles.has(role.code) !== selectedUser.roleCodes.includes(role.code))
      .map(
        (role): Mutation => ({
          kind: 'role',
          action: draftRoles.has(role.code) ? 'grant' : 'revoke',
          targetUserId: selectedUser.id,
          roleCode: role.code,
          reason: 'RBAC change confirmed from the administrator console.',
        }),
      )
    setSelectedUser(null)
    if (changes.length) {
      setPendingMutations(changes)
    }
  }

  const setPermissionDraft = (permission: RbacPermission, roleCode: string, checked: boolean) => {
    setMatrixDrafts((current) => new Map(current).set(`${permission.code}:${roleCode}`, checked))
  }

  const toggleAllForRole = (roleCode: string, grant: boolean) => {
    if (!canEditMatrix || roleCode === 'user') return
    setMatrixDrafts((current) => {
      const next = new Map(current)
      for (const perm of overview.permissions) {
        next.set(`${perm.code}:${roleCode}`, grant)
      }
      return next
    })
  }

  const matrixChanges = useMemo(
    () =>
      overview.permissions.flatMap((permission) =>
        roles.flatMap((role): Mutation[] => {
          const original = permission.roleCodes.includes(role.code)
          const next = matrixDrafts.get(`${permission.code}:${role.code}`) ?? original
          return next === original
            ? []
            : [
                {
                  kind: 'permission',
                  action: next ? 'grant' : 'revoke',
                  roleCode: role.code,
                  permissionCode: permission.code,
                  reason: 'RBAC change confirmed from the administrator console.',
                },
              ]
        }),
      ),
    [matrixDrafts, overview.permissions, roles],
  )

  const queueMatrixChanges = () => setPendingMutations(matrixChanges)

  const confirmMutation = async () => {
    if (!pendingMutations.length) return
    const mutations = pendingMutations
    try {
      setSubmitting(true)
      setSyncing(true)
      setPendingMutations([])
      setSelectedUser(null)
      const { error: sessionError } = await supabase.functions.invoke('start-admin-session')
      if (sessionError) {
        throw new Error('Phiên quản trị chưa sẵn sàng. Hãy xác thực hai lớp lại rồi thử lại.')
      }
      for (const mutation of mutations) {
        const { error: invokeError } = await supabase.functions.invoke('manage-rbac', { body: mutation })
        if (invokeError) throw invokeError
      }
      setMatrixDrafts(new Map())
      await loadOverview(query)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể cập nhật quyền.'
      try {
        await loadOverview(query)
      } catch {
        // Preserve the mutation error when the recovery refresh also fails.
      }
      if (message.includes('Failed to send a request to the Edge Function')) {
        setError('Không thể kết nối tới Supabase Edge Function `manage-rbac`. Vui lòng đảm bảo dịch vụ Edge Function đang được khởi chạy hoặc deploy.')
      } else {
        setError(message)
      }
    } finally {
      setSubmitting(false)
      setSyncing(false)
    }
  }

  return (
    <div className="w-full space-y-6 pb-24">
      {/* Page Header */}
      <header className="neo-card flex flex-col gap-4 border-3 border-border bg-card p-6 shadow-[4px_4px_0_var(--border)] md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center border-3 border-border bg-primary text-primary-foreground shadow-[3px_3px_0_var(--border)]">
            <ShieldCheck size={30} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-foreground">VAI TRÒ & MA TRẬN QUYỀN</h1>
              <Badge className="bg-amber-100 text-amber-950 border-2 border-amber-400 font-black">RBAC Engine</Badge>
            </div>
            <p className="mt-1 text-xs font-bold text-muted-foreground">
              Phân quyền tài khoản đa cấp, quản lý bảng điều khiển vai trò và ma trận quyền hạn hệ thống.
            </p>
          </div>
        </div>

        {/* Stats Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 border-2 border-border bg-card px-3 py-1.5 text-xs font-black shadow-[2px_2px_0_var(--border)]">
            <UsersRound size={15} className="text-primary" />
            <span>{metrics.totalUsers} Người dùng</span>
          </div>
          <div className="flex items-center gap-2 border-2 border-border bg-purple-100 text-purple-950 px-3 py-1.5 text-xs font-black shadow-[2px_2px_0_var(--border)]">
            <Shield size={15} className="text-purple-700" />
            <span>{metrics.totalRoles} Vai trò</span>
          </div>
          <div className="flex items-center gap-2 border-2 border-border bg-rose-100 text-rose-950 px-3 py-1.5 text-xs font-black shadow-[2px_2px_0_var(--border)]">
            <Crown size={15} className="text-rose-600" />
            <span>{metrics.superAdminsCount} Super Admin</span>
          </div>
        </div>
      </header>

      {/* Auto-Dismissing Error Alert */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between border-3 border-rose-400 bg-rose-100 p-4 text-sm font-bold text-rose-950 rounded-xl shadow-[3px_3px_0_var(--border)] animate-in fade-in duration-200"
        >
          <span>{error}</span>
          <Button variant="ghost" onClick={() => setError(null)} className="h-8 px-2 text-xs font-black shrink-0">
            Đóng
          </Button>
        </div>
      )}

      {syncing ? (
        <div role="status" aria-live="polite" className="flex items-center gap-3 border-3 border-amber-400 bg-amber-100 p-4 text-sm font-black text-amber-950 rounded-xl shadow-[3px_3px_0_var(--border)] animate-in fade-in duration-200">
          <Sparkles size={18} className="shrink-0 animate-pulse" />
          <span>Đang áp dụng thay đổi phân quyền và đồng bộ dữ liệu…</span>
        </div>
      ) : null}

      {/* Tab Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-3 border-border pb-3">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeTab === 'users' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('users')}
            className="font-black text-sm"
          >
            <UsersRound size={17} />
            Phân quyền người dùng
          </Button>
          <Button
            variant={activeTab === 'matrix' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('matrix')}
            className="font-black text-sm relative"
          >
            <SlidersHorizontal size={17} />
            Ma trận quyền
            {matrixChanges.length > 0 && (
              <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-amber-950 border border-border">
                {matrixChanges.length}
              </span>
            )}
          </Button>
        </div>

        {/* Quick status summary info */}
        <div className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
          <Info size={14} className="text-primary" />
          <span>{isSuperAdmin ? 'Tài khoản có quyền Super Admin (Chỉnh sửa toàn bộ)' : 'Quyền hạn hạn chế theo vai trò'}</span>
        </div>
      </div>

      {/* TAB 1: PHÂN QUYỀN NGƯỜI DÙNG */}
      {activeTab === 'users' ? (
        <section className="neo-card border-3 border-border bg-card p-6 shadow-[4px_4px_0_var(--border)] space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-border pb-3">
            <div>
              <h2 className="text-lg font-black text-foreground uppercase tracking-wide flex items-center gap-2">
                <UsersRound size={20} className="text-primary" />
                Danh sách người dùng & Vai trò
              </h2>
              <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                Mỗi thao tác gán hoặc gỡ vai trò đều được ghi lại trong audit log hệ thống.
              </p>
            </div>
            <div className="text-xs font-black text-muted-foreground">
              Hiển thị <span className="text-foreground font-black">{filteredUsers.length}</span> / {overview.users.length} tài khoản
            </div>
          </div>

          {/* Dedicated Full-Width Filter & Search Toolbar Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-muted/40 p-3.5 rounded-xl border-2 border-border">
            {/* Search Input on Left - Spacious Width */}
            <div className="w-full lg:w-96 shrink-0">
              <SearchInput
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void loadOverview(query)
                }}
                placeholder="Tìm người dùng theo tên hoặc email..."
                aria-label="Tìm người dùng"
                className="w-full bg-white"
              />
            </div>

            {/* Role Filter Chips on Right */}
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="flex items-center gap-1 text-xs font-black text-muted-foreground mr-1">
                <Filter size={14} className="text-primary" />
                <span>Vai trò:</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRoleFilter('all')}
                className={`px-3 py-1.5 text-xs font-black rounded-lg border-2 transition-all ${
                  selectedRoleFilter === 'all'
                    ? 'bg-primary text-primary-foreground border-border shadow-[2px_2px_0_var(--border)]'
                    : 'bg-white text-muted-foreground border-border hover:bg-slate-50'
                }`}
              >
                Tất cả ({overview.users.length})
              </button>
              {roles.map((role) => {
                const count = overview.users.filter((u) =>
                  role.code === 'user' ? u.roleCodes.length === 0 : u.roleCodes.includes(role.code),
                ).length
                const isActive = selectedRoleFilter === role.code

                return (
                  <button
                    key={role.code}
                    type="button"
                    onClick={() => setSelectedRoleFilter(role.code)}
                    className={`px-3 py-1.5 text-xs font-black rounded-lg border-2 transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground border-border shadow-[2px_2px_0_var(--border)]'
                        : 'bg-white text-muted-foreground border-border hover:bg-slate-50'
                    }`}
                  >
                    {role.code} ({count})
                  </button>
                )
              })}
            </div>
          </div>

          {/* User & Role Data Table */}
          {loading || permissionLoading ? (
            <div className="py-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="mt-3 font-black text-sm text-muted-foreground">Đang tải cấu hình phân quyền…</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-border rounded-xl bg-muted/30">
              <User size={36} className="mx-auto text-muted-foreground" />
              <p className="mt-2 font-black text-base text-foreground">Không tìm thấy người dùng phù hợp</p>
              <p className="text-xs text-muted-foreground">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc vai trò.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border-3 border-border rounded-xl shadow-[4px_4px_0_var(--border)] bg-white">
              <table className="min-w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-amber-100 border-b-3 border-border text-amber-950 font-black uppercase tracking-wide">
                    <th className="p-3.5 border-r-2 border-border w-[40%]">Người dùng</th>
                    <th className="p-3.5 border-r-2 border-border w-[40%]">Vai trò quản trị</th>
                    <th className="p-3.5 text-right w-[20%]">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((target) => {
                    const initial = (target.displayName || target.email || 'U')[0].toUpperCase()

                    return (
                      <tr key={target.id} className="border-b-2 border-border hover:bg-amber-50/40 transition-colors">
                        {/* User Profile */}
                        <td className="p-3.5 border-r-2 border-border">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-border bg-primary text-primary-foreground font-black text-sm shadow-[2px_2px_0_var(--border)]">
                              {initial}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-black text-sm text-foreground truncate">
                                {target.displayName || 'Chưa đặt tên'}
                              </p>
                              <p className="text-xs font-semibold text-muted-foreground truncate">{target.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Roles Badges */}
                        <td className="p-3.5 border-r-2 border-border">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {target.roleCodes.length ? (
                              target.roleCodes.map((code) => (
                                <span
                                  key={code}
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs rounded-md ${getRoleBadgeStyle(
                                    code,
                                  )}`}
                                >
                                  {getRoleIcon(code)}
                                  {roleByCode.get(code)?.name || code}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs font-bold text-muted-foreground bg-muted px-2.5 py-0.5 rounded border border-border">
                                Học viên (Default User)
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-right">
                          <Button
                            variant="secondary"
                            disabled={!canAssignRoles}
                            aria-label={`Quản lý vai trò ${target.displayName || target.email}`}
                            onClick={() => openUserDialog(target)}
                            className="text-xs font-black h-8 px-3"
                          >
                            <UsersRound size={15} /> Quản lý vai trò
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        /* TAB 2: MA TRẬN QUYỀN */
        <section className="neo-card border-3 border-border bg-card p-6 shadow-[4px_4px_0_var(--border)] space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-border pb-3">
            <div>
              <h2 className="text-lg font-black text-foreground uppercase tracking-wide flex items-center gap-2">
                <SlidersHorizontal size={20} className="text-primary" />
                Ma trận quyền hạn (RBAC Matrix)
              </h2>
              <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                Đánh dấu checkbox để sửa nháp. Nhấn "Lưu thay đổi" để xác nhận lưu vào hệ thống.
              </p>
            </div>
          </div>

          {/* Dedicated Full-Width Filter & Actions Toolbar Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-3.5 rounded-xl border-2 border-border">
            {/* Search Input on Left - Wide & Unclipped */}
            <div className="w-full sm:w-96 shrink-0">
              <SearchInput
                value={matrixQuery}
                onChange={(e) => setMatrixQuery(e.target.value)}
                placeholder="Tìm kiếm quyền hạn (ví dụ: exam, role)..."
                aria-label="Tìm quyền hạn"
                className="w-full bg-white"
              />
            </div>

            {/* Actions on Right - Single Row */}
            <div className="flex items-center gap-3 shrink-0">
              {matrixChanges.length > 0 && (
                <span className="text-xs font-black text-amber-950 bg-amber-200 px-2.5 py-1 rounded-lg border border-amber-400">
                  {matrixChanges.length} bản nháp chưa lưu
                </span>
              )}

              <Button
                disabled={!canEditMatrix || matrixChanges.length === 0}
                onClick={queueMatrixChanges}
                variant="primary"
                className="font-black shrink-0"
              >
                Lưu thay đổi ({matrixChanges.length})
              </Button>
            </div>
          </div>

          {/* Matrix table grouped by permission category */}
          <div className="overflow-x-auto border-3 border-border rounded-xl shadow-[3px_3px_0_var(--border)] bg-white">
            <table className="min-w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-amber-100 border-b-3 border-border">
                  <th className="border-r-2 border-border p-3.5 font-black text-amber-950 uppercase tracking-wide w-2/5">
                    Quyền hạn (Permission)
                  </th>
                  {roles.map((role) => (
                    <th key={role.code} className="border-r-2 border-border p-3.5 text-center font-black text-amber-950 min-w-[130px]">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`px-2 py-0.5 rounded text-[11px] uppercase ${getRoleBadgeStyle(role.code)}`}>
                          {roleLabel(role)}
                        </span>
                        {canEditMatrix && role.code !== 'user' && (
                          <div className="mt-1.5 flex gap-1">
                            <button
                              type="button"
                              title={`Cấp tất cả quyền cho ${role.name}`}
                              onClick={() => toggleAllForRole(role.code, true)}
                              className="text-[10px] font-black px-1.5 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border border-emerald-400 rounded"
                            >
                              Tất cả
                            </button>
                            <button
                              type="button"
                              title={`Bỏ tất cả quyền của ${role.name}`}
                              onClick={() => toggleAllForRole(role.code, false)}
                              className="text-[10px] font-black px-1.5 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-950 border border-rose-400 rounded"
                            >
                              Bỏ
                            </button>
                          </div>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from(permissionGroups.entries()).map(([groupName, groupPermissions]) => (
                  <Fragment key={groupName}>
                    {/* Category Divider Header */}
                    <tr className="bg-slate-100 border-b-2 border-t-2 border-border">
                      <td
                        colSpan={roles.length + 1}
                        className="p-2.5 font-black text-slate-800 uppercase tracking-wider text-[11px]"
                      >
                        <div className="flex items-center gap-2">
                          <Shield className="text-primary" size={14} />
                          <span>Nhóm quyền: {groupName.toUpperCase()}</span>
                          <Badge className="bg-white text-slate-900 border border-border text-[10px]">
                            {groupPermissions.length} quyền
                          </Badge>
                        </div>
                      </td>
                    </tr>

                    {/* Permission items inside group */}
                    {groupPermissions.map((permission) => (
                      <tr key={permission.code} className="hover:bg-amber-50/40 transition-colors border-b-2 border-border">
                        <td className="border-r-2 border-border p-3 bg-white">
                          <p className="font-black text-foreground text-xs">{permission.code}</p>
                          <p className="text-muted-foreground text-[11px] font-medium mt-0.5">
                            {permission.description || 'Chưa có mô tả'}
                          </p>
                        </td>

                        {roles.map((role) => {
                          const original = permission.roleCodes.includes(role.code)
                          const isDraft = matrixDrafts.has(`${permission.code}:${role.code}`)
                          const checked = matrixDrafts.get(`${permission.code}:${role.code}`) ?? original
                          const disabled = !canEditMatrix || role.code === 'user'

                          return (
                            <td
                              key={role.code}
                              className={`border-r-2 border-border p-3 text-center transition-colors ${
                                isDraft ? 'bg-amber-100/70 font-bold' : 'bg-white'
                              }`}
                            >
                              <div className="flex flex-col items-center justify-center gap-1">
                                <input
                                  type="checkbox"
                                  className="h-5 w-5 accent-[#fdc800] cursor-pointer rounded border-2 border-border focus:ring-2 focus:ring-primary disabled:cursor-not-allowed"
                                  aria-label={`${permission.code} ${role.name}`}
                                  checked={checked}
                                  disabled={disabled}
                                  onChange={(event) =>
                                    setPermissionDraft(permission, role.code, event.target.checked)
                                  }
                                />
                                {isDraft && (
                                  <span className="text-[9px] font-black text-amber-950 bg-amber-300 px-1 rounded border border-amber-500">
                                    NHÁP
                                  </span>
                                )}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* FLOATING ACTION BAR FOR MATRIX DRAFTS */}
      {activeTab === 'matrix' && matrixChanges.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4 animate-in slide-in-from-bottom-5 duration-200">
          <div className="neo-card border-3 border-border bg-amber-400 p-4 shadow-[6px_6px_0_var(--border)] flex items-center justify-between gap-4 rounded-xl text-amber-950">
            <div className="flex items-center gap-3">
              <Sparkles size={22} className="shrink-0 animate-bounce" />
              <div>
                <p className="font-black text-sm">Bạn đang có {matrixChanges.length} thay đổi ma trận quyền chưa lưu</p>
                <p className="text-xs font-semibold">Các quyền hạn chỉ chính thức áp dụng sau khi lưu và xác nhận.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => setMatrixDrafts(new Map())}
                className="h-9 text-xs font-black bg-white hover:bg-slate-100"
              >
                <RotateCcw size={14} /> Hủy nháp
              </Button>
              <Button
                variant="secondary"
                onClick={queueMatrixChanges}
                disabled={!canEditMatrix}
                className="h-9 text-xs font-black"
              >
                Lưu ({matrixChanges.length})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GÁN VAI TRÒ NGƯỜI DÙNG */}
      {selectedUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div
            role="dialog"
            aria-modal="true"
            className="neo-card w-full max-w-xl border-3 border-border bg-card p-6 shadow-[6px_6px_0_var(--border)] rounded-xl space-y-5"
          >
            <div className="flex items-center gap-3 border-b-2 border-border pb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-border bg-primary text-primary-foreground font-black text-lg shadow-[2px_2px_0_var(--border)]">
                {(selectedUser.displayName || selectedUser.email || 'U')[0].toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-black text-foreground">
                  Phân quyền cho {selectedUser.displayName || selectedUser.email}
                </h2>
                <p className="text-xs font-semibold text-muted-foreground">{selectedUser.email}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Tích chọn các vai trò quản trị muốn cấp cho người dùng này:
              </p>
              {roles
                .filter((role) => role.code !== 'user')
                .map((role) => {
                  const isChecked = draftRoles.has(role.code)
                  const isDisabled = role.code === 'super_admin' && !isSuperAdmin

                  return (
                    <label
                      key={role.code}
                      className={`flex items-center gap-3 border-2 border-border p-3.5 font-bold rounded-xl cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-amber-100 border-amber-400 shadow-[2px_2px_0_var(--border)]'
                          : 'bg-white hover:bg-slate-50'
                      } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        className="h-5 w-5 accent-[#fdc800] rounded cursor-pointer border-2 border-border"
                        aria-label={role.name}
                        checked={isChecked}
                        disabled={isDisabled}
                        onChange={(event) =>
                          setDraftRoles((current) => {
                            const next = new Set(current)
                            if (event.target.checked) next.add(role.code)
                            else next.delete(role.code)
                            return next
                          })
                        }
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${getRoleBadgeStyle(role.code)}`}>
                            {role.name}
                          </span>
                          {role.code === 'super_admin' && (
                            <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300 flex items-center gap-1">
                              <Lock size={10} /> Super Admin Only
                            </span>
                          )}
                        </div>
                        {role.description && (
                          <p className="mt-1 text-xs text-muted-foreground font-medium">{role.description}</p>
                        )}
                      </div>
                    </label>
                  )
                })}
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t-2 border-border pt-4">
              <Button variant="ghost" onClick={() => setSelectedUser(null)}>
                Hủy
              </Button>
              <Button variant="primary" onClick={queueRoleChanges}>
                Tiếp tục xác nhận
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* CONFIRMATION DIALOG FOR MUTATIONS */}
      <ConfirmModal
        open={pendingMutations.length > 0}
        title="Xác nhận thay đổi phân quyền"
        description={`Áp dụng ${pendingMutations.length} thay đổi ngay trên các yêu cầu được bảo vệ và ghi vào audit log.`}
        confirmLabel="Xác nhận thay đổi"
        cancelLabel="Hủy"
        variant="primary"
        confirmDisabled={submitting}
        onConfirm={() => void confirmMutation()}
        onCancel={() => setPendingMutations([])}
      >
        <ul className="list-disc space-y-1.5 pl-5 text-sm font-bold text-foreground">
          {pendingMutations.map((mutation, index) => (
            <li key={`${mutation.kind}-${index}`}>
              {mutation.action === 'grant' ? (
                <span className="text-emerald-700">Cấp</span>
              ) : (
                <span className="text-rose-700">Gỡ</span>
              )}{' '}
              {mutation.kind === 'permission'
                ? `${mutation.permissionCode} cho ${roleByCode.get(mutation.roleCode)?.name || mutation.roleCode}`
                : `${roleByCode.get(mutation.roleCode)?.name || mutation.roleCode}`}
            </li>
          ))}
        </ul>
      </ConfirmModal>
    </div>
  )
}
