import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations',
  readdirSync(resolve(process.cwd(), 'supabase/migrations')).find((file) => file.endsWith('_add_admin_security_lifecycle.sql')) ?? '',
)

describe('admin security lifecycle migration', () => {
  it('creates private pending-grant, session-event, and delivery-outbox storage', () => {
    expect(migrationPath.endsWith('_add_admin_security_lifecycle.sql')).toBe(true)

    const sql = readFileSync(migrationPath, 'utf8')
    expect(sql).toContain('security.admin_role_grants')
    expect(sql).toContain("activation_state text not null default 'pending'")
    expect(sql).toContain('security.admin_security_events')
    expect(sql).toContain('security.security_email_outbox')
    expect(sql).toContain('alter table security.admin_role_grants enable row level security')
  })

  it('requires an existing profile and activates only after Google plus TOTP prerequisites', () => {
    const sql = readFileSync(migrationPath, 'utf8')
    expect(sql).toContain('Target account does not exist.')
    expect(sql).toContain("provider = 'google'")
    expect(sql).toContain('public.refresh_admin_role_grant_activation')
    expect(sql).toContain("activation_state = 'active'")
  })

  it('restricts privileged lifecycle operations to authenticated or service-role callers', () => {
    const sql = readFileSync(migrationPath, 'utf8')
    expect(sql).toContain('grant execute on function public.get_admin_security_status() to authenticated')
    expect(sql).toContain('grant execute on function public.refresh_admin_role_grant_activation() to authenticated')
    expect(sql).toContain('grant execute on function security.enqueue_security_email')
    expect(sql).toContain('to service_role')
  })

  it('exposes pending grants only to role readers', () => {
    const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260730132345_expose_pending_admin_role_grants.sql'), 'utf8')
    expect(migration).toContain('public.get_pending_admin_role_grants')
    expect(migration).toContain("security.has_permission('role.read')")
    expect(migration).toContain('grant execute on function public.get_pending_admin_role_grants() to authenticated')
  })
})
