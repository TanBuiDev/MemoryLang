import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = resolve(process.cwd(), 'supabase/migrations/20260728102823_add_ordering_attempt_grading.sql')

describe('ordering attempt migration', () => {
  it('redacts correct positions from the learner snapshot and grades ordering from the private snapshot', () => {
    const sql = readFileSync(migrationPath, 'utf8')

    expect(sql).toContain("section.value #>> '{resource,presentation_type}' = 'ordering'")
    expect(sql).toContain("item - 'correctPosition'")
    expect(sql).toContain("item.value ->> 'presentation_type' = 'ordering'")
    expect(sql).toContain("'question_source_key', 'ordering'")
  })
})
