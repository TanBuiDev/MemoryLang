import { Navigate, Outlet } from 'react-router-dom'
import { AppLoading } from '@/components/common/AppLoading'
import { useAuthStore } from '@/stores/useAuthStore'
import { usePermissions } from '@/hooks/usePermissions'

export function AdminRoute() {
  const { loading } = useAuthStore()
  const { loading: permissionsLoading, hasPermission } = usePermissions()

  if (loading || permissionsLoading) return <AppLoading />
  if (!hasPermission('exam.read') && !hasPermission('user.read.basic') && !hasPermission('role.read')) {
    // Chuyển hướng người dùng thông thường về dashboard chính
    return <Navigate to="/app/dashboard" replace />
  }

  return <Outlet />
}
