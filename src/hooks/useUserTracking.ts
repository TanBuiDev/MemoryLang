import { useEffect, useRef } from 'react'
import { supabase } from '@/services/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'

const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000 // 2 minutes

export function useUserTracking() {
  const user = useAuthStore((state) => state.user)
  const lastActiveRef = useRef<number>(Date.now())
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!user) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      return
    }

    const updatePresence = async () => {
      // Only update if there was activity in the last interval
      const now = Date.now()
      if (now - lastActiveRef.current <= HEARTBEAT_INTERVAL_MS + 5000) {
        try {
          await supabase
            .from('profiles')
            .update({ last_active_at: new Date().toISOString() })
            .eq('id', user.id)
        } catch (error) {
          console.error('Failed to update presence', error)
        }
      }
    }

    // Initial ping
    updatePresence()

    // Setup interval
    intervalRef.current = setInterval(updatePresence, HEARTBEAT_INTERVAL_MS)

    const handleActivity = () => {
      lastActiveRef.current = Date.now()
    }

    // Listen for user activity
    window.addEventListener('mousemove', handleActivity, { passive: true })
    window.addEventListener('keydown', handleActivity, { passive: true })
    window.addEventListener('click', handleActivity, { passive: true })
    window.addEventListener('scroll', handleActivity, { passive: true })
    window.addEventListener('touchstart', handleActivity, { passive: true })

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('click', handleActivity)
      window.removeEventListener('scroll', handleActivity)
      window.removeEventListener('touchstart', handleActivity)
    }
  }, [user])
}
