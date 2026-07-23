import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Shield, ShieldAlert, User, UserX, Crown, Users } from 'lucide-react'
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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // ConfirmModal state
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    title: string
    description: string
    confirmLabel?: string
    cancelLabel?: string
    onConfirm: () => void
  } | null>(null)

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await adminService.listUsers()
      setUsers(data)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Không thể tải danh sách người dùng')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  const handleToggleAdmin = (userId: string, currentAdminStatus: boolean) => {
    if (actionLoading) return

    setConfirmModal({
      open: true,
      title: currentAdminStatus ? 'Gỡ quyền Admin' : 'Cấp quyền Admin',
      description: currentAdminStatus
        ? 'Bạn có chắc chắn muốn gỡ quyền Admin của người dùng này không?'
        : 'Bạn có chắc chắn muốn cấp quyền Admin cho người dùng này không?',
      confirmLabel: 'Xác nhận',
      cancelLabel: 'Hủy',
      onConfirm: async () => {
        setConfirmModal(null)
        try {
          setActionLoading(userId)
          await adminService.updateUserAdminStatus(userId, !currentAdminStatus)
          setUsers((prev) =>
            prev.map((u) => (u.id === userId ? { ...u, is_admin: !currentAdminStatus } : u))
          )
        } catch (err: any) {
          console.error(err)
          setError(err.message || 'Không thể thay đổi quyền quản trị')
        } finally {
          setActionLoading(null)
        }
      },
    })
  }

  const columns = [
    {
      header: 'Người dùng',
      className: 'w-[30%]',
      accessor: (row: AdminUserProfile) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#fdc800] border-2 border-slate-900 shadow-[1.5px_1.5px_0px_0px_#000] flex items-center justify-center text-slate-900 font-black shrink-0">
            {row.display_name ? row.display_name[0].toUpperCase() : 'U'}
          </div>
          <div className="min-w-0">
            <div className="font-black text-slate-900 text-xs sm:text-sm truncate">{row.display_name || 'Chưa đặt tên'}</div>
            <div className="text-[11px] text-slate-500 font-bold truncate">{row.email || 'demo@memorylang.app'}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Gói dịch vụ',
      className: 'w-[15%]',
      accessor: (row: AdminUserProfile) => {
        const plan = row.subscriptions?.plan_type ?? 'free'
        return plan === 'pro' ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-slate-900 text-[10px] font-black uppercase shadow-[1px_1px_0px_0px_#000]">
            <Crown size={12} className="text-amber-600 shrink-0" />
            Pro
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-900 text-[10px] font-black uppercase shadow-[1px_1px_0px_0px_#000]">
            Free
          </span>
        )
      },
    },
    {
      header: 'Ngôn ngữ học',
      className: 'w-[20%]',
      accessor: (row: AdminUserProfile) => (
        <div className="flex items-center gap-1 text-[11px] font-black">
          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 border border-slate-900 uppercase">
            {row.native_language}
          </span>
          <span>→</span>
          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-slate-900 uppercase">
            {row.current_target_language}
          </span>
        </div>
      ),
    },
    {
      header: 'Vai trò',
      className: 'w-[15%]',
      accessor: (row: AdminUserProfile) => {
        return row.is_admin ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-100 text-rose-900 border border-slate-900 text-[10px] font-black uppercase shadow-[1px_1px_0px_0px_#000]">
            <ShieldAlert size={12} className="text-rose-700" />
            Admin
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-900 text-[10px] font-black uppercase shadow-[1px_1px_0px_0px_#000]">
            <User size={12} />
            User
          </span>
        )
      },
    },
    {
      header: 'Ngày tham gia',
      className: 'w-[15%]',
      accessor: (row: AdminUserProfile) => {
        const date = new Date(row.created_at)
        return <span className="text-xs font-bold text-slate-600">{date.toLocaleDateString('vi-VN')}</span>
      },
    },
    {
      header: 'Thao tác',
      className: 'text-center w-[20%]',
      accessor: (row: AdminUserProfile) => {
        const isPro = row.subscriptions?.plan_type === 'pro'
        return (
          <div className="flex justify-center gap-2">
            <Button
              asChild
              variant="ghost"
              className={`neo-button min-h-0 px-2.5 py-1 h-8 rounded-lg border-2 border-slate-900 text-xs font-black flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_#000] cursor-pointer ${
                isPro ? 'bg-amber-100 text-amber-900 hover:bg-amber-200' : 'bg-[#fdc800] hover:bg-amber-300 text-slate-900'
              }`}
            >
              <Link to={`/app/admin/subscriptions?user=${row.id}`}>
                <Crown size={14} />
                <span>Gói</span>
              </Link>
            </Button>

            <Button
              type="button"
              variant={row.is_admin ? 'danger' : 'secondary'}
              disabled={actionLoading === row.id}
              onClick={() => handleToggleAdmin(row.id, Boolean(row.is_admin))}
              className="neo-button min-h-0 px-2.5 py-1 h-8 rounded-lg border-2 border-slate-900 text-xs font-black flex items-center gap-1.5 shadow-[1.5px_1.5px_0px_0px_#000] cursor-pointer"
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
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-amber-200 rounded-xl border-2 border-slate-900 flex items-center justify-center text-slate-900 shrink-0 shadow-[2px_2px_0px_0px_#000]">
          <Users className="w-5 h-5 text-slate-900" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">QUẢN LÝ NGƯỜI DÙNG</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-bold">Danh sách tất cả tài khoản trong hệ thống và phân quyền quản trị.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-100 border-2 border-slate-900 text-rose-900 rounded-xl font-bold text-xs sm:text-sm shadow-[2px_2px_0px_0px_#000]">
          {error}
        </div>
      )}

      {/* Users DataTable */}
      <DataTable
        columns={columns}
        data={users}
        searchPlaceholder="Tìm kiếm theo tên hoặc email..."
        searchFilter={searchFilter}
        isLoading={loading}
      />

      {/* ConfirmModal */}
      {confirmModal && (
        <ConfirmModal
          open={confirmModal.open}
          title={confirmModal.title}
          description={confirmModal.description}
          confirmLabel={confirmModal.confirmLabel}
          cancelLabel={confirmModal.cancelLabel}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
          variant="primary"
        />
      )}
    </div>
  )
}
