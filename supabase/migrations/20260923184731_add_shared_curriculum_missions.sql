-- Shared-curriculum Mission Game foundation.
-- Adds deterministic deck ordering, per-user mission progress, and safe Mission defaults.

alter table public.deck_terms
  add column if not exists order_index integer;

with ranked as (
  select
    deck_id,
    global_term_id,
    row_number() over (
      partition by deck_id
      order by created_at asc, global_term_id asc
    ) - 1 as next_order
  from public.deck_terms
)
update public.deck_terms dt
set order_index = ranked.next_order
from ranked
where dt.deck_id = ranked.deck_id
  and dt.global_term_id = ranked.global_term_id
  and dt.order_index is null;

create unique index if not exists deck_terms_deck_order_index_key
  on public.deck_terms(deck_id, order_index)
  where order_index is not null;

create or replace function public.assign_deck_term_order_index()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.order_index is null then
    perform 1
    from public.decks
    where id = new.deck_id
    for update;

    select coalesce(max(dt.order_index) + 1, 0)
      into new.order_index
    from public.deck_terms dt
    where dt.deck_id = new.deck_id;
  end if;

  return new;
end;
$$;

revoke execute on function public.assign_deck_term_order_index() from public, anon, authenticated;

drop trigger if exists assign_deck_term_order_index on public.deck_terms;
create trigger assign_deck_term_order_index
before insert on public.deck_terms
for each row
execute function public.assign_deck_term_order_index();

drop policy if exists deck_terms_update on public.deck_terms;
create policy deck_terms_update
on public.deck_terms
for update
to authenticated
using (
  exists (
    select 1
    from public.decks
    where decks.id = deck_terms.deck_id
      and decks.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.decks
    where decks.id = deck_terms.deck_id
      and decks.user_id = (select auth.uid())
  )
);

grant update on public.deck_terms to authenticated;

create table if not exists public.game_mission_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  deck_id uuid not null references public.decks(id) on delete cascade,
  curriculum_fingerprint text not null,
  mission_index integer not null check (mission_index >= 0),
  status text not null default 'completed'
    check (status in ('in_progress', 'completed')),
  attempt_count integer not null default 0
    check (attempt_count >= 0),
  best_score integer check (best_score between 0 and 100),
  best_accuracy integer check (best_accuracy between 0 and 100),
  latest_score integer check (latest_score between 0 and 100),
  latest_accuracy integer check (latest_accuracy between 0 and 100),
  first_started_at timestamptz,
  last_started_at timestamptz,
  completed_at timestamptz,
  last_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_mission_progress_identity_key
    unique (user_id, deck_id, curriculum_fingerprint, mission_index)
);

alter table public.game_mission_progress enable row level security;

revoke all on public.game_mission_progress from anon;
grant select, insert, update on public.game_mission_progress to authenticated;
grant all on public.game_mission_progress to service_role;

drop policy if exists game_mission_progress_select_own on public.game_mission_progress;
create policy game_mission_progress_select_own
on public.game_mission_progress
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists game_mission_progress_insert_own on public.game_mission_progress;
create policy game_mission_progress_insert_own
on public.game_mission_progress
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists game_mission_progress_update_own on public.game_mission_progress;
create policy game_mission_progress_update_own
on public.game_mission_progress
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create index if not exists game_mission_progress_user_deck_status_idx
  on public.game_mission_progress(user_id, deck_id, curriculum_fingerprint, status);

create index if not exists game_mission_progress_user_updated_idx
  on public.game_mission_progress(user_id, updated_at desc);

drop trigger if exists set_game_mission_progress_updated_at on public.game_mission_progress;
create trigger set_game_mission_progress_updated_at
before update on public.game_mission_progress
for each row
execute function public.set_updated_at();

create or replace function public.complete_game_mission(
  p_deck_id uuid,
  p_curriculum_fingerprint text,
  p_mission_index integer,
  p_score integer,
  p_accuracy integer
)
returns public.game_mission_progress
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.game_mission_progress;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_mission_index < 0 then
    raise exception 'Invalid mission index';
  end if;

  if p_score < 0 or p_score > 100 or p_accuracy < 0 or p_accuracy > 100 then
    raise exception 'Score and accuracy must be between 0 and 100';
  end if;

  if nullif(btrim(p_curriculum_fingerprint), '') is null then
    raise exception 'Curriculum fingerprint is required';
  end if;

  if not exists (
    select 1
    from public.decks
    where id = p_deck_id
  ) then
    raise exception 'Deck is not accessible';
  end if;

  insert into public.game_mission_progress (
    user_id,
    deck_id,
    curriculum_fingerprint,
    mission_index,
    status,
    attempt_count,
    best_score,
    best_accuracy,
    latest_score,
    latest_accuracy,
    first_started_at,
    last_started_at,
    completed_at,
    last_completed_at
  )
  values (
    v_user_id,
    p_deck_id,
    p_curriculum_fingerprint,
    p_mission_index,
    'completed',
    1,
    p_score,
    p_accuracy,
    p_score,
    p_accuracy,
    now(),
    now(),
    now(),
    now()
  )
  on conflict on constraint game_mission_progress_identity_key
  do update set
    status = 'completed',
    attempt_count = public.game_mission_progress.attempt_count + 1,
    best_score = greatest(coalesce(public.game_mission_progress.best_score, 0), excluded.latest_score),
    best_accuracy = greatest(coalesce(public.game_mission_progress.best_accuracy, 0), excluded.latest_accuracy),
    latest_score = excluded.latest_score,
    latest_accuracy = excluded.latest_accuracy,
    last_started_at = now(),
    completed_at = coalesce(public.game_mission_progress.completed_at, now()),
    last_completed_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.complete_game_mission(uuid, text, integer, integer, integer)
  from public, anon;
grant execute on function public.complete_game_mission(uuid, text, integer, integer, integer)
  to authenticated, service_role;

-- Extend the existing visual Game Hub configuration without changing prior access tiers.
update public.app_settings settings
set value =
  jsonb_set(
    jsonb_set(
      settings.value,
      '{games,mission}',
      coalesce(settings.value #> '{games,mission}', '{"accessTier":"free"}'::jsonb),
      true
    ),
    '{allowedDecks}',
    coalesce(
      (
        select jsonb_agg(
          case
            when item->>'deckId' = 'all' then
              item || jsonb_build_object(
                'missionEnabled', false,
                'termsPerMission', 10,
                'scriptKey', 'standard'
              )
            else
              item || jsonb_build_object(
                'missionEnabled',
                  coalesce((item->>'allowed')::boolean, false)
                  and exists (
                    select 1
                    from public.decks d
                    where d.id::text = item->>'deckId'
                      and (
                        select count(*)
                        from public.deck_terms dt
                        join public.global_terms gt on gt.id = dt.global_term_id
                        where dt.deck_id = d.id
                          and gt.deleted_at is null
                      ) >= 5
                  ),
                'termsPerMission', 10,
                'scriptKey', 'standard'
              )
          end
        )
        from jsonb_array_elements(coalesce(settings.value->'allowedDecks', '[]'::jsonb)) item
      ),
      '[]'::jsonb
    ),
    true
  )
where settings.key = 'game_hub_config';
