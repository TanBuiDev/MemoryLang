create table public.vocabulary_proposals (
  id uuid primary key default gen_random_uuid(),
  source_text text not null check (char_length(source_text) between 1 and 200),
  normalized_text text not null,
  source_language text not null check (source_language ~ '^[a-z][a-z0-9-]{1,15}$'),
  native_language text not null check (native_language ~ '^[a-z][a-z0-9-]{1,15}$'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  vote_count integer not null default 0 check (vote_count >= 0),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  approved_global_term_id uuid references public.global_terms(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index vocabulary_proposals_pending_unique_idx
  on public.vocabulary_proposals (normalized_text, source_language, native_language)
  where status = 'pending';

create index vocabulary_proposals_review_queue_idx
  on public.vocabulary_proposals (status, vote_count desc, created_at asc);

create table public.vocabulary_proposal_votes (
  proposal_id uuid not null references public.vocabulary_proposals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (proposal_id, user_id)
);

create trigger vocabulary_proposals_set_updated_at
before update on public.vocabulary_proposals
for each row execute function public.set_updated_at();

alter table public.vocabulary_proposals enable row level security;
alter table public.vocabulary_proposal_votes enable row level security;

revoke all on table public.vocabulary_proposals from anon, authenticated;
revoke all on table public.vocabulary_proposal_votes from anon, authenticated;

grant select on table public.vocabulary_proposals to authenticated;

create policy "admins can view vocabulary proposals"
on public.vocabulary_proposals
for select
to authenticated
using ((select public.is_admin()));

create or replace function public.submit_vocabulary_proposal(
  p_source_text text,
  p_source_language text,
  p_native_language text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_source_text text := regexp_replace(btrim(coalesce(p_source_text, '')), '[[:space:]]+', ' ', 'g');
  v_normalized_text text;
  v_source_language text := lower(btrim(coalesce(p_source_language, '')));
  v_native_language text := lower(btrim(coalesce(p_native_language, '')));
  v_proposal_id uuid;
  v_vote_count integer;
  v_created boolean := false;
  v_vote_added boolean := false;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if char_length(v_source_text) < 1 or char_length(v_source_text) > 200 then
    raise exception 'Vocabulary proposal must contain between 1 and 200 characters.' using errcode = '22023';
  end if;

  if v_source_language !~ '^[a-z][a-z0-9-]{1,15}$'
    or v_native_language !~ '^[a-z][a-z0-9-]{1,15}$' then
    raise exception 'Invalid language code.' using errcode = '22023';
  end if;

  v_normalized_text := lower(v_source_text);

  if exists (
    select 1
    from public.global_terms terms
    where terms.normalized_text = v_normalized_text
      and terms.source_language = v_source_language
      and terms.native_language = v_native_language
      and terms.deleted_at is null
  ) then
    return jsonb_build_object('outcome', 'already_available');
  end if;

  insert into public.vocabulary_proposals (
    source_text,
    normalized_text,
    source_language,
    native_language
  )
  values (
    v_source_text,
    v_normalized_text,
    v_source_language,
    v_native_language
  )
  on conflict (normalized_text, source_language, native_language)
    where status = 'pending'
  do nothing
  returning id into v_proposal_id;

  if v_proposal_id is not null then
    v_created := true;
  else
    select proposals.id
    into v_proposal_id
    from public.vocabulary_proposals proposals
    where proposals.normalized_text = v_normalized_text
      and proposals.source_language = v_source_language
      and proposals.native_language = v_native_language
      and proposals.status = 'pending';
  end if;

  if v_proposal_id is null then
    raise exception 'The proposal changed while it was being submitted. Please retry.' using errcode = '40001';
  end if;

  with inserted_vote as (
    insert into public.vocabulary_proposal_votes (proposal_id, user_id)
    values (v_proposal_id, v_user_id)
    on conflict (proposal_id, user_id) do nothing
    returning 1
  )
  select exists(select 1 from inserted_vote) into v_vote_added;

  if v_vote_added then
    update public.vocabulary_proposals
    set vote_count = vote_count + 1
    where id = v_proposal_id
    returning vote_count into v_vote_count;
  else
    select vote_count
    into v_vote_count
    from public.vocabulary_proposals
    where id = v_proposal_id;
  end if;

  return jsonb_build_object(
    'proposal_id', v_proposal_id,
    'vote_count', v_vote_count,
    'outcome', case
      when v_created then 'created'
      when v_vote_added then 'merged'
      else 'already_voted'
    end
  );
end;
$$;

create or replace function public.review_vocabulary_proposal(
  p_proposal_id uuid,
  p_decision text,
  p_term jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_proposal public.vocabulary_proposals%rowtype;
  v_global_term_id uuid;
  v_item_type text;
  v_meanings jsonb;
  v_examples jsonb;
  v_tags text[];
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if not (select public.is_admin()) then
    raise exception 'Administrator access is required.' using errcode = '42501';
  end if;

  if p_decision not in ('approve', 'reject') then
    raise exception 'Decision must be approve or reject.' using errcode = '22023';
  end if;

  select *
  into v_proposal
  from public.vocabulary_proposals
  where id = p_proposal_id
    and status = 'pending'
  for update;

  if not found then
    raise exception 'Pending vocabulary proposal was not found.' using errcode = 'P0002';
  end if;

  if p_decision = 'reject' then
    update public.vocabulary_proposals
    set status = 'rejected',
        reviewed_by = (select auth.uid()),
        reviewed_at = now()
    where id = p_proposal_id;
    return null;
  end if;

  if p_term is null or jsonb_typeof(p_term) <> 'object' then
    raise exception 'Enriched vocabulary data is required for approval.' using errcode = '22023';
  end if;

  v_item_type := coalesce(nullif(p_term ->> 'item_type', ''), 'word');
  if v_item_type not in ('word', 'phrase', 'idiom', 'sentence') then
    raise exception 'Invalid vocabulary item type.' using errcode = '22023';
  end if;

  v_meanings := coalesce(p_term -> 'meanings', '[]'::jsonb);
  v_examples := coalesce(p_term -> 'examples', '[]'::jsonb);
  if jsonb_typeof(v_meanings) <> 'array' or jsonb_typeof(v_examples) <> 'array' then
    raise exception 'Meanings and examples must be arrays.' using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_term -> 'tags', '[]'::jsonb)) <> 'array' then
    raise exception 'Tags must be an array.' using errcode = '22023';
  end if;
  select coalesce(array_agg(value), '{}'::text[])
  into v_tags
  from jsonb_array_elements_text(coalesce(p_term -> 'tags', '[]'::jsonb)) tags(value);

  insert into public.global_terms (
    source_text,
    normalized_text,
    source_language,
    native_language,
    item_type,
    part_of_speech,
    ipa,
    audio_url,
    image_url,
    meanings,
    examples,
    translation,
    note,
    tags,
    source,
    deleted_at
  )
  values (
    v_proposal.source_text,
    v_proposal.normalized_text,
    v_proposal.source_language,
    v_proposal.native_language,
    v_item_type,
    nullif(p_term ->> 'part_of_speech', ''),
    nullif(p_term ->> 'ipa', ''),
    nullif(p_term ->> 'audio_url', ''),
    nullif(p_term ->> 'image_url', ''),
    v_meanings,
    v_examples,
    nullif(p_term ->> 'translation', ''),
    nullif(p_term ->> 'note', ''),
    v_tags,
    'user_proposal',
    null
  )
  on conflict (normalized_text, source_language, native_language)
  do update set
    source_text = excluded.source_text,
    item_type = excluded.item_type,
    part_of_speech = excluded.part_of_speech,
    ipa = excluded.ipa,
    audio_url = excluded.audio_url,
    image_url = excluded.image_url,
    meanings = excluded.meanings,
    examples = excluded.examples,
    translation = excluded.translation,
    note = excluded.note,
    tags = excluded.tags,
    source = excluded.source,
    deleted_at = null,
    updated_at = now()
  returning id into v_global_term_id;

  update public.vocabulary_proposals
  set status = 'approved',
      reviewed_by = (select auth.uid()),
      reviewed_at = now(),
      approved_global_term_id = v_global_term_id
  where id = p_proposal_id;

  return v_global_term_id;
end;
$$;

revoke all on function public.submit_vocabulary_proposal(text, text, text) from public, anon;
revoke all on function public.review_vocabulary_proposal(uuid, text, jsonb) from public, anon;

grant execute on function public.submit_vocabulary_proposal(text, text, text) to authenticated;
grant execute on function public.review_vocabulary_proposal(uuid, text, jsonb) to authenticated;
