import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  buildB1SeedSql,
  deterministicUuidV5,
  sqlLiteral,
} from './build-b1-seed.mjs'

const artifact = JSON.parse(
  await readFile(new URL('../docs/data/b1-de-full-copy.json', import.meta.url), 'utf8'),
)

function statementFor(sql, table, sourceKey) {
  const insertMarker = `insert into public.${table}`
  const sourceIndex = sql.indexOf(sqlLiteral(sourceKey))
  const statementStart = sql.lastIndexOf(insertMarker, sourceIndex)
  const nextStatement = sql.indexOf('\n\ninsert into public.', sourceIndex)

  if (sourceIndex === -1 || statementStart === -1) {
    return undefined
  }

  return sql.slice(statementStart, nextStatement === -1 ? undefined : nextStatement)
}

function statementsForTable(sql, table) {
  const marker = `insert into public.${table}`
  const statements = []
  let statementStart = sql.indexOf(marker)

  while (statementStart !== -1) {
    const nextStatement = sql.indexOf('\n\ninsert into public.', statementStart + marker.length)
    statements.push(sql.slice(
      statementStart,
      nextStatement === -1 ? undefined : nextStatement,
    ))
    statementStart = sql.indexOf(marker, statementStart + marker.length)
  }

  return statements
}

function upsertAssignmentColumns(statement) {
  const updateMarker = 'on conflict (source_key) do update set\n'
  const updateStart = statement.lastIndexOf(updateMarker)
  assert.notEqual(updateStart, -1)

  return statement
    .slice(updateStart + updateMarker.length)
    .replace(/;\s*$/u, '')
    .split(',\n')
    .map((assignment) => assignment.trim().split(/\s*=\s*/u, 1)[0])
}

test('generates one complete draft transaction in dependency order', () => {
  const sql = buildB1SeedSql(artifact)
  const normalized = sql.trim()

  assert.ok(normalized.startsWith('begin;'))
  assert.ok(normalized.endsWith('commit;'))
  assert.equal((sql.match(/insert into public\.exams/gu) ?? []).length, 1)
  assert.match(
    statementFor(sql, 'exams', artifact.exam.source_key),
    /on conflict \(source_key\) do update/u,
  )

  const examIndex = sql.indexOf('insert into public.exams')
  const activityIndex = sql.indexOf('insert into public.practice_activities')
  const promptIndex = sql.indexOf('insert into public.practice_prompts')
  const questionIndex = sql.indexOf('insert into public.practice_questions')
  const sectionIndex = sql.indexOf('insert into public.exam_sections')

  assert.ok(examIndex < activityIndex)
  assert.ok(activityIndex < promptIndex)
  assert.ok(promptIndex < questionIndex)
  assert.ok(questionIndex < sectionIndex)
  assert.equal((sql.match(/\bis_published = false\b/gu) ?? []).length, 18)
})

test('keeps placeholder media null and excludes watermarks and secrets', () => {
  const sql = buildB1SeedSql(artifact)
  const signsStatement = statementFor(sql, 'practice_questions', 'signs-1')
  const listeningStatement = statementFor(sql, 'practice_activities', 'listening-text-1')
  const writingStatement = statementFor(sql, 'practice_prompts', 'writing-topic-7')
  const speakingStatement = statementFor(sql, 'practice_prompts', 'speaking-topic-35')

  assert.match(signsStatement, /\bimage_url = null\b/u)
  assert.match(listeningStatement, /\baudio_url = null\b/u)
  assert.match(writingStatement, /\baudio_url = null\b/u)
  assert.match(speakingStatement, /\baudio_url = null\b/u)
  assert.doesNotMatch(sql, /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/iu)
  assert.doesNotMatch(
    sql,
    /\b(?:service_role|secret[_-]?key|api[_-]?key|authorization:\s*bearer)\b/iu,
  )
})

test('uses deterministic RFC 4122 UUID v5 identifiers and idempotent upserts', () => {
  const firstSql = buildB1SeedSql(artifact)
  const secondSql = buildB1SeedSql(structuredClone(artifact))

  assert.equal(
    deterministicUuidV5('www.example.com'),
    '2ed6657d-e927-568b-95e1-2665a8aea6a2',
  )
  assert.equal(firstSql, secondSql)
  assert.equal(
    (firstSql.match(/insert into public\./gu) ?? []).length,
    1
      + artifact.activities.length
      + artifact.prompts.length
      + artifact.activities.reduce((count, activity) => count + activity.questions.length, 0)
      + artifact.sections.length,
  )
  assert.equal(
    (firstSql.match(/\bon conflict \(/gu) ?? []).length,
    (firstSql.match(/insert into public\./gu) ?? []).length,
  )
  assert.doesNotMatch(firstSql, /\b(?:delete|truncate)\s+from\b/iu)
})

test('resource upserts never assign immutable trigger columns', () => {
  const sql = buildB1SeedSql(artifact)
  const resourceStatements = [
    ...statementsForTable(sql, 'practice_activities'),
    ...statementsForTable(sql, 'practice_prompts'),
  ]

  assert.equal(
    resourceStatements.length,
    artifact.activities.length + artifact.prompts.length,
  )
  for (const statement of resourceStatements) {
    const assignmentColumns = upsertAssignmentColumns(statement)
    assert.equal(assignmentColumns.includes('id'), false)
    assert.equal(assignmentColumns.includes('skill'), false)
  }
})

test('escapes SQL literals without changing the source artifact', () => {
  const input = structuredClone(artifact)
  input.exam.title = String.raw`Teacher's \ B1 practice`
  const original = structuredClone(input)

  const sql = buildB1SeedSql(input)

  assert.match(sql, /'Teacher''s \\ B1 practice'/u)
  assert.deepEqual(input, original)
})

test('refuses to generate SQL from an invalid artifact', () => {
  const input = structuredClone(artifact)
  input.sections[0].resource_source_key = 'missing-resource'

  assert.throws(
    () => buildB1SeedSql(input),
    /Invalid B1 artifact[\s\S]*Unknown activity source_key "missing-resource"/u,
  )
})
