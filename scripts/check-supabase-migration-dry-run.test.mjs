import assert from 'node:assert/strict'
import test from 'node:test'

import {
  assertExpectedMigrationSet,
  extractDryRunMigrations,
} from './check-supabase-migration-dry-run.mjs'

const completedDryRun = `
DRY RUN: migrations will *not* be pushed to the database.
Would push these migrations:
 • 20260727130000_harden_multi_key_pool_vault_access.sql
Finished supabase db push.
`

test('extracts the ordered migration list from a completed dry-run', () => {
  assert.deepEqual(
    extractDryRunMigrations(completedDryRun),
    ['20260727130000_harden_multi_key_pool_vault_access.sql'],
  )
})

test('passes only when the dry-run migration set exactly matches', () => {
  assert.deepEqual(
    assertExpectedMigrationSet(
      completedDryRun,
      ['20260727130000_harden_multi_key_pool_vault_access.sql'],
    ),
    ['20260727130000_harden_multi_key_pool_vault_access.sql'],
  )
})

test('fails when the dry-run contains an unexpected migration', () => {
  assert.throws(
    () => assertExpectedMigrationSet(
      completedDryRun.replace(
        'Finished supabase db push.',
        ' • 20260727140000_unexpected.sql\nFinished supabase db push.',
      ),
      ['20260727130000_harden_multi_key_pool_vault_access.sql'],
    ),
    /Unexpected migration set/iu,
  )
})

test('fails when the dry-run omits an expected migration', () => {
  assert.throws(
    () => assertExpectedMigrationSet(completedDryRun, [
      '20260727130000_harden_multi_key_pool_vault_access.sql',
      '20260727140000_expected.sql',
    ]),
    /Unexpected migration set/iu,
  )
})

test('fails when Supabase did not complete a dry-run', () => {
  assert.throws(
    () => assertExpectedMigrationSet(
      'Connecting to remote database...\nnetwork failure',
      ['20260727130000_harden_multi_key_pool_vault_access.sql'],
    ),
    /did not complete successfully/iu,
  )
})
