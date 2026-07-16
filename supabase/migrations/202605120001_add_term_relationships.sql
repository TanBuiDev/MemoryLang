create table public.term_relationships (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.user_terms(id) on delete cascade,
  target_id uuid not null references public.user_terms(id) on delete cascade,
  relation_type text not null check (relation_type in ('derivative', 'collocation', 'synonym', 'antonym', 'idiom', 'related')),
  created_at timestamptz not null default now(),
  unique(source_id, target_id, relation_type),
  check (source_id <> target_id)
);
create index term_relationships_source_idx on public.term_relationships(source_id);
create index term_relationships_target_idx on public.term_relationships(target_id);
create index term_relationships_type_idx on public.term_relationships(source_id, relation_type);
alter table public.term_relationships enable row level security;
create policy "term_relationships through owned source" on public.term_relationships
for all
using (exists (select 1 from public.user_terms where user_terms.id = term_relationships.source_id and user_terms.user_id = auth.uid()))
with check (exists (select 1 from public.user_terms where user_terms.id = term_relationships.source_id and user_terms.user_id = auth.uid()));
