import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'

const migrations = await readdir(new URL('../supabase/migrations/', import.meta.url))
const adminMatches = migrations.filter((name) =>
  name.endsWith('_harden_admin_secret_vault_access.sql'))
const poolMatches = migrations.filter((name) =>
  name.endsWith('_harden_multi_key_pool_vault_access.sql'))

assert.equal(adminMatches.length, 1, 'expected exactly one admin vault hardening migration')
assert.equal(poolMatches.length, 1, 'expected exactly one key-pool hardening migration')

const adminMigration = await readFile(
  new URL(`../supabase/migrations/${adminMatches[0]}`, import.meta.url),
  'utf8',
)
const poolMigration = await readFile(
  new URL(`../supabase/migrations/${poolMatches[0]}`, import.meta.url),
  'utf8',
)
const migration = `${adminMigration}\n${poolMigration}`
const normalized = migration.replace(/\s+/gu, ' ').trim()

const adminRpcSignatures = [
  'check_active_vision_key_configured()',
  'delete_admin_secret(text)',
  'delete_ai_model_config(uuid)',
  'delete_key_pool_item(uuid)',
  'get_admin_key_pools_overview()',
  'get_admin_secrets_overview()',
  'get_key_pool_secret_for_test(uuid)',
  'save_admin_secret(text,text,text)',
  'toggle_key_pool_status(uuid,text)',
  'update_key_pool_model(uuid,text)',
  'upsert_key_pool_item(uuid,text,text,text,text,boolean)',
  'upsert_verified_ai_model(text,text,text,boolean)',
]

const serviceRpcSignatures = [
  'get_active_keys_for_service(text)',
  'record_key_execution_outcome(uuid,integer,integer,text)',
]

function escaped(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

function functionDefinition(name) {
  const pattern = new RegExp(
    `create or replace function public\\.${escaped(name)}\\([^]*?\\$[a-z0-9_]*\\$;`,
    'iu',
  )
  return migration.match(pattern)?.[0] ?? ''
}

test('orders hardening after each migration that owns the referenced objects', () => {
  const adminVersion = Number.parseInt(adminMatches[0].slice(0, 14), 10)
  const keyPoolSchemaVersion = 20260727120000
  const poolVersion = Number.parseInt(poolMatches[0].slice(0, 14), 10)

  assert.ok(adminVersion < keyPoolSchemaVersion)
  assert.ok(poolVersion > keyPoolSchemaVersion)
  assert.doesNotMatch(adminMigration, /admin_key_pools|key_pool|get_active_keys/iu)

  for (const signature of [
    ...adminRpcSignatures.filter((signature) =>
      /key_pool|active_vision/iu.test(signature)),
    ...serviceRpcSignatures,
  ]) {
    const name = signature.slice(0, signature.indexOf('('))
    assert.match(
      poolMigration,
      new RegExp(`create or replace function public\\.${escaped(name)}\\(`, 'iu'),
      `${signature} must be owned by the post-key-pool hardening migration`,
    )
  }
})

test('removes user-editable JWT authorization from vault policies and helpers', () => {
  assert.ok(normalized.length > 0, 'hardening migration must not be empty')
  assert.doesNotMatch(migration, /user_metadata|raw_user_meta_data|auth[.]jwt/iu)
  assert.match(
    functionDefinition('is_admin'),
    /security definer\s+set search_path = ''[\s\S]*public[.]profiles[\s\S]*auth[.]uid\(\)/iu,
  )
  assert.match(
    functionDefinition('is_admin_user'),
    /security definer\s+set search_path = ''[\s\S]*public[.]is_admin\(\)/iu,
  )

  for (const table of [
    'admin_system_secrets',
    'ai_model_configs',
    'admin_key_usage_logs',
    'admin_key_pools',
  ]) {
    assert.match(
      normalized,
      new RegExp(`create policy [^;]+ on public\\.${table} [^;]+public\\.is_admin\\(\\)`, 'iu'),
      `${table} must authorize admins through public.is_admin()`,
    )
  }
})

test('gives every vault security-definer function a fixed search path and minimum ACL', () => {
  for (const signature of [
    'is_admin()',
    'is_admin_user()',
    ...adminRpcSignatures,
    ...serviceRpcSignatures,
  ]) {
    const name = signature.slice(0, signature.indexOf('('))
    assert.match(
      functionDefinition(name),
      /security definer\s+set search_path = ''/iu,
      `${signature} must have an empty fixed search_path`,
    )
    assert.match(
      normalized,
      new RegExp(
        `revoke all on function public\\.${escaped(signature)} from public, anon, authenticated, service_role;`,
        'iu',
      ),
      `${signature} must revoke inherited/default execution`,
    )
  }

  for (const signature of adminRpcSignatures) {
    const name = signature.slice(0, signature.indexOf('('))
    assert.match(
      functionDefinition(name),
      /if not \(select public[.]is_admin\(\)\) then/iu,
      `${signature} must enforce the profile-backed admin check internally`,
    )
    assert.match(
      normalized,
      new RegExp(`grant execute on function public\\.${escaped(signature)} to authenticated;`, 'iu'),
      `${signature} must be callable only by authenticated admins`,
    )
  }

  assert.doesNotMatch(
    normalized,
    /grant execute on function public[.]is_admin_user\(\) to (?:anon|authenticated|service_role)/iu,
  )
})

test('keeps raw service key RPCs service-role only', () => {
  for (const signature of serviceRpcSignatures) {
    assert.match(
      normalized,
      new RegExp(`grant execute on function public\\.${escaped(signature)} to service_role;`, 'iu'),
    )
    assert.doesNotMatch(
      normalized,
      new RegExp(
        `grant execute on function public\\.${escaped(signature)} to (?:anon|authenticated);`,
        'iu',
      ),
    )
  }
})

test('revokes direct secret-table access and preserves only required read paths', () => {
  assert.match(
    normalized,
    /revoke all on table public[.]admin_system_secrets, public[.]admin_key_usage_logs, public[.]ai_model_configs from anon, authenticated;/iu,
  )
  assert.match(
    normalized,
    /revoke all on table public[.]admin_key_pools from anon, authenticated;/iu,
  )
  assert.match(
    normalized,
    /grant select on table public[.]admin_key_usage_logs to authenticated;/iu,
  )
  assert.match(
    normalized,
    /grant select on table public[.]ai_model_configs to anon, authenticated;/iu,
  )
  assert.doesNotMatch(
    normalized,
    /grant (?:select|insert|update|delete|all) on table public[.](?:admin_system_secrets|admin_key_pools) to (?:anon|authenticated)/iu,
  )
})

test('splits B1 admin mutation policies so SELECT policies do not overlap', () => {
  for (const table of [
    'exams',
    'exam_passage_sets',
    'exam_questions',
    'exam_sections',
    'practice_activities',
    'practice_questions',
    'practice_prompts',
  ]) {
    const tablePolicies = normalized.match(
      new RegExp(`create policy [^;]+ on public\\.${table} [^;]+;`, 'giu'),
    ) ?? []
    const selectPolicies = tablePolicies.filter((policy) =>
      / for select /iu.test(policy))
    const adminPolicies = tablePolicies.filter((policy) =>
      / for (?:insert|update|delete) /iu.test(policy)
      && /public[.]is_admin\(\)/iu.test(policy))

    assert.equal(selectPolicies.length, 1, `${table} must have one consolidated SELECT policy`)
    assert.match(selectPolicies[0], /public[.]is_admin\(\)/iu)
    assert.equal(adminPolicies.length, 3, `${table} must have three admin mutation policies`)
    assert.ok(adminPolicies.some((policy) => / for insert /iu.test(policy)))
    assert.ok(adminPolicies.some((policy) => / for update /iu.test(policy)))
    assert.ok(adminPolicies.some((policy) => / for delete /iu.test(policy)))
    assert.ok(adminPolicies.every((policy) => !/ for (?:all|select) /iu.test(policy)))
  }
})
