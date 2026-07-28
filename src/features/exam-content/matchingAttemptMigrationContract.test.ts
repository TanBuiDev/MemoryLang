import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = resolve(process.cwd(), 'supabase/migrations/20260728101005_secure_matching_attempt_grading.sql')

describe('matching attempt migration', () => {
  it('keeps matching answer pairs in the private grading snapshot only', () => {
    const sql = readFileSync(migrationPath, 'utf8')

    expect(sql).toContain("when pa.presentation_type = 'matching' then jsonb_build_object")
    expect(sql).toContain("'leftItems', coalesce(pa.presentation_config #> '{matching,leftItems}'")
    expect(sql).toContain("'rightItems', coalesce(pa.presentation_config #> '{matching,rightItems}'")
    expect(sql).toContain("'presentation_config', pa.presentation_config")
  })

  it('grades matching selections from the grading snapshot and retains guarded RPC ACLs', () => {
    const sql = readFileSync(migrationPath, 'utf8')

    expect(sql).toContain("'matching:' || (left_item.value ->> 'id')")
    expect(sql).toContain("progress -> 'answers' ->> ((grading_sections.section_grading")
    expect(sql).toContain('from public.exam_attempt_grading_snapshots')
    expect(sql).toContain('revoke all on function public.submit_b1_exam_attempt(uuid) from public, anon')
    expect(sql).toContain('grant execute on function public.submit_b1_exam_attempt(uuid) to authenticated')
  })
})
