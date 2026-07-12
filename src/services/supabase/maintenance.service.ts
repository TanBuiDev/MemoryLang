import { supabase } from '@/services/supabase/client'

export interface MaintenanceStatus {
  enabled: boolean
  message: string
  estimated_end: string | null
}

const DEFAULT_STATUS: MaintenanceStatus = {
  enabled: false,
  message: '',
  estimated_end: null,
}

export const maintenanceService = {
  /**
   * Lấy trạng thái bảo trì hiện tại.
   * Gọi được bởi cả anonymous và authenticated users (RLS cho phép anon đọc key 'maintenance_mode').
   */
  async getStatus(): Promise<MaintenanceStatus> {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .single()

      if (error || !data?.value) return DEFAULT_STATUS

      const value = data.value as Record<string, unknown>
      return {
        enabled: Boolean(value.enabled),
        message: typeof value.message === 'string' ? value.message : '',
        estimated_end: typeof value.estimated_end === 'string' ? value.estimated_end : null,
      }
    } catch {
      // Nếu không thể check (mất mạng, etc.) → cho qua, không chặn user
      return DEFAULT_STATUS
    }
  },
}
