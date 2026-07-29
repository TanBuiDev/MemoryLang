import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = resolve(process.cwd(), 'supabase/migrations/20260729155553_revoke_login_policy_enumeration.sql')

describe('login policy enumeration hardening', () => {
  it('removes anonymous access to RPCs that disclose administrator login policy', () => {
    const sql = readFileSync(migrationPath, 'utf8')

    expect(sql).toContain('revoke all on function public.can_login_with_password(text) from public, anon, authenticated;')
    expect(sql).toContain('revoke all on function public.is_admin_email(text) from public, anon, authenticated;')
  })
})
