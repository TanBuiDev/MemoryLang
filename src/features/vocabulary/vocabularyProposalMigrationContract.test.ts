import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationsDirectory = resolve(process.cwd(), 'supabase/migrations')

function readProposalMigration(): string {
  const migrationName = readdirSync(migrationsDirectory)
    .find((file) => file.endsWith('_add_vocabulary_proposals.sql'))

  expect(migrationName).toBeDefined()
  return readFileSync(resolve(migrationsDirectory, migrationName!), 'utf8')
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

describe('vocabulary proposal migration', () => {
  it('merges duplicate pending proposals into one canonical row and one vote per learner', () => {
    const sql = readProposalMigration()

    expect(sql).toContain('create table public.vocabulary_proposals')
    expect(sql).toContain('create table public.vocabulary_proposal_votes')
    expect(sql).toContain('primary key (proposal_id, user_id)')
    expect(sql).toContain("where status = 'pending'")
    expect(sql).toContain('create or replace function public.submit_vocabulary_proposal')
    expect(sql).toContain('on conflict (proposal_id, user_id) do nothing')
  })

  it('keeps learner writes behind authenticated RPCs and admin review behind is_admin', () => {
    const sql = readProposalMigration()

    expect(sql).toContain('enable row level security')
    expect(sql).toContain('revoke all on table public.vocabulary_proposals from anon, authenticated')
    expect(sql).toContain('revoke all on table public.vocabulary_proposal_votes from anon, authenticated')
    expect(sql).toContain('set search_path = \'\'')
    expect(sql).toContain('if (select auth.uid()) is null then')
    expect(sql).toContain('if not (select public.is_admin()) then')
    expect(sql).toContain('grant execute on function public.submit_vocabulary_proposal(text, text, text) to authenticated')
    expect(sql).toContain('grant execute on function public.review_vocabulary_proposal(uuid, text, jsonb) to authenticated')
  })

  it('adds approved proposals only to the global library', () => {
    const sql = readProposalMigration()

    expect(sql).toContain('insert into public.global_terms')
    expect(sql).not.toContain('insert into public.user_terms')
  })
})
