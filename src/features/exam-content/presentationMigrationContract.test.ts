import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = resolve(process.cwd(), 'supabase/migrations/20260728002300_add_exam_presentation_registry.sql')

describe('exam presentation migration', () => {
  it('adds presentation metadata to the learner snapshot without copying option correctness', () => {
    const sql = readFileSync(migrationPath, 'utf8')

    expect(sql).toContain("'presentation_type', pa.presentation_type")
    expect(sql).toContain("'grading_mode', pa.grading_mode")
    expect(sql).toContain("'content_blocks', pa.content_blocks")
    expect(sql).toContain('option - \'is_correct\'')
  })

  it('backfills every current B1 resource with a concrete presentation type', () => {
    const sql = readFileSync(migrationPath, 'utf8')

    expect(sql).toContain("'passage_text_inline'")
    expect(sql).toContain("'sentence_transformation'")
    expect(sql).toContain("'speaking_script_prompt'")
  })
})
