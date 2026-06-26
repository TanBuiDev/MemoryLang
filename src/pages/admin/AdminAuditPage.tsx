import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { adminService } from '@/services/supabase/admin.service'
import { DataTable } from '@/components/admin/DataTable'
import type { AdminAuditLog } from '@/types/admin.types'

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadLogs = async () => {
    try {
      setLoading(true)
      const data = await adminService.listAuditLogs()
      setLogs(data)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Không thể tải lịch sử thao tác admin')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadLogs()
  }, [])

  const columns = [
    {
      header: 'Thời gian',
      accessor: (row: AdminAuditLog) => {
        const date = new Date(row.created_at)
        return <span className="text-xs font-mono font-bold text-muted-foreground">{date.toLocaleString('vi-VN')}</span>
      },
    },
    {
      header: 'Admin Email',
      accessor: (row: AdminAuditLog) => <span className="font-black text-xs text-foreground">{row.admin_email}</span>,
    },
    {
      header: 'Hành động',
      accessor: (row: AdminAuditLog) => (
        <span className="px-2 py-0.5 rounded bg-muted border border-border text-foreground text-xs font-mono font-black uppercase">
          {row.action}
        </span>
      ),
    },
    {
      header: 'Đối tượng tác động',
      accessor: (row: AdminAuditLog) => (
        <div className="flex gap-2 items-center text-xs">
          {row.target_type && (
            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 uppercase font-black text-[10px]">
              {row.target_type}
            </span>
          )}
          {row.target_id && (
            <code className="text-[10px] bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-muted-foreground truncate max-w-[120px]">
              {row.target_id}
            </code>
          )}
        </div>
      ),
    },
    {
      header: 'Chi tiết hành động',
      accessor: (row: AdminAuditLog) => {
        const details = typeof row.details === 'object' ? JSON.stringify(row.details) : String(row.details)
        return <span className="text-xs font-mono text-muted-foreground truncate max-w-xs block font-semibold">{details}</span>
      },
    },
  ]

  const searchFilter = (row: AdminAuditLog, query: string) => {
    const term = query.toLowerCase()
    return (
      row.action.toLowerCase().includes(term) ||
      (row.admin_email || '').toLowerCase().includes(term) ||
      (row.target_type || '').toLowerCase().includes(term)
    );
  }

  const toolbarActions = (
    <button
      onClick={loadLogs}
      className="neo-button min-h-0 p-2 rounded-md border-2 border-border bg-card hover:bg-muted active:neo-button-active transition-all"
      title="Làm mới"
    >
      <RefreshCw size={14} />
    </button>
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">LỊCH SỬ THAO TÁC (AUDIT LOGS)</h1>
        <p className="text-muted-foreground font-bold">
          Nhật ký hoạt động bảo mật lưu lại mọi thao tác thay đổi cấu hình, người dùng hoặc nội dung của Admin.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-100 border-2 border-rose-400 text-rose-900 rounded-md font-bold text-sm">
          {error}
        </div>
      )}

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={logs}
        searchPlaceholder="Tìm kiếm theo hành động, admin..."
        searchFilter={searchFilter}
        isLoading={loading}
        actions={toolbarActions}
      />
    </div>
  )
}
