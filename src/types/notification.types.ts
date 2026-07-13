export type NotificationType = 'announcement' | 'maintenance' | 'update' | 'alert'
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'
export type NotificationTarget = 'all' | 'admins'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  priority: NotificationPriority
  target: NotificationTarget
  created_by: string | null
  expires_at: string | null
  is_active: boolean
  created_at: string
}

export interface CreateNotificationInput {
  type: NotificationType
  title: string
  message: string
  priority: NotificationPriority
  target: NotificationTarget
  expires_at?: string | null
}
