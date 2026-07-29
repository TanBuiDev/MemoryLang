import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { maintenanceService } from '@/services/supabase/maintenance.service'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'
import { MaintenancePage } from '@/pages/public/MaintenancePage'
import { usePermissions } from '@/hooks/usePermissions'

interface MaintenanceGuardProps {
  children: ReactNode
}

/**
 * Kiểm tra trạng thái bảo trì trước khi render app.
 * - Nếu maintenance mode bật → hiển thị MaintenancePage (trừ admin).
 * - Nếu tắt hoặc không thể check → render children bình thường.
 * - Demo mode (không có Supabase) → bỏ qua check.
 */
export function MaintenanceGuard({ children }: MaintenanceGuardProps) {
  const profile = useAuthStore((state) => state.profile)
  const { loading: permissionsLoading, hasPermission } = usePermissions()

  const { data: status } = useQuery({
    queryKey: ['maintenance-status'],
    queryFn: () => maintenanceService.getStatus(),
    // Check mỗi 30 giây để phản hồi nhanh khi admin bật/tắt
    staleTime: 30_000,
    refetchInterval: 30_000,
    // Không block render khi đang check
    placeholderData: { enabled: false, message: '', estimated_end: null },
    // Chỉ check khi có Supabase config
    enabled: isSupabaseConfigured,
  })

  // Các đường dẫn auth được phép bypass để admin có thể đăng nhập
  const bypassPaths = ['/login', '/forgot-password', '/create-password']
  const isBypassPath = bypassPaths.includes(window.location.pathname)

  const hasAdminPermission = hasPermission('exam.read')
    || hasPermission('user.read.basic')
    || hasPermission('role.read')
  const canBypassMaintenance = Boolean(profile?.is_admin) || hasAdminPermission

  // Chờ permission summary trước khi chặn để admin RBAC không bị mắc kẹt
  // ở màn hình bảo trì sau khi đăng nhập.
  if (status?.enabled && !permissionsLoading && !canBypassMaintenance && !isBypassPath) {
    return (
      <MaintenancePage
        message={status.message}
        estimatedEnd={status.estimated_end}
      />
    )
  }

  return children
}
