import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { AppLoading } from '@/components/common/AppLoading'
import { useAuthStore } from '@/stores/useAuthStore'
import { usePermissions } from '@/hooks/usePermissions'
import { supabase } from '@/services/supabase/client'

export function AdminRoute() {
  const { loading, session } = useAuthStore()
  const { loading: permissionsLoading, hasPermission } = usePermissions()
  const [adminSessionReady, setAdminSessionReady] = useState<boolean | null>(null)
  const hasAdminPermission = hasPermission('exam.read') || hasPermission('user.read.basic') || hasPermission('role.read')

  useEffect(() => {
    let active = true
    if (!hasAdminPermission) {
      setAdminSessionReady(true)
      return () => { active = false }
    }
    if (!session?.access_token) {
      setAdminSessionReady(false)
      return () => { active = false }
    }
    setAdminSessionReady(null)
    void supabase.functions.invoke('start-admin-session').then(({ error }) => {
      if (active) setAdminSessionReady(!error)
    })
    return () => { active = false }
  }, [session?.access_token, hasAdminPermission])

  if (loading || permissionsLoading || adminSessionReady === null) return <AppLoading />
  if (!hasAdminPermission) {
    // Chuyển hướng người dùng thông thường về dashboard chính
    return <Navigate to="/app/dashboard" replace />
  }
  if (!adminSessionReady) return <Navigate to="/mfa-challenge" replace />

  return <Outlet />
}
