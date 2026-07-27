import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'

const migrations = await readdir(new URL('../supabase/migrations/', import.meta.url))
const matches = migrations.filter((name) =>
  name.endsWith('_add_b1_learner_attempts.sql'))
const hardeningMatches = migrations.filter((name) =>
  name.endsWith('_harden_b1_learner_attempt_rpcs.sql'))

assert.equal(matches.length, 1, 'expected exactly one B1 learner attempts migration')
assert.equal(hardeningMatches.length, 1, 'expected exactly one B1 learner RPC hardening migration')

const migration = await readFile(
  new URL(`../supabase/migrations/${matches[0]}`, import.meta.url),
  'utf8',
)
const hardeningMigration = await readFile(
  new URL(`../supabase/migrations/${hardeningMatches[0]}`, import.meta.url),
  'utf8',
)
const normalized = `${migration}\n${hardeningMigration}`.replace(/\s+/gu, ' ').trim()

function functionDefinition(name) {
  const pattern = new RegExp(
    `create (?:or replace )?function public\\.${name}\\([^]*?\\$\\$;`,
    'iu',
  )
  return hardeningMigration.match(pattern)?.[0] ?? migration.match(pattern)?.[0] ?? ''
}

test('stores learner attempts with a public snapshot and a private grading snapshot', () => {
  for (const table of [
    'exam_attempts',
    'exam_attempt_grading_snapshots',
    'exam_section_attempts',
    'practice_draft_versions',
  ]) {
    assert.match(normalized, new RegExp(`create table public\\.${table} \\(`, 'iu'))
    assert.match(normalized, new RegExp(`alter table public\\.${table} enable row level security;`, 'iu'))
  }

  const startAttempt = functionDefinition('start_b1_exam_attempt')
  assert.match(startAttempt, /security definer\s+set search_path = ''/iu)
  assert.match(startAttempt, /option - 'is_correct'/iu)
  assert.match(startAttempt, /exam_attempt_grading_snapshots/iu)
  assert.match(startAttempt, /correct_option_keys/iu)
  assert.match(startAttempt, /and is_published = true/iu)
  assert.match(startAttempt, /exam has inaccessible required sections/iu)
})

test('only links a saved prompt draft to its matching exam section', () => {
  const saveProgress = functionDefinition('save_b1_section_attempt_progress')
  assert.match(saveProgress, /security definer\s+set search_path = ''/iu)
  assert.match(saveProgress, /es[.]resource_type = 'prompt'/iu)
  assert.match(saveProgress, /es[.]resource_id = pdv[.]prompt_id/iu)
})

test('limits drafts to five immutable learner-owned versions', () => {
  const createDraft = functionDefinition('create_practice_draft_version')
  assert.match(createDraft, /security definer\s+set search_path = ''/iu)
  assert.match(createDraft, /pg_advisory_xact_lock/iu)
  assert.match(createDraft, /if v_next_version > 5 then/iu)
  assert.match(createDraft, /errcode = '23514'/iu)
  assert.match(normalized, /unique \(user_id, prompt_id, version_number\)/iu)
})

test('exposes only guarded RPC mutations to signed-in learners', () => {
  for (const signature of [
    'start_b1_exam_attempt(uuid, integer)',
    'save_b1_section_attempt_progress(uuid, text, jsonb, text, uuid)',
    'create_practice_draft_version(uuid, text)',
  ]) {
    assert.match(
      normalized,
      new RegExp(`revoke all on function public\\.${signature.replace(/[()]/gu, '\\$&')} from public, anon;`, 'iu'),
    )
    assert.match(
      normalized,
      new RegExp(`grant execute on function public\\.${signature.replace(/[()]/gu, '\\$&')} to authenticated;`, 'iu'),
    )
  }

  assert.doesNotMatch(
    normalized,
    /grant (?:insert|update|delete|all) on table public[.](?:exam_attempts|exam_section_attempts) to authenticated/iu,
  )
  assert.doesNotMatch(
    normalized,
    /grant (?:select|insert|update|delete|all) on table public[.]exam_attempt_grading_snapshots to authenticated/iu,
  )
})
