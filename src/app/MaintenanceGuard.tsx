import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { maintenanceService } from '@/services/supabase/maintenance.service'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'
import { MaintenancePage } from '@/pages/public/MaintenancePage'

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

  // Maintenance mode đang bật VÀ user hiện tại KHÔNG phải admin → chặn
  if (status?.enabled && !profile?.is_admin) {
    return (
      <MaintenancePage
        message={status.message}
        estimatedEnd={status.estimated_end}
      />
    )
  }

  return children
}
