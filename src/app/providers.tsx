import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useMemo, type ReactNode } from 'react'
import { authService } from '@/services/supabase/auth.service'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'
import type { Profile } from '@/types/auth.types'

const demoProfile: Profile = {
  id: 'demo-user',
  display_name: 'MemoryLang Learner',
  native_language: 'vi',
  current_target_language: 'en',
  ui_language: 'vi',
  onboarding_completed: true,
  daily_goal: 10,
  default_study_mode: 'two_side',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

function AuthBootstrap({ children }: { children: ReactNode }) {
  const setSession = useAuthStore((state) => state.setSession)
  const setProfile = useAuthStore((state) => state.setProfile)
  const setLoading = useAuthStore((state) => state.setLoading)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setProfile(demoProfile)
      setLoading(false)
      return
    }

    if (window.location.hash === '#') {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    }

    authService
      .getSession()
      .then(async ({ data }) => {
        setSession(data.session)
        if (data.session?.user) {
          setProfile(await authService.getProfile(data.session.user.id))
        }
      })
      .finally(() => setLoading(false))

    const { data } = authService.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setProfile(session?.user ? await authService.getProfile(session.user.id) : null)
    })

    return () => data.subscription.unsubscribe()
  }, [setLoading, setProfile, setSession])

  return children
}

export function AppProviders({ children }: { children: ReactNode }) {
  const queryClient = useMemo(() => new QueryClient(), [])

  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>{children}</AuthBootstrap>
    </QueryClientProvider>
  )
}
