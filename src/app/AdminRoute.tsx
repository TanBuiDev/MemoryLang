import { Navigate, Outlet } from 'react-router-dom'
import { AppLoading } from '@/components/common/AppLoading'
import { useAuthStore } from '@/stores/useAuthStore'

export function AdminRoute() {
  const { profile, loading } = useAuthStore()

  if (loading) return <AppLoading />
  if (!profile || !profile.is_admin) {
    // Chuyển hướng người dùng thông thường về dashboard chính
    return <Navigate to="/app/dashboard" replace />
  }

  return <Outlet />
}
