import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('manage-rbac security contract', () => {
  it('requires MFA, an active admin session, and protected database mutations', async () => {
    const source = await readFile(resolve(process.cwd(), 'supabase/functions/manage-rbac/index.ts'), 'utf8')

    expect(source).toContain("rpc('is_mfa_verified')")
    expect(source).toContain("rpc('start_admin_session'")
    expect(source).toContain("rpc('is_admin_session_active'")
    expect(source).toContain("rpc('manage_user_role'")
    expect(source).toContain("rpc('manage_role_permission'")
    expect(source).toContain("'Access-Control-Allow-Origin': '*'")
  })
})
