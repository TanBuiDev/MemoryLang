import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const componentPath = resolve(process.cwd(), 'src/pages/settings/MfaSetupSection.tsx')

describe('MfaSetupSection', () => {
  it('renders the Supabase QR data URL without encoding it again', () => {
    const source = readFileSync(componentPath, 'utf8')
    expect(source).toContain('src={enrollment.totp.qr_code}')
    expect(source).not.toContain('btoa(enrollment.totp.qr_code)')
  })

  it('does not offer a second enrollment after a TOTP factor is active', () => {
    const source = readFileSync(componentPath, 'utf8')
    expect(source).not.toContain("isEnabled ? 'Thêm ứng dụng xác thực' : 'Thiết lập 2FA ngay'")
  })
})
