import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Crown,
  KeyRound,
  Shield,
  ShieldAlert,
  Sparkles,
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

type UserFilterCategory = 'all' | 'admin' | 'pro' | 'free'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<UserFilterCategory>('all')

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

  // Stats calculation
  const stats = useMemo(() => {
    const total = users.length
    const adminCount = users.filter((u) => u.is_admin).length
    const proCount = users.filter((u) => u.subscriptions?.plan_type === 'pro').length
    const passLoginAdminCount = users.filter((u) => u.is_admin && u.allow_password_login).length
    return { total, adminCount, proCount, passLoginAdminCount }
  }, [users])

  // Filtered users list based on activeTab
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (activeTab === 'admin') return user.is_admin
      if (activeTab === 'pro') return user.subscriptions?.plan_type === 'pro'
      if (activeTab === 'free') return !user.subscriptions || user.subscriptions.plan_type === 'free'
      return true
    })
  }, [users, activeTab])

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
          await adminService.updateUserAdminStatus(userId, !currentAdminStatus)
          setUsers((prev) =>
            prev.map((u) =>
              u.id === userId
                ? { ...u, is_admin: !currentAdminStatus, allow_password_login: !currentAdminStatus ? false : u.allow_password_login }
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

  const columns = [
    {
      header: 'Người dùng',
      className: 'w-[28%]',
      accessor: (row: AdminUserProfile) => {
        const initial = row.display_name ? row.display_name[0].toUpperCase() : 'U'
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary border-2 border-border shadow-[2px_2px_0_var(--border)] flex items-center justify-center text-primary-foreground font-black text-sm shrink-0">
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
      className: 'w-[14%]',
      accessor: (row: AdminUserProfile) => {
        const plan = row.subscriptions?.plan_type ?? 'free'
        return plan === 'pro' ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 border-2 border-amber-400 text-xs font-black uppercase">
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
      className: 'w-[18%]',
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
      header: 'Vai trò & Quyền',
      className: 'w-[18%]',
      accessor: (row: AdminUserProfile) => {
        return (
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
            {row.is_admin && row.allow_password_login && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-400 text-[10px] font-black" title="Admin cho phép đăng nhập mật khẩu">
                <KeyRound size={11} className="text-emerald-700 shrink-0" />
                Mật khẩu
              </span>
            )}
          </div>
        )
      },
    },
    {
      header: 'Ngày gia nhập',
      className: 'w-[12%]',
      accessor: (row: AdminUserProfile) => {
        const date = new Date(row.created_at)
        return (
          <span className="text-xs font-bold text-muted-foreground">
            {date.toLocaleDateString('vi-VN')}
          </span>
        )
      },
    },
    {
      header: 'Thao tác',
      className: 'text-right w-[10%]',
      accessor: (row: AdminUserProfile) => {
        const isPro = row.subscriptions?.plan_type === 'pro'
        return (
          <div className="flex items-center justify-end gap-1.5">
            {/* Gói dịch vụ Button */}
            <Button
              asChild
              variant="ghost"
              className={`min-h-8 px-2.5 text-xs font-black ${
                isPro ? 'bg-amber-100 text-amber-900 border-amber-400 hover:bg-amber-200' : 'bg-card text-foreground hover:bg-muted'
              }`}
              title="Quản lý gói đăng ký"
            >
              <Link to={`/app/admin/subscriptions?user=${row.id}`}>
                <Crown size={14} className={isPro ? 'text-amber-600' : 'text-muted-foreground'} />
                <span>Gói</span>
              </Link>
            </Button>

            {/* Toggle Admin Button */}
            <Button
              type="button"
              variant={row.is_admin ? 'danger' : 'secondary'}
              disabled={actionLoading === row.id}
              onClick={() => handleToggleAdmin(row.id, Boolean(row.is_admin))}
              className="min-h-8 px-2.5 text-xs font-black"
              title={row.is_admin ? 'Gỡ quyền Admin' : 'Cấp quyền Admin'}
            >
              {actionLoading === row.id ? (
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : row.is_admin ? (
                <>
                  <UserX size={14} />
                  <span>Gỡ Admin</span>
                </>
              ) : (
                <>
                  <Shield size={14} />
                  <span>Cấp Admin</span>
                </>
              )}
            </Button>

            {/* Admin Password Login Toggle Button */}
            {row.is_admin && (
              <Button
                type="button"
                variant={row.allow_password_login ? 'secondary' : 'ghost'}
                disabled={actionLoading === row.id}
                onClick={() => handleToggleAdminPasswordLogin(row)}
                className="min-h-8 px-2.5 text-xs font-black"
                title={row.allow_password_login ? 'Tắt đăng nhập bằng mật khẩu' : 'Cho phép đăng nhập bằng mật khẩu'}
              >
                <KeyRound size={14} />
                <span>{row.allow_password_login ? 'Tắt mật khẩu' : 'Cho phép mật khẩu'}</span>
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  const searchFilter = (row: AdminUserProfile, query: string) => {
    const term = query.toLowerCase()
    const nameMatch = row.display_name ? row.display_name.toLowerCase().includes(term) : false
    const emailMatch = row.email ? row.email.toLowerCase().includes(term) : false
    return nameMatch || emailMatch
  }

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Top Banner / Header */}
      <header className="neo-card bg-card p-5 border-3 border-border shadow-[4px_4px_0_var(--border)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl border-3 border-border bg-primary flex items-center justify-center text-primary-foreground shadow-[2px_2px_0_var(--border)]">
            <Users size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">QUẢN LÝ NGƯỜI DÙNG & PHÂN QUYỀN</h1>
            <p className="text-xs font-bold text-muted-foreground mt-0.5">
              Danh sách tất cả tài khoản trong hệ thống, phân quyền Admin và quản lý phương thức đăng nhập.
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
            <span>{stats.adminCount} Admin</span>
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

      {/* Filter Tabs Bar */}
      <div className="neo-card bg-card p-4 shadow-[3px_3px_0_var(--border)] border-3 border-border flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={activeTab === 'all' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('all')}
            className="min-h-9 px-4 text-xs font-black"
          >
            Tất cả người dùng ({stats.total})
          </Button>
          <Button
            type="button"
            variant={activeTab === 'admin' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('admin')}
            className="min-h-9 px-4 text-xs font-black"
          >
            <ShieldAlert size={14} /> Admin ({stats.adminCount})
          </Button>
          <Button
            type="button"
            variant={activeTab === 'pro' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('pro')}
            className="min-h-9 px-4 text-xs font-black"
          >
            <Crown size={14} /> Gói Pro ({stats.proCount})
          </Button>
          <Button
            type="button"
            variant={activeTab === 'free' ? 'primary' : 'ghost'}
            onClick={() => setActiveTab('free')}
            className="min-h-9 px-4 text-xs font-black"
          >
            Gói Free ({stats.total - stats.proCount})
          </Button>
        </div>

        <div className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
          <Sparkles size={14} className="text-primary" />
          <span>Đang hiển thị {filteredUsers.length} tài khoản</span>
        </div>
      </div>

      {/* Users DataTable */}
      <div className="neo-card bg-card p-5 shadow-[4px_4px_0_var(--border)] border-3 border-border">
        <DataTable
          columns={columns}
          data={filteredUsers}
          searchPlaceholder="Tìm kiếm theo tên hoặc email người dùng..."
          searchFilter={searchFilter}
          isLoading={loading}
        />
      </div>

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
