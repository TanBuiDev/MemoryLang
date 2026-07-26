import { spawn } from 'node:child_process'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const SEED_FILE_SUFFIX = '_seed_b1_de_full_copy.sql'
const SOURCE_DOCUMENT = 'DeFull Copy.pdf'

function exactCountAssertion({
  table,
  expectedCount,
  distinctExpression,
  whereClause,
}) {
  return [
    '  if not (',
    `    select count(*) = ${expectedCount}`,
    `      and count(distinct ${distinctExpression}) = ${expectedCount}`,
    `    from public.${table}`,
    whereClause ? `    where ${whereClause}` : '',
    '  ) then',
    `    raise exception 'B1 seed idempotency failed for ${table}';`,
    '  end if;',
  ].filter(Boolean).join('\n')
}

export function buildB1SeedIdempotencySql(seedSql) {
  const transactionMatch = seedSql.match(
    /^\s*begin;\s*([\s\S]*?)\s*commit;\s*$/iu,
  )
  const beginCount = (seedSql.match(/^\s*begin;\s*$/gimu) ?? []).length
  const commitCount = (seedSql.match(/^\s*commit;\s*$/gimu) ?? []).length

  if (!transactionMatch || beginCount !== 1 || commitCount !== 1) {
    throw new Error('Expected seed SQL to contain exactly one begin;/commit; wrapper')
  }

  const seedBody = transactionMatch[1].trim()
  const sourceDocumentFilter =
    `metadata ->> 'source_document' = '${SOURCE_DOCUMENT}'`
  const assertions = [
    exactCountAssertion({
      table: 'exams',
      expectedCount: 1,
      distinctExpression: 'source_key',
      whereClause: "source_key = 'b1-de-full-copy'",
    }),
    exactCountAssertion({
      table: 'practice_activities',
      expectedCount: 11,
      distinctExpression: 'source_key',
      whereClause: sourceDocumentFilter,
    }),
    exactCountAssertion({
      table: 'practice_questions',
      expectedCount: 90,
      distinctExpression: '(activity_id, source_key)',
      whereClause: sourceDocumentFilter,
    }),
    exactCountAssertion({
      table: 'practice_prompts',
      expectedCount: 6,
      distinctExpression: 'source_key',
      whereClause: sourceDocumentFilter,
    }),
    exactCountAssertion({
      table: 'exam_sections',
      expectedCount: 17,
      distinctExpression: '(exam_id, source_key)',
      whereClause: sourceDocumentFilter,
    }),
  ]

  return [
    'begin;',
    '',
    seedBody,
    '',
    'do $b1_seed_idempotency$',
    'begin',
    assertions.join('\n\n'),
    'end;',
    '$b1_seed_idempotency$;',
    '',
    'rollback;',
    '',
  ].join('\n')
}

async function findSeedMigration(projectRoot) {
  const migrationDirectory = join(projectRoot, 'supabase', 'migrations')
  const matches = (await readdir(migrationDirectory))
    .filter((fileName) => fileName.endsWith(SEED_FILE_SUFFIX))

  if (matches.length !== 1) {
    throw new Error(`Expected exactly one B1 seed migration, found ${matches.length}`)
  }

  return join(migrationDirectory, matches[0])
}

export function runPnpmCommand(args, {
  cwd,
  stdio = 'inherit',
} = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const isWindows = process.platform === 'win32'
    const command = isWindows ? (process.env.ComSpec ?? 'cmd.exe') : 'pnpm'
    const commandArguments = isWindows
      ? ['/d', '/s', '/c', 'pnpm', ...args]
      : args
    const child = spawn(
      command,
      commandArguments,
      {
        cwd,
        stdio,
      },
    )

    child.once('error', rejectPromise)
    child.once('exit', (exitCode, signal) => {
      if (exitCode === 0) {
        resolvePromise()
        return
      }

      rejectPromise(new Error(
        `pnpm command failed with `
          + (signal ? `signal ${signal}` : `exit code ${String(exitCode)}`),
      ))
    })
  })
}

async function runCli() {
  const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const seedPath = process.argv[2]
    ? resolve(process.cwd(), process.argv[2])
    : await findSeedMigration(projectRoot)
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'memorylang-b1-seed-'))
  const sqlPath = join(temporaryDirectory, 'b1-seed-idempotency.sql')

  try {
    const seedSql = await readFile(seedPath, 'utf8')
    await writeFile(sqlPath, buildB1SeedIdempotencySql(seedSql), 'utf8')
    await runPnpmCommand(
      ['dlx', 'supabase', 'db', 'query', '--local', '--file', sqlPath],
      { cwd: projectRoot },
    )
    console.log('B1 seed runtime idempotency check passed')
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true })
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await runCli()
  } catch (caught) {
    console.error(caught instanceof Error ? caught.message : String(caught))
    process.exitCode = 1
  }
}
