import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { AppLoading } from '@/components/common/AppLoading'
import { isSupabaseConfigured, supabase } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'
import { useMfaChallenge } from '@/hooks/useMfaChallenge'
import { authService } from '@/services/supabase/auth.service'

interface AdminSecurityStatus {
  has_google_identity: boolean
  mfa_verified: boolean
  pending_role_count: number
}

export function ProtectedRoute() {
  const { user, profile, loading, session, setProfile } = useAuthStore()
  const location = useLocation()
  const { loading: mfaLoading, requiresChallenge } = useMfaChallenge()
  const [activationCheckedToken, setActivationCheckedToken] = useState<string | null>(null)
  const accessToken = session?.access_token ?? null

  useEffect(() => {
    let active = true

    if (!user || !profile || !accessToken || requiresChallenge) {
      setActivationCheckedToken(accessToken)
      return () => { active = false }
    }

    void (async () => {
      const { data, error } = await supabase.rpc('get_admin_security_status')
      if (error || !active) return

      const status = data as AdminSecurityStatus | null
      if (
        status
        && status.pending_role_count > 0
        && status.has_google_identity
        && status.mfa_verified
      ) {
        const { error: activationError } = await supabase.rpc('refresh_admin_role_grant_activation')
        if (!activationError && active) {
          const refreshedProfile = await authService.getProfile(user.id)
          if (active) setProfile(refreshedProfile)
        }
      }
    })().finally(() => {
      if (active) setActivationCheckedToken(accessToken)
    })

    return () => { active = false }
  }, [accessToken, profile, requiresChallenge, setProfile, user])

  if (loading || (Boolean(user) && mfaLoading) || (Boolean(user) && activationCheckedToken !== accessToken)) return <AppLoading />
  if (isSupabaseConfigured && !user) return <Navigate to="/login" state={{ returnTo: (location.state as { returnTo?: string } | null)?.returnTo ?? `${location.pathname}${location.search}` }} replace />
  if (requiresChallenge) return <Navigate to="/mfa-challenge" state={{ returnTo: (location.state as { returnTo?: string } | null)?.returnTo ?? `${location.pathname}${location.search}` }} replace />
  if (!profile) return <AppLoading />
  const signedInWithGoogle = session?.user.app_metadata.provider === 'google'
  if (!profile.password_set && !signedInWithGoogle) return <Navigate to="/create-password" state={{ returnTo: (location.state as { returnTo?: string } | null)?.returnTo ?? `${location.pathname}${location.search}` }} replace />
  if (!profile.onboarding_completed) return <Navigate to="/onboarding" state={{ returnTo: (location.state as { returnTo?: string } | null)?.returnTo ?? `${location.pathname}${location.search}` }} replace />

  return <Outlet />
}
