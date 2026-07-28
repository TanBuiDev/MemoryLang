import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = resolve(process.cwd(), 'supabase/migrations/20260728103907_enable_ordering_publish_gate.sql')

describe('ordering publish-gate migration', () => {
  it('validates ordering configuration and excludes it from placeholder-question requirements', () => {
    const sql = readFileSync(migrationPath, 'utf8')

    expect(sql).toContain('create or replace function public.is_valid_ordering_presentation_config')
    expect(sql).toContain("pa.presentation_type not in ('matching', 'ordering')")
    expect(sql).toContain("revoke all on function public.is_valid_ordering_presentation_config(jsonb) from public, anon, authenticated")
  })
})
