import { Navigate, Outlet } from 'react-router-dom'
import { AppLoading } from '@/components/common/AppLoading'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'

export function ProtectedRoute() {
  const { user, profile, loading } = useAuthStore()

  if (loading) return <AppLoading />
  if (isSupabaseConfigured && !user) return <Navigate to="/login" replace />
  if (profile && !profile.password_set)
    return <Navigate to="/create-password" replace />
  if (profile && !profile.onboarding_completed) return <Navigate to="/onboarding" replace />

  return <Outlet />
}
