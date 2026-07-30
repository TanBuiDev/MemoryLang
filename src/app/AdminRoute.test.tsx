import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('AdminRoute session gate', () => {
  it('starts a server-verified administrative session before rendering routes', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app/AdminRoute.tsx'), 'utf8')
    expect(source).toContain("functions.invoke('start-admin-session')")
    expect(source).toContain('adminSessionReady')
    expect(source).toContain('Navigate to="/mfa-challenge"')
    expect(source).toContain('google_oauth_required')
    expect(source).toContain('Navigate to="/login"')
  })
})
