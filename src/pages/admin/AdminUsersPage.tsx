import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Crown,
  KeyRound,
  MoreVertical,
  Shield,
  ShieldAlert,
  User,
  Users,
  UserX,
} from 'lucide-react'
import { adminService } from '@/services/supabase/admin.service'
import { DataTable } from '@/components/admin/DataTable'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import type { Profile } from '@/types/auth.types'

interface AdminUserProfile extends Profile {
  subscriptions?: {
    plan_type: 'free' | 'pro'
    status: string
  } | null
}

type LearnerFilterCategory = 'all' | 'pro' | 'free'

function UserActionKebabMenu({
  user,
  actionLoading,
  onToggleAdmin,
  onTogglePasswordLogin,
}: {
  user: AdminUserProfile
  actionLoading: boolean
  onToggleAdmin: (userId: string, currentAdminStatus: boolean) => void
  onTogglePasswordLogin: (user: AdminUserProfile) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const isPro = user.subscriptions?.plan_type === 'pro'

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <Button
        type="button"
        variant="ghost"
        disabled={actionLoading}
        onClick={() => setIsOpen((prev) => !prev)}
        className="h-8 w-8 p-0 rounded-lg border-2 border-border bg-card hover:bg-muted font-black inline-flex items-center justify-center shadow-[1.5px_1.5px_0_var(--border)]"
        aria-label={`Thao tác tài khoản ${user.display_name || user.email}`}
      >
        <MoreVertical size={16} />
      </Button>

      {isOpen && (
        <div className="absolute right-0 z-30 mt-1 w-56 rounded-xl border-3 border-border bg-card p-1.5 shadow-[4px_4px_0_var(--border)] animate-in fade-in zoom-in-95 duration-100">
          <Link
            to={`/app/admin/subscriptions?user=${user.id}`}
            onClick={() => setIsOpen(false)}
            className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-xs font-black text-foreground hover:bg-amber-100 hover:text-amber-950 transition-colors"
          >
            <Crown size={15} className="text-amber-600 shrink-0" />
            <span>Quản lý gói ({isPro ? 'Pro' : 'Free'})</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false)
              onToggleAdmin(user.id, Boolean(user.is_admin))
            }}
            className={`flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-xs font-black transition-colors text-left ${
              user.is_admin ? 'hover:bg-rose-100 text-rose-700' : 'hover:bg-primary/20 text-foreground'
            }`}
          >
            {user.is_admin ? (
              <>
                <UserX size={15} className="text-rose-600 shrink-0" />
                <span>Gỡ quyền Admin</span>
              </>
            ) : (
              <>
                <Shield size={15} className="text-primary shrink-0" />
                <span>Cấp quyền Admin</span>
              </>
            )}
          </button>

          {user.is_admin && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                onTogglePasswordLogin(user)
              }}
              className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-xs font-black text-foreground hover:bg-emerald-100 hover:text-emerald-950 transition-colors text-left"
            >
              <KeyRound size={15} className="text-emerald-600 shrink-0" />
              <span>{user.allow_password_login ? 'Tắt đăng nhập mật khẩu' : 'Cho phép mật khẩu'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [learnerFilter, setLearnerFilter] = useState<LearnerFilterCategory>('all')

  // ConfirmModal state
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    title: string
    description: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'primary' | 'danger'
    onConfirm: () => void
  } | null>(null)

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await adminService.listUsers()
      setUsers(data)
    } catch (err: unknown) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách người dùng')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  // Partition users into Admin & Learner lists
  const { adminUsers, learnerUsers, stats } = useMemo(() => {
    const admins = users.filter((u) => u.is_admin)
    const learners = users.filter((u) => !u.is_admin)
    const proCount = learners.filter((u) => u.subscriptions?.plan_type === 'pro').length
    const freeCount = learners.length - proCount
    return {
      adminUsers: admins,
      learnerUsers: learners,
      stats: { total: users.length, adminCount: admins.length, learnerCount: learners.length, proCount, freeCount },
    }
  }, [users])

  // Filter learners by active tab
  const filteredLearnerUsers = useMemo(() => {
    return learnerUsers.filter((user) => {
      if (learnerFilter === 'pro') return user.subscriptions?.plan_type === 'pro'
      if (learnerFilter === 'free') return !user.subscriptions || user.subscriptions.plan_type === 'free'
      return true
    })
  }, [learnerUsers, learnerFilter])

  const handleToggleAdmin = (userId: string, currentAdminStatus: boolean) => {
    if (actionLoading) return

    setConfirmModal({
      open: true,
      title: currentAdminStatus ? 'Gỡ quyền Admin' : 'Cấp quyền Admin',
      description: currentAdminStatus
        ? 'Bạn có chắc chắn muốn gỡ quyền Admin của người dùng này không?'
        : 'Bạn có chắc chắn muốn cấp quyền Admin cho người dùng này không?',
      confirmLabel: currentAdminStatus ? 'Gỡ quyền Admin' : 'Xác nhận cấp Admin',
      cancelLabel: 'Hủy',
      variant: currentAdminStatus ? 'danger' : 'primary',
      onConfirm: async () => {
        setConfirmModal(null)
        try {
          setActionLoading(userId)
          const result = await adminService.updateUserAdminStatus(userId, !currentAdminStatus)
          setUsers((prev) =>
            prev.map((u) =>
              u.id === userId
                ? { ...u, is_admin: result.isAdmin, allow_password_login: result.isAdmin ? u.allow_password_login : false }
                : u,
            ),
          )
        } catch (err: unknown) {
          console.error(err)
          setError(err instanceof Error ? err.message : 'Không thể thay đổi quyền quản trị')
        } finally {
          setActionLoading(null)
        }
      },
    })
  }

  const handleToggleAdminPasswordLogin = (user: AdminUserProfile) => {
    if (actionLoading || !user.is_admin) return
    const nextValue = !user.allow_password_login

    setConfirmModal({
      open: true,
      title: nextValue ? 'Cho phép admin đăng nhập bằng mật khẩu?' : 'Tắt đăng nhập bằng mật khẩu?',
      description: nextValue
        ? 'Admin này có thể dùng email và mật khẩu tại trang đăng nhập, ngoài lựa chọn Google.'
        : 'Admin này chỉ có thể đăng nhập bằng Google. Phiên đang đăng nhập vẫn không bị ảnh hưởng.',
      confirmLabel: nextValue ? 'Cho phép mật khẩu' : 'Tắt mật khẩu',
      cancelLabel: 'Hủy',
      variant: nextValue ? 'primary' : 'danger',
      onConfirm: async () => {
        setConfirmModal(null)
        try {
          setActionLoading(user.id)
          await adminService.setAdminPasswordLogin(user.id, nextValue)
          setUsers((prev) =>
            prev.map((entry) => (entry.id === user.id ? { ...entry, allow_password_login: nextValue } : entry)),
          )
        } catch (err: unknown) {
          console.error(err)
          setError(err instanceof Error ? err.message : 'Không thể cập nhật quyền đăng nhập bằng mật khẩu')
        } finally {
          setActionLoading(null)
        }
      },
    })
  }

  // Shared columns builder
  const createColumns = (isAdminTable: boolean) => [
    {
      header: isAdminTable ? 'Quản trị viên' : 'Người học',
      className: 'w-[32%]',
      accessor: (row: AdminUserProfile) => {
        const initial = row.display_name ? row.display_name[0].toUpperCase() : 'U'
        return (
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl border-2 border-border shadow-[2px_2px_0_var(--border)] flex items-center justify-center font-black text-sm shrink-0 ${
              isAdminTable ? 'bg-rose-500 text-white' : 'bg-primary text-primary-foreground'
            }`}>
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-black text-foreground text-sm truncate">
                {row.display_name || 'Chưa đặt tên'}
              </div>
              <div className="text-xs text-muted-foreground font-semibold truncate">
                {row.email || 'không_có_email'}
              </div>
            </div>
          </div>
        )
      },
    },
    {
      header: 'Gói dịch vụ',
      className: 'w-[16%]',
      accessor: (row: AdminUserProfile) => {
        const plan = row.subscriptions?.plan_type ?? 'free'
        return plan === 'pro' ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-100 text-amber-950 border-2 border-amber-400 text-xs font-black uppercase">
            <Crown size={13} className="text-amber-600 shrink-0" />
            Pro
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-muted text-muted-foreground border-2 border-border text-xs font-black uppercase">
            Free
          </span>
        )
      },
    },
    {
      header: 'Ngôn ngữ học',
      className: 'w-[20%]',
      accessor: (row: AdminUserProfile) => (
        <div className="flex items-center gap-1.5 text-xs font-black">
          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 border border-blue-300 uppercase">
            {row.native_language || 'vi'}
          </span>
          <span className="text-muted-foreground">→</span>
          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-300 uppercase">
            {row.current_target_language || 'en'}
          </span>
        </div>
      ),
    },
    {
      header: 'Quyền hạn & Mật khẩu',
      className: 'w-[22%]',
      accessor: (row: AdminUserProfile) => (
        <div className="flex flex-wrap items-center gap-1.5">
          {row.is_admin ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-100 text-rose-950 border-2 border-rose-400 text-xs font-black uppercase">
              <ShieldAlert size={13} className="text-rose-700 shrink-0" />
              Admin
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border-2 border-border text-xs font-black uppercase">
              <User size={13} className="shrink-0" />
              User
            </span>
          )}
          {row.is_admin && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black border ${
              row.allow_password_login
                ? 'bg-emerald-100 text-emerald-950 border-emerald-400'
                : 'bg-muted text-muted-foreground border-border'
            }`}>
              <KeyRound size={11} className={row.allow_password_login ? 'text-emerald-700' : 'text-muted-foreground'} />
              {row.allow_password_login ? 'Mật khẩu ON' : 'Mật khẩu OFF'}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Thao tác',
      className: 'text-right w-[10%]',
      accessor: (row: AdminUserProfile) => (
        <div className="flex items-center justify-end">
          <UserActionKebabMenu
            user={row}
            actionLoading={actionLoading === row.id}
            onToggleAdmin={handleToggleAdmin}
            onTogglePasswordLogin={handleToggleAdminPasswordLogin}
          />
        </div>
      ),
    },
  ]

  const searchFilter = (row: AdminUserProfile, query: string) => {
    const term = query.toLowerCase()
    const nameMatch = row.display_name ? row.display_name.toLowerCase().includes(term) : false
    const emailMatch = row.email ? row.email.toLowerCase().includes(term) : false
    return nameMatch || emailMatch
  }

  return (
    <div className="w-full space-y-8 pb-16">
      {/* Top Banner / Header */}
      <header className="neo-card bg-card p-5 border-3 border-border shadow-[4px_4px_0_var(--border)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl border-3 border-border bg-primary flex items-center justify-center text-primary-foreground shadow-[2px_2px_0_var(--border)]">
            <Users size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">QUẢN LÝ NGƯỜI DÙNG & TÀI KHOẢN RBAC</h1>
            <p className="text-xs font-bold text-muted-foreground mt-0.5">
              Phân tách độc lập danh sách Ban Quản trị và Học viên, phục vụ phân quyền RBAC đa cấp.
            </p>
          </div>
        </div>

        {/* Stats Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 border-2 border-border bg-card text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0_var(--border)]">
            <Users size={14} className="text-primary" />
            <span>{stats.total} Người dùng</span>
          </div>
          <div className="px-3 py-1.5 border-2 border-border bg-rose-50 text-rose-950 text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0_var(--border)]">
            <ShieldAlert size={14} className="text-rose-600" />
            <span>{stats.adminCount} Ban Quản trị</span>
          </div>
          <div className="px-3 py-1.5 border-2 border-border bg-amber-50 text-amber-950 text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0_var(--border)]">
            <Crown size={14} className="text-amber-600" />
            <span>{stats.proCount} Gói Pro</span>
          </div>
        </div>
      </header>

      {error && (
        <div className="p-4 bg-rose-100 border-3 border-rose-400 text-rose-950 rounded-xl font-bold text-sm">
          {error}
        </div>
      )}

      {/* TABLE 1: DANH SÁCH QUẢN TRỊ VIÊN (ADMIN & STAFF) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b-3 border-border pb-2">
          <div className="flex items-center gap-2">
            <ShieldAlert size={20} className="text-rose-600" />
            <h2 className="text-lg font-black text-foreground">
              DANH SÁCH QUẢN TRỊ VIÊN & STAFF RBAC ({adminUsers.length})
            </h2>
          </div>
          <span className="text-xs font-bold text-muted-foreground">Tài khoản có quyền điều hành và quản trị hệ thống</span>
        </div>

        <div className="neo-card bg-card p-4 shadow-[4px_4px_0_var(--border)] border-3 border-border">
          <DataTable
            columns={createColumns(true)}
            data={adminUsers}
            searchPlaceholder="Tìm kiếm quản trị viên theo tên hoặc email..."
            searchFilter={searchFilter}
            isLoading={loading}
          />
        </div>
      </section>

      {/* TABLE 2: DANH SÁCH NGƯỜI HỌC (LEARNERS) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-3 border-border pb-2">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-primary" />
            <h2 className="text-lg font-black text-foreground">
              DANH SÁCH NGƯỜI HỌC & HỌC VIÊN ({learnerUsers.length})
            </h2>
          </div>

          {/* Learner Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={learnerFilter === 'all' ? 'primary' : 'ghost'}
              onClick={() => setLearnerFilter('all')}
              className="min-h-8 px-3 text-xs font-black"
            >
              Tất cả người học ({stats.learnerCount})
            </Button>
            <Button
              type="button"
              variant={learnerFilter === 'pro' ? 'primary' : 'ghost'}
              onClick={() => setLearnerFilter('pro')}
              className="min-h-8 px-3 text-xs font-black"
            >
              <Crown size={13} /> Gói Pro ({stats.proCount})
            </Button>
            <Button
              type="button"
              variant={learnerFilter === 'free' ? 'primary' : 'ghost'}
              onClick={() => setLearnerFilter('free')}
              className="min-h-8 px-3 text-xs font-black"
            >
              Gói Free ({stats.freeCount})
            </Button>
          </div>
        </div>

        <div className="neo-card bg-card p-4 shadow-[4px_4px_0_var(--border)] border-3 border-border">
          <DataTable
            columns={createColumns(false)}
            data={filteredLearnerUsers}
            searchPlaceholder="Tìm kiếm người học theo tên hoặc email..."
            searchFilter={searchFilter}
            isLoading={loading}
          />
        </div>
      </section>

      {/* ConfirmModal */}
      {confirmModal && (
        <ConfirmModal
          open={confirmModal.open}
          title={confirmModal.title}
          description={confirmModal.description}
          confirmLabel={confirmModal.confirmLabel}
          cancelLabel={confirmModal.cancelLabel}
          variant={confirmModal.variant ?? 'primary'}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  )
}
