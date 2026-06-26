import { useEffect, useState } from 'react'
import { Shield, ShieldAlert, User, UserX } from 'lucide-react'
import { adminService } from '@/services/supabase/admin.service'
import { DataTable } from '@/components/admin/DataTable'
import type { Profile } from '@/types/auth.types'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

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

  const handleToggleAdmin = async (userId: string, currentAdminStatus: boolean) => {
    if (actionLoading) return
    const message = currentAdminStatus
      ? 'Bạn có chắc chắn muốn gỡ quyền Admin của người dùng này không?'
      : 'Bạn có chắc chắn muốn cấp quyền Admin cho người dùng này không?'
    
    if (!window.confirm(message)) return

    try {
      setActionLoading(userId)
      await adminService.updateUserAdminStatus(userId, !currentAdminStatus)
      // Cập nhật state local
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_admin: !currentAdminStatus } : u))
      )
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Không thể thay đổi quyền quản trị')
    } finally {
      setActionLoading(null)
    }
  }

  // Định nghĩa các cột hiển thị
  const columns = [
    {
      header: 'Người dùng',
      className: 'w-[30%]',
      accessor: (row: Profile) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-muted border-2 border-border flex items-center justify-center text-muted-foreground font-black">
            {row.display_name ? row.display_name[0].toUpperCase() : 'U'}
          </div>
          <div>
            <div className="font-black text-foreground text-sm">{row.display_name || 'Chưa đặt tên'}</div>
            <div className="text-xs text-muted-foreground font-bold">{row.email || 'demo@memorylang.app'}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Ngôn ngữ học',
      className: 'w-[20%]',
      accessor: (row: Profile) => (
        <div className="flex items-center gap-1.5 text-xs font-black">
          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300 uppercase">
            {row.native_language}
          </span>
          <span>→</span>
          <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-300 uppercase">
            {row.current_target_language}
          </span>
        </div>
      ),
    },
    {
      header: 'Vai trò',
      className: 'w-[15%]',
      accessor: (row: Profile) => {
        return row.is_admin ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-100 text-rose-800 border border-rose-300 text-xs font-black uppercase">
            <ShieldAlert size={12} />
            Admin
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 text-slate-800 border border-slate-300 text-xs font-black uppercase">
            <User size={12} />
            User
          </span>
        )
      },
    },
    {
      header: 'Ngày tham gia',
      className: 'w-[15%]',
      accessor: (row: Profile) => {
        const date = new Date(row.created_at)
        return <span className="text-xs font-bold text-muted-foreground">{date.toLocaleDateString('vi-VN')}</span>
      },
    },
    {
      header: 'Thao tác',
      className: 'text-center w-[20%]',
      accessor: (row: Profile) => (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => handleToggleAdmin(row.id, Boolean(row.is_admin))}
            disabled={actionLoading === row.id}
            className={`neo-button min-h-0 px-2.5 py-1.5 rounded-md border-2 border-border text-xs font-black flex items-center gap-1.5 transition-all ${
              row.is_admin
                ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                : 'bg-[#fdc800] text-foreground hover:bg-[#e0b000]'
            }`}
          >
            {actionLoading === row.id ? (
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : row.is_admin ? (
              <>
                <UserX size={14} />
                Gỡ Admin
              </>
            ) : (
              <>
                <Shield size={14} />
                Cấp Admin
              </>
            )}
          </button>
        </div>
      ),
    },
  ]

  // Hàm filter tìm kiếm
  const searchFilter = (row: Profile, query: string) => {
    const term = query.toLowerCase()
    const nameMatch = row.display_name ? row.display_name.toLowerCase().includes(term) : false
    const emailMatch = row.email ? row.email.toLowerCase().includes(term) : false
    return nameMatch || emailMatch
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">QUẢN LÝ NGƯỜI DÙNG</h1>
        <p className="text-muted-foreground font-bold">Danh sách tất cả người dùng trong hệ thống và phân quyền.</p>
      </div>

      {error && (
        <div className="p-4 bg-rose-100 border-2 border-rose-400 text-rose-900 rounded-md font-bold text-sm">
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
    </div>
  )
}
