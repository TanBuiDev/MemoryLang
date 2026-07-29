import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const servicePath = resolve(process.cwd(), 'src/services/supabase/adminSecrets.service.ts')
const pagePath = resolve(process.cwd(), 'src/pages/admin/AdminSecretsPage.tsx')

describe('admin secret testing security contract', () => {
  it('does not expose a raw API key to the React client', () => {
    const serviceSource = readFileSync(servicePath, 'utf8')
    const pageSource = readFileSync(pagePath, 'utf8')
    expect(serviceSource).not.toContain('getKeyPoolSecretForTest')
    expect(serviceSource).not.toContain('encrypted_value')
    expect(pageSource).not.toContain('testGeminiApiKeyAndModel')
  })

  it('tests a stored key through the authenticated server-side function', () => {
    const serviceSource = readFileSync(servicePath, 'utf8')
    expect(serviceSource).toMatch(/supabase\.functions\.invoke(?:<[^>]+>)?\('test-ai-provider'/)
  })
})
