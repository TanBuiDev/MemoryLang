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
  const [adminSessionFailure, setAdminSessionFailure] = useState<'google_oauth_required' | 'mfa_required' | null>(null)
  const hasAdminPermission = hasPermission('exam.read') || hasPermission('user.read.basic') || hasPermission('role.read')

  useEffect(() => {
    let active = true
    if (!hasAdminPermission) {
      setAdminSessionReady(true)
      setAdminSessionFailure(null)
      return () => { active = false }
    }
    if (!session?.access_token) {
      setAdminSessionReady(false)
      setAdminSessionFailure('mfa_required')
      return () => { active = false }
    }
    setAdminSessionReady(null)
    setAdminSessionFailure(null)
    void supabase.functions.invoke('start-admin-session').then(({ data, error }) => {
      if (!active) return
      const result = data as { data?: { ready?: boolean, reason?: 'google_oauth_required' | 'mfa_required' } } | null
      const reason = result?.data?.reason
      setAdminSessionFailure(reason ?? (error ? 'mfa_required' : null))
      setAdminSessionReady(!error && result?.data?.ready !== false)
    })
    return () => { active = false }
  }, [session?.access_token, hasAdminPermission])

  if (loading || permissionsLoading || adminSessionReady === null) return <AppLoading />
  if (!hasAdminPermission) {
    // Chuyển hướng người dùng thông thường về dashboard chính
    return <Navigate to="/app/dashboard" replace />
  }
  if (adminSessionFailure === 'google_oauth_required') {
    return <Navigate to="/login" state={{ message: 'Để tiếp tục, hãy đăng nhập bằng Google.' }} replace />
  }
  if (!adminSessionReady) return <Navigate to="/mfa-challenge" replace />

  return <Outlet />
}
