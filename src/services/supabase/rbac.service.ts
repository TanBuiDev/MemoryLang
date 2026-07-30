import { supabase } from '@/services/supabase/client'

export interface RbacRole {
  code: string
  name: string
  description: string | null
}

export interface RbacPermission {
  code: string
  description: string | null
  roleCodes: string[]
}

export interface RbacUser {
  id: string
  email: string | null
  displayName: string | null
  roleCodes: string[]
  pendingRoleCodes?: string[]
}

export interface RoleManagementOverview {
  roles: RbacRole[]
  permissions: RbacPermission[]
  users: RbacUser[]
  total: number
}

export const rbacService = {
  async getOverview(query = '', limit = 100, offset = 0): Promise<RoleManagementOverview> {
    const { data, error } = await supabase.rpc('get_role_management_overview', {
      p_query: query || null,
      p_limit: limit,
      p_offset: offset,
    })
    if (error) throw error

    const overview = (data as RoleManagementOverview | null) ?? { roles: [], permissions: [], users: [], total: 0 }
    const { data: pending, error: pendingError } = await supabase.rpc('get_pending_admin_role_grants')
    if (pendingError) throw pendingError
    const pendingByUser = new Map<string, string[]>()
    for (const grant of (pending ?? []) as Array<{ user_id: string; role_code: string }>) {
      pendingByUser.set(grant.user_id, [...(pendingByUser.get(grant.user_id) ?? []), grant.role_code])
    }
    return {
      ...overview,
      users: overview.users.map((user) => ({ ...user, pendingRoleCodes: pendingByUser.get(user.id) ?? [] })),
    }
  },
}
