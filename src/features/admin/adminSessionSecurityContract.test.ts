import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const startPath = resolve(process.cwd(), 'supabase/functions/start-admin-session/index.ts')
const revokePath = resolve(process.cwd(), 'supabase/functions/revoke-admin-session/index.ts')

describe('admin session Edge Function security contract', () => {
  it('verifies the JWT before starting a session bound to its session id', () => {
    const source = readFileSync(startPath, 'utf8')
    expect(source).toContain('supabaseUser.auth.getUser()')
    expect(source).toContain("supabaseUser.rpc('start_admin_session'")
    expect(source).toContain("payload.session_id")
  })

  it('only revokes the currently verified auth session', () => {
    const source = readFileSync(revokePath, 'utf8')
    expect(source).toContain('supabaseUser.auth.getUser()')
    expect(source).toContain("supabaseUser.rpc('revoke_own_admin_session'")
  })
})
