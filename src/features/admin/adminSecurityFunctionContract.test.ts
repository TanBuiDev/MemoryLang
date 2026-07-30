import { readFile } from 'node:fs/promises'
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
    expect(source).toContain('auth.admin.signOut')
    expect(source).toContain('auth.admin.mfa.deleteFactor')
  })

  it('returns a generic Google reauthentication state without exposing account roles', async () => {
    const source = await readFile(resolve(process.cwd(), 'supabase/functions/start-admin-session/index.ts'), 'utf8')

    expect(source).toContain("'google_oauth_required'")
    expect(source).toContain("'mfa_required'")
    expect(source).not.toContain('admin account')
  })
})
