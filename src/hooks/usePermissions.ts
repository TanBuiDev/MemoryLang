import { useEffect, useState } from 'react'
import { permissionsService } from '@/services/supabase/permissions.service'

export function usePermissions() {
  const [permissions, setPermissions] = useState<Set<string> | null>(null)
  useEffect(() => { void permissionsService.getMyPermissions().then(setPermissions).catch(() => setPermissions(new Set())) }, [])
  return { loading: permissions === null, hasPermission: (permission: string) => permissions?.has(permission) ?? false }
}
