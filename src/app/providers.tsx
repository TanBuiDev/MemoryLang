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
  password_set: true,
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
    let isActive = true

    if (!isSupabaseConfigured) {
      setProfile(demoProfile)
      setLoading(false)
      return
    }

    if (window.location.hash === '#') {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    }

    async function loadProfile(userId: string) {
      try {
        const profile = await authService.getProfile(userId)
        if (isActive) setProfile(profile)
      } catch (error) {
        console.error('Failed to load profile', error)
        if (isActive) setProfile(null)
      }
    }

    authService
      .getSession()
      .then(async ({ data }) => {
        if (!isActive) return
        setSession(data.session)
        if (data.session?.user) {
          await loadProfile(data.session.user.id)
        } else {
          setProfile(null)
        }
      })
      .catch((error) => {
        console.error('Failed to restore session', error)
        if (!isActive) return
        setSession(null)
        setProfile(null)
      })
      .finally(() => {
        if (isActive) setLoading(false)
      })

    const { data } = authService.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session?.user) {
        setProfile(null)
        return
      }

      window.setTimeout(() => {
        void loadProfile(session.user.id)
      }, 0)
    })

    return () => {
      isActive = false
      data.subscription.unsubscribe()
    }
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
