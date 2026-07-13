import { supabase } from '@/services/supabase/client'
import type { Notification, CreateNotificationInput } from '@/types/notification.types'
import type { RealtimeChannel } from '@supabase/supabase-js'

export const notificationService = {
  /**
   * Lấy danh sách thông báo active, chưa hết hạn.
   * RLS đã filter is_active = true AND expires_at chưa qua.
   */
  async getActive(): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return (data ?? []) as Notification[]
  },

  /**
   * Lấy danh sách notification_id mà user đã đọc.
   */
  async getReadIds(userId: string): Promise<Set<string>> {
    const { data, error } = await supabase
      .from('user_notification_reads')
      .select('notification_id')
      .eq('user_id', userId)

    if (error) throw error
    return new Set((data ?? []).map((r) => r.notification_id))
  },

  /**
   * Đánh dấu một thông báo đã đọc.
   */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('user_notification_reads')
      .upsert({ user_id: userId, notification_id: notificationId })

    if (error) throw error
  },

  /**
   * Đánh dấu tất cả thông báo hiện tại đã đọc.
   */
  async markAllAsRead(userId: string, notificationIds: string[]): Promise<void> {
    if (notificationIds.length === 0) return

    const rows = notificationIds.map((notification_id) => ({
      user_id: userId,
      notification_id,
    }))

    const { error } = await supabase
      .from('user_notification_reads')
      .upsert(rows)

    if (error) throw error
  },

  // --- Admin methods ---

  /**
   * (Admin) Tạo thông báo mới.
   */
  async create(input: CreateNotificationInput, adminId: string): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        ...input,
        created_by: adminId,
        expires_at: input.expires_at || null,
      })
      .select('*')
      .single()

    if (error) throw error
    return data as Notification
  },

  /**
   * (Admin) Lấy tất cả thông báo (kể cả inactive) để quản lý.
   */
  async getAll(): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error
    return (data ?? []) as Notification[]
  },

  /**
   * (Admin) Bật/tắt thông báo.
   */
  async toggleActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_active: isActive })
      .eq('id', id)

    if (error) throw error
  },

  /**
   * (Admin) Xóa thông báo.
   */
  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // --- Realtime ---

  /**
   * Subscribe Supabase Realtime channel cho thông báo mới.
   * Trả về channel để cleanup khi unmount.
   */
  subscribeRealtime(
    onInsert: (notification: Notification) => void,
    onUpdate?: (notification: Notification) => void,
  ): RealtimeChannel {
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          onInsert(payload.new as Notification)
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        (payload) => {
          onUpdate?.(payload.new as Notification)
        },
      )
      .subscribe()

    return channel
  },

  /**
   * Unsubscribe Realtime channel.
   */
  unsubscribe(channel: RealtimeChannel): void {
    void supabase.removeChannel(channel)
  },
}
