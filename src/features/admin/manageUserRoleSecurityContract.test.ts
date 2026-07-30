import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const functionPath = resolve(process.cwd(), 'supabase/functions/manage-user-role/index.ts')
const adminServicePath = resolve(process.cwd(), 'src/services/supabase/admin.service.ts')

describe('manage-user-role security contract', () => {
  it('verifies the caller and requires the appropriate RBAC permission before using service credentials', () => {
    const source = readFileSync(functionPath, 'utf8')
    expect(source).toContain("supabaseUser.auth.getUser()")
    expect(source).toContain("supabaseUser.rpc('has_permission'")
    expect(source).toContain("supabaseUser.rpc('is_mfa_verified')")
    expect(source).toContain("supabaseUser.rpc('is_admin_session_active'")
    expect(source).toContain("SUPABASE_SERVICE_ROLE_KEY")
    expect(source).toContain("supabaseAdmin.rpc('manage_user_role'")
  })

  it('accepts only validated, reasoned role changes and prevents self-escalation', () => {
    const source = readFileSync(functionPath, 'utf8')
    expect(source).toContain("action: z.enum(['grant', 'revoke'])")
    expect(source).toContain('reason: z.string().trim().min(3).max(500)')
    expect(source).toContain('parsed.data.targetUserId === user.id')
  })

  it('does not expose a legacy generic administrator toggle', () => {
    const source = readFileSync(adminServicePath, 'utf8')
    expect(source).not.toContain('updateUserAdminStatus')
  })
})
