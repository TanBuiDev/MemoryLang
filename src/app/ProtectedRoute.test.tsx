import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('ProtectedRoute pending administrative grant activation', () => {
  it('activates pending grants only after the current session meets the server prerequisites', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app/ProtectedRoute.tsx'), 'utf8')

    expect(source).toContain("rpc('get_admin_security_status')")
    expect(source).toContain("rpc('refresh_admin_role_grant_activation')")
    expect(source).toContain('has_google_identity')
    expect(source).toContain('mfa_verified')
    expect(source).toContain('setProfile')
  })
})
