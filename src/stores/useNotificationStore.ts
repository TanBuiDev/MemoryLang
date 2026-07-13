import { create } from 'zustand'
import { notificationService } from '@/services/supabase/notification.service'
import type { Notification } from '@/types/notification.types'

interface NotificationState {
  notifications: Notification[]
  readIds: Set<string>
  isLoaded: boolean

  loadNotifications: (userId: string) => Promise<void>
  addNotification: (notification: Notification) => void
  updateNotification: (notification: Notification) => void
  markAsRead: (userId: string, notificationId: string) => Promise<void>
  markAllAsRead: (userId: string) => Promise<void>
  reset: () => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  readIds: new Set<string>(),
  isLoaded: false,

  async loadNotifications(userId: string) {
    try {
      const [notifications, readIds] = await Promise.all([
        notificationService.getActive(),
        notificationService.getReadIds(userId),
      ])
      set({ notifications, readIds, isLoaded: true })
    } catch (error) {
      console.error('Failed to load notifications:', error)
      set({ isLoaded: true })
    }
  },

  addNotification(notification: Notification) {
    set((state) => {
      // Tránh trùng lặp nếu đã có
      if (state.notifications.some((n) => n.id === notification.id)) return state
      return { notifications: [notification, ...state.notifications] }
    })
  },

  updateNotification(notification: Notification) {
    set((state) => {
      // Nếu thông báo bị deactivate → xóa khỏi danh sách
      if (!notification.is_active) {
        return {
          notifications: state.notifications.filter((n) => n.id !== notification.id),
        }
      }
      return {
        notifications: state.notifications.map((n) =>
          n.id === notification.id ? notification : n,
        ),
      }
    })
  },

  async markAsRead(userId: string, notificationId: string) {
    const { readIds } = get()
    if (readIds.has(notificationId)) return

    // Optimistic update
    set((state) => ({
      readIds: new Set([...state.readIds, notificationId]),
    }))

    try {
      await notificationService.markAsRead(userId, notificationId)
    } catch (error) {
      console.error('Failed to mark as read:', error)
      // Rollback
      set((state) => {
        const newReadIds = new Set(state.readIds)
        newReadIds.delete(notificationId)
        return { readIds: newReadIds }
      })
    }
  },

  async markAllAsRead(userId: string) {
    const { notifications, readIds } = get()
    const unreadIds = notifications
      .filter((n) => !readIds.has(n.id))
      .map((n) => n.id)

    if (unreadIds.length === 0) return

    // Optimistic update
    set((state) => ({
      readIds: new Set([...state.readIds, ...unreadIds]),
    }))

    try {
      await notificationService.markAllAsRead(userId, unreadIds)
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  },

  reset() {
    set({ notifications: [], readIds: new Set(), isLoaded: false })
  },
}))

/**
 * Selector tiện ích: số thông báo chưa đọc.
 */
export function useUnreadCount(): number {
  const notifications = useNotificationStore((s) => s.notifications)
  const readIds = useNotificationStore((s) => s.readIds)
  return notifications.filter((n) => !readIds.has(n.id)).length
}
