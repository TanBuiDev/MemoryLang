import { useEffect, useState } from 'react'
import { permissionsService } from '@/services/supabase/permissions.service'
import { useAuthStore } from '@/stores/useAuthStore'

export function usePermissions() {
  const [permissions, setPermissions] = useState<Set<string> | null>(null)
  const userId = useAuthStore((state) => state.user?.id)

  useEffect(() => {
    let active = true
    let authorizationVersion: number | null = null
    if (!userId) {
      setPermissions(new Set())
      return () => { active = false }
    }

    setPermissions(null)
    const loadPermissions = async () => {
      try {
        const nextPermissions = await permissionsService.getMyPermissions()
        if (active) setPermissions(nextPermissions)
      } catch {
        if (active) setPermissions(new Set())
      }
    }

    const initialize = async () => {
      await loadPermissions()
      try {
        authorizationVersion = await permissionsService.getMyAuthorizationVersion()
      } catch {
        authorizationVersion = null
      }
    }

    const refreshIfAuthorizationChanged = async () => {
      try {
        const nextVersion = await permissionsService.getMyAuthorizationVersion()
        if (authorizationVersion !== null && nextVersion !== authorizationVersion) {
          authorizationVersion = nextVersion
          await loadPermissions()
        } else if (authorizationVersion === null) {
          authorizationVersion = nextVersion
        }
      } catch {
        // Permission failures remain safely denied until a later successful refresh.
      }
    }

    void initialize()
    const intervalId = window.setInterval(() => { void refreshIfAuthorizationChanged() }, 5000)

    return () => {
      active = false
      window.clearInterval(intervalId)
    }
  }, [userId])

  return { loading: permissions === null, hasPermission: (permission: string) => permissions?.has(permission) ?? false }
}
