import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const sourceRoot = join(import.meta.dirname, '..', 'src')

function collectSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return collectSourceFiles(path)
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : []
  })
}

test('browser sources do not reference provider secrets or service credentials', () => {
  const disallowed = /VITE_[A-Z0-9_]*(?:API_KEY|SECRET|SERVICE_ROLE)[A-Z0-9_]*|SUPABASE_SERVICE_ROLE_KEY|encrypted_value/
  const violations = collectSourceFiles(sourceRoot)
    .filter((path) => !path.endsWith('.test.ts') && !path.endsWith('.test.tsx'))
    .filter((path) => disallowed.test(readFileSync(path, 'utf8')))

  assert.deepEqual(violations, [])
})

test('sensitive Edge Functions validate the caller before privileged work', () => {
  const functions = ['parse-exam-vision', 'test-ai-provider', 'manage-user-role']
  for (const name of functions) {
    const source = readFileSync(join(import.meta.dirname, '..', 'supabase', 'functions', name, 'index.ts'), 'utf8')
    assert.match(source, /auth\.getUser\(\)/, `${name} must verify the JWT`)
    assert.match(source, /has_permission/, `${name} must verify a named permission`)
  }
})
