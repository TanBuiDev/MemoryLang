import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = resolve(process.cwd(), 'supabase/migrations/20260728133215_add_admin_password_login_setting.sql')

describe('admin password-login migration', () => {
  it('defaults every admin to Google-only login until an admin explicitly enables passwords', () => {
    const sql = readFileSync(migrationPath, 'utf8')

    expect(sql).toContain('allow_password_login boolean NOT NULL DEFAULT false')
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.can_login_with_password')
    expect(sql).toContain('coalesce(profile.is_admin = false OR profile.allow_password_login, true)')
  })

  it('protects the password-login setting from self-escalation', () => {
    const sql = readFileSync(migrationPath, 'utf8')

    expect(sql).toContain('prevent_unauthorized_profile_security_changes')
    expect(sql).toContain('NEW.allow_password_login IS DISTINCT FROM OLD.allow_password_login')
    expect(sql).toContain('IF NOT public.is_admin() THEN')
  })
})
