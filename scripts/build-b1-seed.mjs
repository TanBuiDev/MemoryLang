import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

import { validateB1Artifact } from './validate-b1-content.mjs'

const UUID_V5_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'

export function deterministicUuidV5(sourceKey) {
  const namespaceBytes = Buffer.from(UUID_V5_NAMESPACE.replaceAll('-', ''), 'hex')
  const digest = createHash('sha1')
    .update(namespaceBytes)
    .update(Buffer.from(sourceKey, 'utf8'))
    .digest()
    .subarray(0, 16)

  digest[6] = (digest[6] & 0x0f) | 0x50
  digest[8] = (digest[8] & 0x3f) | 0x80

  const hex = digest.toString('hex')
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-')
}

export function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`
}

function sqlNullableText(value) {
  return value === undefined || value === null ? 'null' : sqlLiteral(value)
}

function sqlInteger(value) {
  if (!Number.isInteger(value)) {
    throw new TypeError(`Expected an integer SQL value, received ${String(value)}`)
  }
  return String(value)
}

function sqlBoolean(value) {
  if (typeof value !== 'boolean') {
    throw new TypeError(`Expected a boolean SQL value, received ${String(value)}`)
  }
  return value ? 'true' : 'false'
}

function sqlJson(value) {
  return `${sqlLiteral(JSON.stringify(value))}::jsonb`
}

function insertStatement({
  table,
  columns,
  values,
  conflictTarget,
  updates,
}) {
  return [
    `insert into public.${table} (`,
    `  ${columns.join(',\n  ')}`,
    ') values (',
    `  ${values.join(',\n  ')}`,
    ')',
    `on conflict (${conflictTarget.join(', ')}) do update set`,
    `  ${updates.join(',\n  ')};`,
  ].join('\n')
}

function provenanceMetadata(artifact, extra = {}) {
  return {
    source_document: artifact.source.file_name,
    source_page_count: artifact.source.page_count,
    ...extra,
  }
}

function examStatement(artifact) {
  const questionCount = artifact.activities.reduce(
    (count, activity) => count + activity.questions.length,
    0,
  )

  return insertStatement({
    table: 'exams',
    columns: [
      'id',
      'source_key',
      'title',
      'category',
      'description',
      'time_limit_minutes',
      'total_questions',
      'is_published',
      'access_tier',
      'cefr_level',
      'default_time_minutes',
    ],
    values: [
      `${sqlLiteral(deterministicUuidV5(artifact.exam.source_key))}::uuid`,
      sqlLiteral(artifact.exam.source_key),
      sqlLiteral(artifact.exam.title),
      sqlLiteral(artifact.exam.category ?? 'GENERAL'),
      sqlLiteral(
        `Draft B1 practice content imported from ${artifact.source.file_name}.`,
      ),
      sqlInteger(artifact.exam.default_time_minutes),
      sqlInteger(questionCount),
      'false',
      sqlLiteral(artifact.exam.access_tier ?? 'free'),
      sqlLiteral('B1'),
      sqlInteger(artifact.exam.default_time_minutes),
    ],
    conflictTarget: ['source_key'],
    updates: [
      'title = excluded.title',
      'category = excluded.category',
      'description = excluded.description',
      'time_limit_minutes = excluded.time_limit_minutes',
      'total_questions = excluded.total_questions',
      'is_published = false',
      'access_tier = excluded.access_tier',
      'cefr_level = excluded.cefr_level',
      'default_time_minutes = excluded.default_time_minutes',
    ],
  })
}

function activityStatement(artifact, activity) {
  return insertStatement({
    table: 'practice_activities',
    columns: [
      'id',
      'source_key',
      'skill',
      'activity_type',
      'title',
      'instructions',
      'content',
      'passage',
      'audio_url',
      'is_published',
      'access_tier',
      'metadata',
      'created_by',
    ],
    values: [
      `${sqlLiteral(deterministicUuidV5(activity.source_key))}::uuid`,
      sqlLiteral(activity.source_key),
      sqlLiteral(activity.skill),
      sqlLiteral(activity.activity_type),
      sqlLiteral(activity.title),
      sqlNullableText(activity.instructions),
      sqlNullableText(activity.content),
      sqlNullableText(activity.passage),
      sqlNullableText(activity.audio_url),
      'false',
      sqlLiteral(artifact.exam.access_tier ?? 'free'),
      sqlJson(provenanceMetadata(artifact)),
      'null',
    ],
    conflictTarget: ['source_key'],
    updates: [
      'skill = excluded.skill',
      'activity_type = excluded.activity_type',
      'title = excluded.title',
      'instructions = excluded.instructions',
      'content = excluded.content',
      'passage = excluded.passage',
      activity.audio_url === null
        ? 'audio_url = null'
        : 'audio_url = excluded.audio_url',
      'is_published = false',
      'access_tier = excluded.access_tier',
      'metadata = excluded.metadata',
      'created_by = null',
    ],
  })
}

function promptStatement(artifact, prompt) {
  return insertStatement({
    table: 'practice_prompts',
    columns: [
      'id',
      'source_key',
      'skill',
      'title',
      'prompt',
      'instructions',
      'content',
      'source_page',
      'image_url',
      'audio_url',
      'is_published',
      'access_tier',
      'metadata',
      'created_by',
    ],
    values: [
      `${sqlLiteral(deterministicUuidV5(prompt.source_key))}::uuid`,
      sqlLiteral(prompt.source_key),
      sqlLiteral(prompt.skill),
      sqlLiteral(prompt.title),
      sqlLiteral(prompt.prompt),
      sqlNullableText(prompt.instructions),
      sqlNullableText(prompt.content),
      sqlInteger(prompt.source_page),
      sqlNullableText(prompt.image_url),
      sqlNullableText(prompt.audio_url),
      'false',
      sqlLiteral(artifact.exam.access_tier ?? 'free'),
      sqlJson(provenanceMetadata(artifact)),
      'null',
    ],
    conflictTarget: ['source_key'],
    updates: [
      'skill = excluded.skill',
      'title = excluded.title',
      'prompt = excluded.prompt',
      'instructions = excluded.instructions',
      'content = excluded.content',
      'source_page = excluded.source_page',
      prompt.image_url === null
        ? 'image_url = null'
        : 'image_url = excluded.image_url',
      prompt.audio_url === null
        ? 'audio_url = null'
        : 'audio_url = excluded.audio_url',
      'is_published = false',
      'access_tier = excluded.access_tier',
      'metadata = excluded.metadata',
      'created_by = null',
    ],
  })
}

function questionStatement(artifact, activity, question, orderIndex) {
  return insertStatement({
    table: 'practice_questions',
    columns: [
      'id',
      'activity_id',
      'source_key',
      'source_number',
      'question_type',
      'prompt',
      'options',
      'accepted_answers',
      'source_page',
      'image_url',
      'order_index',
      'metadata',
    ],
    values: [
      `${sqlLiteral(deterministicUuidV5(question.source_key))}::uuid`,
      `${sqlLiteral(deterministicUuidV5(activity.source_key))}::uuid`,
      sqlLiteral(question.source_key),
      sqlLiteral(question.source_number),
      sqlLiteral(question.question_type),
      sqlLiteral(question.prompt),
      sqlJson(question.options),
      sqlJson(question.accepted_answers),
      sqlInteger(question.source_page),
      sqlNullableText(question.image_url),
      sqlInteger(orderIndex),
      sqlJson(provenanceMetadata(artifact)),
    ],
    conflictTarget: ['activity_id', 'source_key'],
    updates: [
      'source_number = excluded.source_number',
      'question_type = excluded.question_type',
      'prompt = excluded.prompt',
      'options = excluded.options',
      'accepted_answers = excluded.accepted_answers',
      'source_page = excluded.source_page',
      question.image_url === null
        ? 'image_url = null'
        : 'image_url = excluded.image_url',
      'order_index = excluded.order_index',
      'metadata = excluded.metadata',
    ],
  })
}

function sectionStatement(artifact, section, resource) {
  return insertStatement({
    table: 'exam_sections',
    columns: [
      'id',
      'exam_id',
      'source_key',
      'skill',
      'title',
      'instructions',
      'resource_type',
      'resource_id',
      'order_index',
      'is_required',
      'suggested_time_minutes',
      'metadata',
    ],
    values: [
      `${sqlLiteral(deterministicUuidV5(section.source_key))}::uuid`,
      `${sqlLiteral(deterministicUuidV5(artifact.exam.source_key))}::uuid`,
      sqlLiteral(section.source_key),
      sqlLiteral(section.skill),
      sqlLiteral(resource.title),
      sqlNullableText(resource.instructions),
      sqlLiteral(section.resource_type),
      `${sqlLiteral(deterministicUuidV5(section.resource_source_key))}::uuid`,
      sqlInteger(section.order_index),
      sqlBoolean(section.is_required),
      'null',
      sqlJson(provenanceMetadata(artifact, {
        resource_source_key: section.resource_source_key,
      })),
    ],
    conflictTarget: ['exam_id', 'source_key'],
    updates: [
      'skill = excluded.skill',
      'title = excluded.title',
      'instructions = excluded.instructions',
      'resource_type = excluded.resource_type',
      'resource_id = excluded.resource_id',
      'order_index = excluded.order_index',
      'is_required = excluded.is_required',
      'suggested_time_minutes = excluded.suggested_time_minutes',
      'metadata = excluded.metadata',
    ],
  })
}

export function buildB1SeedSql(artifact) {
  const validation = validateB1Artifact(artifact)
  if (!validation.valid) {
    const details = validation.errors
      .map(({ path, message }) => `${path}: ${message}`)
      .join('\n')
    throw new Error(`Invalid B1 artifact:\n${details}`)
  }

  const resources = new Map([
    ...artifact.activities.map((activity) => [activity.source_key, activity]),
    ...artifact.prompts.map((prompt) => [prompt.source_key, prompt]),
  ])
  const statements = [
    examStatement(artifact),
    ...artifact.activities.map((activity) => activityStatement(artifact, activity)),
    ...artifact.prompts.map((prompt) => promptStatement(artifact, prompt)),
    ...artifact.activities.flatMap((activity) =>
      activity.questions.map((question, orderIndex) =>
        questionStatement(artifact, activity, question, orderIndex))),
    ...artifact.sections.map((section) =>
      sectionStatement(artifact, section, resources.get(section.resource_source_key))),
  ]

  return `begin;\n\n${statements.join('\n\n')}\n\ncommit;\n`
}

async function runCli() {
  const [inputPath, outputPath] = process.argv.slice(2)
  if (!inputPath || !outputPath) {
    console.error(
      'Usage: node scripts/build-b1-seed.mjs <artifact.json> <migration.sql>',
    )
    process.exitCode = 1
    return
  }

  try {
    const artifact = JSON.parse(await readFile(inputPath, 'utf8'))
    const sql = buildB1SeedSql(artifact)
    await writeFile(outputPath, sql, 'utf8')
    console.log(`Generated ${outputPath}`)
  } catch (caught) {
    console.error(caught instanceof Error ? caught.message : String(caught))
    process.exitCode = 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runCli()
}
