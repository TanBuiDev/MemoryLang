create or replace function public.increment_term_view_counts(term_ids uuid[])
returns void
language sql
security invoker
set search_path = public
as $$
  update public.user_terms
  set view_count = view_count + 1
  where user_id = auth.uid()
    and id = any(term_ids);
$$;

grant execute on function public.increment_term_view_counts(uuid[]) to authenticated;
