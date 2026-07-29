import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { AppLoading } from '@/components/common/AppLoading'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'
import { useMfaChallenge } from '@/hooks/useMfaChallenge'

export function ProtectedRoute() {
  const { user, profile, loading } = useAuthStore()
  const location = useLocation()
  const { loading: mfaLoading, requiresChallenge } = useMfaChallenge()

  if (loading || (Boolean(user) && mfaLoading)) return <AppLoading />
  if (isSupabaseConfigured && !user) return <Navigate to="/login" replace />
  if (requiresChallenge) return <Navigate to="/mfa-challenge" state={{ returnTo: `${location.pathname}${location.search}` }} replace />
  if (!profile) return <AppLoading />
  if (!profile.password_set) return <Navigate to="/create-password" replace />
  if (!profile.onboarding_completed) return <Navigate to="/onboarding" replace />

  return <Outlet />
}
