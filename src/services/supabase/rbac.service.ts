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

    const overview = data as RoleManagementOverview | null
    return overview ?? { roles: [], permissions: [], users: [], total: 0 }
  },
}
