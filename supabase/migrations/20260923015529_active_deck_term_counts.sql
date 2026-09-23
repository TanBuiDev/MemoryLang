-- Count only terms learners can still open. Invoker security preserves the
-- existing deck_terms/global_terms row policies for each signed-in reader.
create view public.active_deck_term_counts
with (security_invoker = true)
as
select
  dt.deck_id,
  count(*)::integer as term_count
from public.deck_terms as dt
join public.global_terms as gt on gt.id = dt.global_term_id
where gt.deleted_at is null
group by dt.deck_id;

revoke all on public.active_deck_term_counts from public, anon;
grant select on public.active_deck_term_counts to authenticated;
