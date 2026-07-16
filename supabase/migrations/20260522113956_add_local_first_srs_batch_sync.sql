alter table public.user_terms
  add column if not exists srs_repetition int not null default 0,
  add column if not exists srs_interval_days int not null default 0,
  add column if not exists srs_ease_factor numeric(4,2) not null default 2.5;
create or replace function public.apply_study_review_batch(
  actions jsonb default '[]'::jsonb,
  viewed_term_ids uuid[] default '{}'::uuid[],
  session_patch jsonb default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_action jsonb;
  current_session_id uuid;
begin
  for current_action in
    select value
    from jsonb_array_elements(coalesce(actions, '[]'::jsonb))
  loop
    update public.user_terms
    set
      correct_count = correct_count + coalesce((current_action->>'correct_increment')::int, 0),
      wrong_count = wrong_count + coalesce((current_action->>'wrong_increment')::int, 0),
      status = coalesce(current_action->>'status', status),
      last_reviewed_at = coalesce((current_action->>'reviewed_at')::timestamptz, now()),
      next_review_at = nullif(current_action->>'next_review_at', '')::timestamptz,
      srs_repetition = coalesce((current_action->>'srs_repetition')::int, srs_repetition),
      srs_interval_days = coalesce((current_action->>'srs_interval_days')::int, srs_interval_days),
      srs_ease_factor = coalesce((current_action->>'srs_ease_factor')::numeric(4,2), srs_ease_factor)
    where user_id = auth.uid()
      and id = (current_action->>'term_id')::uuid;
  end loop;

  if coalesce(array_length(viewed_term_ids, 1), 0) > 0 then
    update public.user_terms
    set view_count = view_count + 1
    where user_id = auth.uid()
      and id in (select distinct unnest(viewed_term_ids));
  end if;

  if session_patch is not null and session_patch ? 'session_id' then
    current_session_id := nullif(session_patch->>'session_id', '')::uuid;

    if current_session_id is not null then
      update public.study_sessions
      set
        total_cards = coalesce((session_patch->>'total_cards')::int, total_cards),
        viewed_cards = coalesce((session_patch->>'viewed_cards')::int, viewed_cards),
        remembered_count = coalesce((session_patch->>'remembered_count')::int, remembered_count),
        difficult_count = coalesce((session_patch->>'difficult_count')::int, difficult_count),
        ended_at = now()
      where id = current_session_id
        and user_id = auth.uid();
    end if;
  end if;
end;
$$;
grant execute on function public.apply_study_review_batch(jsonb, uuid[], jsonb) to authenticated;
