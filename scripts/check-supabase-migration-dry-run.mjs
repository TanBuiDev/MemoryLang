import { stdin } from 'node:process'
import { fileURLToPath } from 'node:url'

export function extractDryRunMigrations(output) {
  return [...output.matchAll(/^\s*[•*]\s+([^\s]+[.]sql)\s*$/gmu)]
    .map((match) => match[1])
}

export function assertExpectedMigrationSet(output, expected) {
  if (!/DRY RUN: migrations will \*not\* be pushed/iu.test(output)
    || !/Finished supabase db push[.]/iu.test(output)) {
    throw new Error('Supabase dry-run did not complete successfully')
  }

  const actual = extractDryRunMigrations(output)
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Unexpected migration set. Expected ${JSON.stringify(expected)}, `
      + `received ${JSON.stringify(actual)}`,
    )
  }

  return actual
}

async function readStdin() {
  let output = ''
  stdin.setEncoding('utf8')
  for await (const chunk of stdin) {
    output += chunk
  }
  return output
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const expected = process.argv.slice(2)
  if (expected.length === 0) {
    throw new Error(
      'Usage: <supabase dry-run output> | node '
      + 'scripts/check-supabase-migration-dry-run.mjs <expected.sql> [...]',
    )
  }

  const output = await readStdin()
  const actual = assertExpectedMigrationSet(output, expected)
  console.log(`Dry-run migration gate passed: ${actual.join(', ')}`)
}
