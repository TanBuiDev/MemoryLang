import { useEffect, useState } from 'react'
import { Bell, Plus, Send, ToggleLeft, Trash2 } from 'lucide-react'
import { adminService } from '@/services/supabase/admin.service'
import { notificationService } from '@/services/supabase/notification.service'
import type { Notification, NotificationType, NotificationPriority, NotificationTarget } from '@/types/notification.types'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ConfirmModal } from '@/components/ui/confirm-modal'

const typeOptions: { value: NotificationType; label: string }[] = [
  { value: 'announcement', label: '📢 Thông báo chung' },
  { value: 'update', label: '🚀 Cập nhật tính năng' },
  { value: 'maintenance', label: '🔧 Bảo trì hệ thống' },
  { value: 'alert', label: '⚠️ Cảnh báo' },
]

const priorityOptions: { value: NotificationPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Thấp', color: 'bg-slate-100 text-slate-800 border-slate-300' },
  { value: 'normal', label: 'Bình thường', color: 'bg-blue-100 text-blue-900 border-blue-300' },
  { value: 'high', label: 'Cao', color: 'bg-amber-100 text-amber-900 border-amber-300' },
  { value: 'urgent', label: 'Khẩn cấp', color: 'bg-rose-100 text-rose-900 border-rose-300' },
]

const targetOptions: { value: NotificationTarget; label: string }[] = [
  { value: 'all', label: 'Tất cả người dùng' },
  { value: 'admins', label: 'Chỉ admin' },
]

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState<NotificationType>('announcement')
  const [priority, setPriority] = useState<NotificationPriority>('normal')
  const [target, setTarget] = useState<NotificationTarget>('all')
  const [expiresAt, setExpiresAt] = useState('')

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const data = await notificationService.getAll()
      setNotifications(data)
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách thông báo')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadNotifications()
  }, [])

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      setError('Vui lòng nhập tiêu đề và nội dung thông báo.')
      return
    }

    try {
      setSending(true)
      setError(null)
      const adminId = await adminService.getCurrentAdminId()
      if (!adminId) throw new Error('Không xác định được admin')

      const created = await notificationService.create(
        {
          type,
          title: title.trim(),
          message: message.trim(),
          priority,
          target,
          expires_at: expiresAt || null,
        },
        adminId,
      )

      await adminService.logAction('create_notification', 'notification', created.id, {
        title: created.title,
        type: created.type,
        priority: created.priority,
        target: created.target,
      })

      setNotifications((prev) => [created, ...prev])
      // Reset form
      setTitle('')
      setMessage('')
      setType('announcement')
      setPriority('normal')
      setTarget('all')
      setExpiresAt('')
    } catch (err: any) {
      setError(err.message || 'Lỗi khi gửi thông báo')
    } finally {
      setSending(false)
    }
  }

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      setError(null)
      await notificationService.toggleActive(id, !currentActive)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_active: !currentActive } : n)),
      )
    } catch (err: any) {
      setError(err.message || 'Lỗi khi cập nhật trạng thái')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setError(null)
      await notificationService.remove(id)
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    } catch (err: any) {
      setError(err.message || 'Lỗi khi xóa thông báo')
    } finally {
      setPendingDeleteId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-200 rounded-xl border-2 border-slate-900 flex items-center justify-center text-slate-900 shrink-0 shadow-[2px_2px_0px_0px_#000]">
          <Bell className="w-5 h-5 text-blue-700" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">QUẢN LÝ THÔNG BÁO</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-bold">
            Tạo và quản lý thông báo hệ thống gửi đến người dùng (Realtime).
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-100 border-2 border-slate-900 text-rose-900 rounded-xl font-bold text-xs sm:text-sm shadow-[2px_2px_0px_0px_#000]">
          {error}
        </div>
      )}

      {/* Create notification form */}
      <div className="neo-card p-5 border-3 border-slate-900 bg-white shadow-[5px_5px_0px_0px_#000] rounded-2xl flex flex-col gap-4">
        <h2 className="text-base font-black text-slate-900 flex items-center gap-2 border-b-2 border-slate-900 pb-2">
          <Plus size={20} className="text-blue-600" />
          <span>TẠO THÔNG BÁO MỚI</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
              Tiêu đề *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Tính năng mới: Luyện nghe TOEIC"
              className="w-full p-2.5 text-xs sm:text-sm font-bold border-2 border-slate-900 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                Loại
              </label>
              <Select
                value={type}
                onChange={(val) => setType(val as NotificationType)}
                options={typeOptions}
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                Độ ưu tiên
              </label>
              <Select
                value={priority}
                onChange={(val) => setPriority(val as NotificationPriority)}
                options={priorityOptions}
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                Đối tượng
              </label>
              <Select
                value={target}
                onChange={(val) => setTarget(val as NotificationTarget)}
                options={targetOptions}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
            Nội dung thông báo *
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Nội dung chi tiết của thông báo..."
            rows={3}
            className="w-full p-2.5 text-xs sm:text-sm font-bold border-2 border-slate-900 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-4 pt-1">
          <div className="flex-1 max-w-xs">
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
              Hết hạn (tùy chọn)
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full p-2.5 text-xs font-bold border-2 border-slate-900 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <Button
            type="button"
            onClick={handleSend}
            disabled={sending || !title.trim() || !message.trim()}
            className="neo-button min-h-0 px-5 py-2.5 h-10 rounded-xl bg-[#432dd7] text-white text-xs sm:text-sm font-black border-2 border-slate-900 shadow-[3px_3px_0px_0px_#000] active:neo-button-active hover:bg-[#321fb0] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send size={16} />
            )}
            <span>Gửi thông báo</span>
          </Button>
        </div>
      </div>

      {/* Notifications list */}
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-black flex items-center gap-2 border-b-2 border-slate-900 pb-2 text-slate-900">
          <Bell size={18} className="text-blue-600" />
          <span>DANH SÁCH THÔNG BÁO ({notifications.length})</span>
        </h2>

        {loading ? (
          <div className="text-center font-bold text-slate-500 py-10">
            Đang tải thông báo...
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center font-bold text-slate-500 py-10">
            Chưa có thông báo nào.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {notifications.map((notif) => {
              const priorityStyle = priorityOptions.find((p) => p.value === notif.priority)
              const isExpired = notif.expires_at && new Date(notif.expires_at) < new Date()
              return (
                <div
                  key={notif.id}
                  className={`neo-card p-4 border-2 border-slate-900 bg-white rounded-xl shadow-[3px_3px_0px_0px_#000] flex items-start justify-between gap-4 ${!notif.is_active || isExpired ? 'opacity-60 bg-slate-50' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <h3 className="font-black text-sm text-slate-900">{notif.title}</h3>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border border-slate-900 shadow-[1px_1px_0px_0px_#000] ${priorityStyle?.color || ''}`}>
                        {priorityStyle?.label}
                      </span>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-900">
                        {typeOptions.find((t) => t.value === notif.type)?.label}
                      </span>
                      {!notif.is_active && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-slate-900">
                          ĐÃ TẮT
                        </span>
                      )}
                      {isExpired && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 border border-slate-900">
                          HẾT HẠN
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 font-semibold line-clamp-2">{notif.message}</p>
                    <p className="text-[10px] text-slate-500 font-bold mt-1.5">
                      {new Date(notif.created_at).toLocaleString()} · {notif.target === 'all' ? 'Tất cả' : 'Chỉ admin'}
                      {notif.expires_at && ` · Hết hạn: ${new Date(notif.expires_at).toLocaleString()}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleToggle(notif.id, notif.is_active)}
                      className="neo-button p-1.5 h-8 w-8 min-h-0 rounded-lg border-2 border-slate-900 bg-white shadow-[1.5px_1.5px_0px_0px_#000] hover:bg-slate-100 cursor-pointer"
                      title={notif.is_active ? 'Tắt thông báo' : 'Bật lại thông báo'}
                    >
                      <ToggleLeft size={16} className={notif.is_active ? 'text-emerald-600' : 'text-slate-400'} />
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => setPendingDeleteId(notif.id)}
                      className="neo-button p-1.5 h-8 w-8 min-h-0 rounded-lg border-2 border-slate-900 bg-rose-500 text-white shadow-[1.5px_1.5px_0px_0px_#000] hover:bg-rose-600 cursor-pointer"
                      title="Xóa thông báo"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!pendingDeleteId}
        onConfirm={() => pendingDeleteId && handleDelete(pendingDeleteId)}
        onCancel={() => setPendingDeleteId(null)}
        title="Xóa thông báo?"
        description="Xóa thông báo này? Hành động này không thể hoàn tác."
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        variant="danger"
      />
    </div>
  )
}
