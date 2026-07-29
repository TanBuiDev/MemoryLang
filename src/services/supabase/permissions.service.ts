import { supabase } from '@/services/supabase/client'

export const permissionsService = {
  async getMyPermissions(): Promise<Set<string>> {
    const { data, error } = await supabase.rpc('get_my_permissions')
    if (error) throw error
    return new Set((data ?? []).map((row: { code: string }) => row.code))
  },
}
