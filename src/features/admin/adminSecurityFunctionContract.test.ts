import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('admin security Edge Function contracts', () => {
  it('accepts a security email template only from server-side callers', async () => {
    const source = await readFile(resolve(process.cwd(), 'supabase/functions/send-email/index.ts'), 'utf8')

    expect(source).toContain("'security_alert'")
    expect(source).toContain('RESEND_SENDER_EMAIL')
    expect(source).toContain('SUPABASE_SERVICE_ROLE_KEY')
    expect(source).toContain("payload.template !== 'security_alert'")
    expect(source).toContain("'List-Unsubscribe'")
  })

  it('rejects self-service MFA reset and requires a verified super administrator', async () => {
    const source = await readFile(resolve(process.cwd(), 'supabase/functions/admin-security/index.ts'), 'utf8')

    expect(source).toContain("rpc('is_mfa_verified')")
    expect(source).toContain("rpc('has_role', { p_role_code: 'super_admin' })")
    expect(source).toContain('cannot reset their own MFA')
    expect(source).toContain('auth.admin.mfa.deleteFactor')
    expect(source).not.toContain('auth.admin.signOut')
  })

  it('exposes service-role-only public RPC wrappers for MFA reset audit delivery', async () => {
    const migrationNames = await readdir(resolve(process.cwd(), 'supabase/migrations'))
    const migrationSources = await Promise.all(
      migrationNames.map((name) => readFile(resolve(process.cwd(), 'supabase/migrations', name), 'utf8')),
    )
    const migrations = migrationSources.join('\n').replace(/\s+/g, ' ')

    expect(migrations).toContain('create or replace function public.record_admin_mfa_reset')
    expect(migrations).toContain('create or replace function public.claim_security_email_outbox')
    expect(migrations).toContain('create or replace function public.mark_security_email_sent')
    expect(migrations).toContain('returns uuid language sql security definer set search_path')
    expect(migrations).toContain('grant execute on function public.record_admin_mfa_reset(uuid, uuid, text) to service_role')
    expect(migrations).toContain('grant execute on function public.claim_security_email_outbox(uuid) to service_role')
    expect(migrations).toContain('grant execute on function public.mark_security_email_sent(uuid, text) to service_role')
  })

  it('returns a generic Google reauthentication state without exposing account roles', async () => {
    const source = await readFile(resolve(process.cwd(), 'supabase/functions/start-admin-session/index.ts'), 'utf8')

    expect(source).toContain("'google_oauth_required'")
    expect(source).toContain("'mfa_required'")
    expect(source).not.toContain('admin account')
  })

  it('adds a masked network signal to new-device security alerts', async () => {
    const source = await readFile(resolve(process.cwd(), 'supabase/functions/start-admin-session/index.ts'), 'utf8')
    const emailSource = await readFile(resolve(process.cwd(), 'supabase/functions/send-email/index.ts'), 'utf8')

    expect(source).toContain('p_ip_hash')
    expect(source).toContain('p_network_label')
    expect(emailSource).toContain('networkLabel')
  })

  it('does not mutate Auth credentials while establishing an admin session', async () => {
    const source = await readFile(resolve(process.cwd(), 'supabase/functions/start-admin-session/index.ts'), 'utf8')

    expect(source).not.toContain('auth.admin.updateUserById')
    expect(source).not.toContain('createDisabledPassword')
  })
})
