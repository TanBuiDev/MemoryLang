import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useMemo, type ReactNode } from 'react'
import { MaintenanceGuard } from '@/app/MaintenanceGuard'
import { ToastContainer } from '@/components/ui/toast'
import { GlobalAiTutorModal } from '@/components/chat/GlobalAiTutorModal'
import { studySyncService } from '@/services/local/studySync.service'
import { authService } from '@/services/supabase/auth.service'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
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
          void useSubscriptionStore.getState().loadSubscription()
        } else {
          setProfile(null)
          useSubscriptionStore.getState().reset()
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
      const currentAuth = useAuthStore.getState()
      setSession(session)
      if (!session?.user) {
        setProfile(null)
        useSubscriptionStore.getState().reset()
        return
      }

      // Kiểm tra xem user có thay đổi không và đã tải hồ sơ (profile) chưa.
      // Nếu là cùng một user và profile đã tồn tại, chỉ cần tải lại profile ở chế độ nền (background)
      // mà không cần phải bật lại màn hình loading (tránh giật màn hình khi đổi tab).
      const isSameUser = currentAuth.user?.id === session.user.id
      const hasProfile = !!currentAuth.profile

      if (isSameUser && hasProfile) {
        void loadProfile(session.user.id)
        void useSubscriptionStore.getState().loadSubscription()
        return
      }

      setLoading(true)
      window.setTimeout(() => {
        void loadProfile(session.user.id)
          .then(() => {
            void useSubscriptionStore.getState().loadSubscription()
          })
          .finally(() => {
            if (isActive) setLoading(false)
          })
      }, 0)
    })

    return () => {
      isActive = false
      data.subscription.unsubscribe()
    }
  }, [setLoading, setProfile, setSession])

  return children
}

function StudySyncBootstrap() {
  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    if (!user) return
    void studySyncService.flushPendingStudyChanges(user.id).catch((error) => {
      console.warn('Pending study sync will retry later', error)
    })
  }, [user])

  useEffect(() => {
    if (!user) return

    function flushPendingChanges() {
      void studySyncService.flushPendingStudyChanges(user!.id).catch(() => undefined)
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') flushPendingChanges()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', flushPendingChanges)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', flushPendingChanges)
    }
  }, [user])

  return null
}

export function AppProviders({ children }: { children: ReactNode }) {
  const queryClient = useMemo(() => new QueryClient(), [])

  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>
        <MaintenanceGuard>
          <StudySyncBootstrap />
          <ToastContainer />
          <GlobalAiTutorModal />
          {children}
        </MaintenanceGuard>
      </AuthBootstrap>
    </QueryClientProvider>
  )
}
