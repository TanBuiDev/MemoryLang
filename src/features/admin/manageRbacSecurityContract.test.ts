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

  it('exposes the MFA assurance check only to authenticated callers', async () => {
    const migration = await readFile(resolve(process.cwd(), 'supabase/migrations/20260729185102_expose_mfa_verification_check.sql'), 'utf8')

    expect(migration).toContain('create or replace function public.is_mfa_verified()')
    expect(migration).toContain('select security.is_mfa_verified()')
    expect(migration).toContain('grant execute on function public.is_mfa_verified() to authenticated')
  })
})
