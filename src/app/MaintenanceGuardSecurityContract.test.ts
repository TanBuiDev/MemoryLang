import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const guardPath = resolve(process.cwd(), 'src/app/MaintenanceGuard.tsx')

describe('MaintenanceGuard RBAC contract', () => {
  it('allows administrators based on named permissions instead of only the legacy profile flag', () => {
    const source = readFileSync(guardPath, 'utf8')
    expect(source).toContain("hasPermission('exam.read')")
    expect(source).toContain("hasPermission('user.read.basic')")
    expect(source).toContain("hasPermission('role.read')")
    expect(source).toContain('!permissionsLoading && !canBypassMaintenance')
  })
})
