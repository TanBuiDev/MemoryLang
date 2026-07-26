import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildB1SeedIdempotencySql,
  runPnpmCommand,
} from './check-b1-seed-idempotency.mjs'

test('wraps one seed reapplication with exact-count assertions and rollback', () => {
  const seedSql = [
    'begin;',
    '',
    "insert into public.exams (source_key) values ('b1-de-full-copy')",
    'on conflict (source_key) do nothing;',
    '',
    'commit;',
    '',
  ].join('\n')

  const sql = buildB1SeedIdempotencySql(seedSql)

  assert.ok(sql.startsWith('begin;\n'))
  assert.ok(sql.endsWith('\nrollback;\n'))
  assert.equal(
    (sql.match(/insert into public\.exams/gu) ?? []).length,
    1,
  )
  assert.equal((sql.match(/^commit;$/gmu) ?? []).length, 0)
  assert.match(sql, /count\(\*\) = 1[\s\S]*public\.exams/iu)
  assert.match(sql, /count\(\*\) = 11[\s\S]*count\(distinct source_key\) = 11[\s\S]*public\.practice_activities/iu)
  assert.match(sql, /count\(\*\) = 90[\s\S]*count\(distinct \(activity_id, source_key\)\) = 90[\s\S]*public\.practice_questions/iu)
  assert.match(sql, /count\(\*\) = 6[\s\S]*count\(distinct source_key\) = 6[\s\S]*public\.practice_prompts/iu)
  assert.match(sql, /count\(\*\) = 17[\s\S]*count\(distinct \(exam_id, source_key\)\) = 17[\s\S]*public\.exam_sections/iu)
  assert.match(sql, /metadata\s*->>\s*'source_document'\s*=\s*'DeFull Copy\.pdf'/iu)
})

test('rejects a migration without one complete transaction wrapper', () => {
  assert.throws(
    () => buildB1SeedIdempotencySql('insert into public.exams default values;'),
    /Expected seed SQL to contain exactly one begin;\/commit; wrapper/u,
  )
})

test('launches pnpm portably on the current operating system', async () => {
  await assert.doesNotReject(
    runPnpmCommand(['--version'], {
      cwd: process.cwd(),
      stdio: 'ignore',
    }),
  )
})
