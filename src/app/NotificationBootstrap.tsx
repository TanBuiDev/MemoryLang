import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { notificationService } from '@/services/supabase/notification.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useNotificationStore } from '@/stores/useNotificationStore'
import { showToast } from '@/components/ui/toast'
import type { Notification } from '@/types/notification.types'
import type { RealtimeChannel } from '@supabase/supabase-js'

const typeToToastType = {
  announcement: 'info' as const,
  maintenance: 'warning' as const,
  update: 'success' as const,
  alert: 'error' as const,
}

/**
 * Bootstrap component cho notification system.
 * - Load notifications khi user đăng nhập
 * - Subscribe Supabase Realtime cho thông báo mới
 * - Hiển thị toast khi có thông báo mới (trừ khi đang trong session học/quiz)
 */
export function NotificationBootstrap() {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  const locationRef = useRef(location)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const loadNotifications = useNotificationStore((s) => s.loadNotifications)
  const addNotification = useNotificationStore((s) => s.addNotification)
  const updateNotification = useNotificationStore((s) => s.updateNotification)
  const reset = useNotificationStore((s) => s.reset)

  // Luôn cập nhật ref location để callback Realtime dùng được giá trị mới nhất
  useEffect(() => {
    locationRef.current = location
  }, [location])

  useEffect(() => {
    if (!isSupabaseConfigured || !user) {
      reset()
      return
    }

    // Load notifications ban đầu
    void loadNotifications(user.id)

    // Subscribe Realtime
    const handleInsert = (notification: Notification) => {
      addNotification(notification)

      // Suppress toast khi đang trong session học/quiz
      const currentPath = locationRef.current.pathname
      const isInSession = currentPath.includes('/session/')
      if (!isInSession) {
        showToast({
          type: typeToToastType[notification.type] || 'info',
          title: notification.title,
          message: notification.message,
          duration: notification.priority === 'urgent' ? 10000 : 5000,
        })
      }
    }

    const handleUpdate = (notification: Notification) => {
      const isAlreadyInList = useNotificationStore.getState().notifications.some(
        (n) => n.id === notification.id
      )

      updateNotification(notification)

      // Nếu thông báo hoạt động trở lại và trước đó không nằm trong danh sách (đã bị tắt)
      if (notification.is_active && !isAlreadyInList) {
        // Xóa trạng thái đã đọc cũ trong store để chuyển nó thành chưa đọc
        useNotificationStore.setState((state) => {
          const newReadIds = new Set(state.readIds)
          newReadIds.delete(notification.id)
          return { readIds: newReadIds }
        })

        // Hiện toast thông báo cho người dùng
        const currentPath = locationRef.current.pathname
        const isInSession = currentPath.includes('/session/')
        if (!isInSession) {
          showToast({
            type: typeToToastType[notification.type] || 'info',
            title: notification.title,
            message: notification.message,
            duration: notification.priority === 'urgent' ? 10000 : 5000,
          })
        }
      }
    }

    channelRef.current = notificationService.subscribeRealtime(handleInsert, handleUpdate)

    return () => {
      if (channelRef.current) {
        notificationService.unsubscribe(channelRef.current)
        channelRef.current = null
      }
    }
  }, [user, loadNotifications, addNotification, updateNotification, reset])

  return null
}
