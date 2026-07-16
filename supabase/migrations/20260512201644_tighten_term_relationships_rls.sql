drop policy if exists "term_relationships through owned source" on public.term_relationships;
drop policy if exists "term_relationships through owned terms" on public.term_relationships;
create policy "term_relationships through owned terms" on public.term_relationships
for all to authenticated
using (
  exists (
    select 1
    from public.user_terms source_term
    where source_term.id = term_relationships.source_id
      and source_term.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.user_terms target_term
    where target_term.id = term_relationships.target_id
      and target_term.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.user_terms source_term
    where source_term.id = term_relationships.source_id
      and source_term.user_id = auth.uid()
  )
  and exists (
    select 1
    from public.user_terms target_term
    where target_term.id = term_relationships.target_id
      and target_term.user_id = auth.uid()
  )
);
