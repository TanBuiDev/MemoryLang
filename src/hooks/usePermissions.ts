import { useEffect, useState } from 'react'
import { permissionsService } from '@/services/supabase/permissions.service'
import { useAuthStore } from '@/stores/useAuthStore'

export function usePermissions() {
  const [permissions, setPermissions] = useState<Set<string> | null>(null)
  const userId = useAuthStore((state) => state.user?.id)

  useEffect(() => {
    let active = true
    if (!userId) {
      setPermissions(new Set())
      return () => { active = false }
    }

    setPermissions(null)
    void permissionsService.getMyPermissions()
      .then((nextPermissions) => { if (active) setPermissions(nextPermissions) })
      .catch(() => { if (active) setPermissions(new Set()) })

    return () => { active = false }
  }, [userId])

  return { loading: permissions === null, hasPermission: (permission: string) => permissions?.has(permission) ?? false }
}
