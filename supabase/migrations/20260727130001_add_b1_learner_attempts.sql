-- Created with the Supabase CLI, then ordered immediately after the already-applied
-- vault hardening migrations recorded in remote history.
create table public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'in_progress',
  target_duration_seconds integer not null,
  exam_snapshot jsonb not null,
  current_section_source_key text,
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  submitted_at timestamptz,
  elapsed_seconds integer not null default 0,
  overtime_seconds integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exam_attempts_status_check
    check (status in ('in_progress', 'submitted', 'abandoned')),
  constraint exam_attempts_target_duration_check
    check (target_duration_seconds between 60 and 28800),
  constraint exam_attempts_snapshot_object_check
    check (jsonb_typeof(exam_snapshot) = 'object'),
  constraint exam_attempts_elapsed_seconds_check
    check (elapsed_seconds >= 0),
  constraint exam_attempts_overtime_seconds_check
    check (overtime_seconds >= 0),
  constraint exam_attempts_submission_state_check
    check (
      (status = 'submitted' and submitted_at is not null)
      or (status <> 'submitted' and submitted_at is null)
    )
);

create table public.exam_attempt_grading_snapshots (
  attempt_id uuid primary key references public.exam_attempts(id) on delete cascade,
  grading_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  constraint exam_attempt_grading_snapshots_object_check
    check (jsonb_typeof(grading_snapshot) = 'object')
);

create table public.practice_draft_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  prompt_id uuid not null references public.practice_prompts(id) on delete restrict,
  version_number integer not null,
  content text not null,
  word_count integer not null,
  created_at timestamptz not null default now(),
  constraint practice_draft_versions_number_check
    check (version_number between 1 and 5),
  constraint practice_draft_versions_content_not_blank
    check (length(btrim(content)) > 0),
  constraint practice_draft_versions_word_count_check
    check (word_count >= 0),
  constraint practice_draft_versions_user_prompt_number_key
    unique (user_id, prompt_id, version_number)
);

create table public.exam_section_attempts (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
  exam_section_source_key text not null,
  status text not null default 'not_started',
  progress jsonb not null default '{}'::jsonb,
  score numeric(8, 2),
  max_score numeric(8, 2),
  draft_version_id uuid references public.practice_draft_versions(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exam_section_attempts_status_check
    check (status in ('not_started', 'in_progress', 'completed')),
  constraint exam_section_attempts_progress_object_check
    check (jsonb_typeof(progress) = 'object'),
  constraint exam_section_attempts_score_check
    check (score is null or score >= 0),
  constraint exam_section_attempts_max_score_check
    check (max_score is null or max_score >= 0),
  constraint exam_section_attempts_score_within_max_check
    check (score is null or max_score is null or score <= max_score),
  constraint exam_section_attempts_attempt_section_key
    unique (attempt_id, exam_section_source_key)
);

create index exam_attempts_user_status_updated_idx
  on public.exam_attempts (user_id, status, updated_at desc);
create index exam_attempts_exam_user_idx
  on public.exam_attempts (exam_id, user_id);
create index practice_draft_versions_user_prompt_created_idx
  on public.practice_draft_versions (user_id, prompt_id, created_at desc);
create index exam_section_attempts_attempt_idx
  on public.exam_section_attempts (attempt_id);

create trigger update_exam_attempts_modtime
  before update on public.exam_attempts
  for each row execute function public.update_exams_modtime();
create trigger update_exam_section_attempts_modtime
  before update on public.exam_section_attempts
  for each row execute function public.update_exams_modtime();

alter table public.exam_attempts enable row level security;
alter table public.exam_attempt_grading_snapshots enable row level security;
alter table public.exam_section_attempts enable row level security;
alter table public.practice_draft_versions enable row level security;

revoke all on table
  public.exam_attempts,
  public.exam_attempt_grading_snapshots,
  public.exam_section_attempts,
  public.practice_draft_versions
from anon, authenticated;

grant select on table
  public.exam_attempts,
  public.exam_section_attempts,
  public.practice_draft_versions
to authenticated;
grant delete on table public.practice_draft_versions to authenticated;

create policy "learners can read their own exam attempts"
on public.exam_attempts
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "learners can read their own section attempts"
on public.exam_section_attempts
for select
to authenticated
using (
  exists (
    select 1
    from public.exam_attempts
    where exam_attempts.id = exam_section_attempts.attempt_id
      and exam_attempts.user_id = (select auth.uid())
  )
);

create policy "learners can read their own draft versions"
on public.practice_draft_versions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "learners can delete their own draft versions"
on public.practice_draft_versions
for delete
to authenticated
using ((select auth.uid()) = user_id);

create function public.start_b1_exam_attempt(
  p_exam_id uuid,
  p_target_duration_seconds integer
)
returns public.exam_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_pro boolean := false;
  v_exam public.exams%rowtype;
  v_snapshot jsonb;
  v_grading_snapshot jsonb;
  v_attempt public.exam_attempts%rowtype;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_target_duration_seconds not between 60 and 28800 then
    raise exception 'target duration must be between 60 seconds and 8 hours' using errcode = '22023';
  end if;

  select * into v_exam
  from public.exams
  where id = p_exam_id
    and is_published = true
    and deleted_at is null;

  if not found then
    raise exception 'exam is not available' using errcode = '42501';
  end if;

  v_is_pro := public.is_user_pro(v_user_id);
  if v_exam.access_tier <> 'free' and not v_is_pro then
    raise exception 'exam requires Pro access' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'exam', jsonb_build_object(
      'id', v_exam.id,
      'title', v_exam.title,
      'source_key', v_exam.source_key,
      'default_time_minutes', v_exam.default_time_minutes
    ),
    'sections', coalesce(jsonb_agg(section_snapshot order by order_index), '[]'::jsonb)
  )
  into v_snapshot
  from (
    select
      es.order_index,
      jsonb_build_object(
        'source_key', es.source_key,
        'skill', es.skill,
        'title', es.title,
        'resource_type', es.resource_type,
        'is_required', es.is_required,
        'suggested_time_minutes', es.suggested_time_minutes,
        'resource', case
          when es.resource_type = 'activity' then (
            select jsonb_build_object(
              'id', pa.id,
              'source_key', pa.source_key,
              'title', pa.title,
              'instructions', pa.instructions,
              'content', pa.content,
              'passage', pa.passage,
              'audio_url', pa.audio_url,
              'activity_type', pa.activity_type,
              'questions', coalesce((
                select jsonb_agg(jsonb_build_object(
                  'id', pq.id,
                  'source_key', pq.source_key,
                  'source_number', pq.source_number,
                  'question_type', pq.question_type,
                  'prompt', pq.prompt,
                  'options', coalesce((
                    select jsonb_agg(option - 'is_correct' order by option ->> 'key')
                    from jsonb_array_elements(pq.options) as option
                  ), '[]'::jsonb),
                  'source_page', pq.source_page,
                  'image_url', pq.image_url,
                  'order_index', pq.order_index
                ) order by pq.order_index)
                from public.practice_questions pq
                where pq.activity_id = pa.id
              ), '[]'::jsonb)
            )
            from public.practice_activities pa
            where pa.id = es.resource_id
              and pa.is_published = true
              and (pa.access_tier = 'free' or v_is_pro)
          )
          when es.resource_type = 'prompt' then (
            select jsonb_build_object(
              'id', pp.id,
              'source_key', pp.source_key,
              'title', pp.title,
              'prompt', pp.prompt,
              'instructions', pp.instructions,
              'content', pp.content,
              'image_url', pp.image_url,
              'audio_url', pp.audio_url,
              'source_page', pp.source_page
            )
            from public.practice_prompts pp
            where pp.id = es.resource_id
              and pp.is_published = true
              and (pp.access_tier = 'free' or v_is_pro)
          )
        end
      ) as section_snapshot
    from public.exam_sections es
    where es.exam_id = v_exam.id
  ) section_rows
  where section_snapshot ->> 'resource' is not null;

  if jsonb_array_length(v_snapshot -> 'sections') = 0 then
    raise exception 'exam has no accessible sections' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'sections', coalesce(jsonb_agg(section_grading order by order_index), '[]'::jsonb)
  )
  into v_grading_snapshot
  from (
    select
      es.order_index,
      jsonb_build_object(
        'section_source_key', es.source_key,
        'questions', coalesce((
          select jsonb_agg(jsonb_build_object(
            'source_key', pq.source_key,
            'accepted_answers', pq.accepted_answers,
            'correct_option_keys', coalesce((
              select jsonb_agg(option ->> 'key' order by option ->> 'key')
              from jsonb_array_elements(pq.options) as option
              where (option ->> 'is_correct')::boolean
            ), '[]'::jsonb)
          ) order by pq.order_index)
          from public.practice_questions pq
          where pq.activity_id = es.resource_id
        ), '[]'::jsonb)
      ) as section_grading
    from public.exam_sections es
    join public.practice_activities pa on pa.id = es.resource_id
    where es.exam_id = v_exam.id
      and es.resource_type = 'activity'
      and pa.is_published = true
      and (pa.access_tier = 'free' or v_is_pro)
  ) grading_rows;

  insert into public.exam_attempts (
    exam_id,
    user_id,
    target_duration_seconds,
    exam_snapshot
  )
  values (
    v_exam.id,
    v_user_id,
    p_target_duration_seconds,
    v_snapshot
  )
  returning * into v_attempt;

  insert into public.exam_attempt_grading_snapshots (attempt_id, grading_snapshot)
  values (v_attempt.id, v_grading_snapshot);

  insert into public.exam_section_attempts (attempt_id, exam_section_source_key)
  select v_attempt.id, section ->> 'source_key'
  from jsonb_array_elements(v_snapshot -> 'sections') as section;

  return v_attempt;
end;
$$;

create function public.save_b1_section_attempt_progress(
  p_attempt_id uuid,
  p_exam_section_source_key text,
  p_progress jsonb,
  p_status text default 'in_progress',
  p_draft_version_id uuid default null
)
returns public.exam_section_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_section_attempt public.exam_section_attempts%rowtype;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if jsonb_typeof(p_progress) <> 'object' then
    raise exception 'progress must be an object' using errcode = '22023';
  end if;

  if p_status not in ('not_started', 'in_progress', 'completed') then
    raise exception 'invalid section attempt status' using errcode = '22023';
  end if;

  if p_draft_version_id is not null and not exists (
    select 1
    from public.practice_draft_versions
    where id = p_draft_version_id
      and user_id = v_user_id
  ) then
    raise exception 'draft version is not owned by the learner' using errcode = '42501';
  end if;

  update public.exam_section_attempts
  set
    progress = p_progress,
    status = p_status,
    draft_version_id = p_draft_version_id,
    completed_at = case when p_status = 'completed' then now() else null end
  where attempt_id = p_attempt_id
    and exam_section_source_key = p_exam_section_source_key
    and exists (
      select 1
      from public.exam_attempts
      where exam_attempts.id = p_attempt_id
        and exam_attempts.user_id = v_user_id
        and exam_attempts.status = 'in_progress'
    )
  returning * into v_section_attempt;

  if not found then
    raise exception 'section attempt is not available' using errcode = '42501';
  end if;

  update public.exam_attempts
  set
    current_section_source_key = p_exam_section_source_key,
    last_activity_at = now(),
    elapsed_seconds = greatest(0, floor(extract(epoch from now() - started_at))::integer),
    overtime_seconds = greatest(
      0,
      floor(extract(epoch from now() - started_at))::integer - target_duration_seconds
    )
  where id = p_attempt_id;

  return v_section_attempt;
end;
$$;

create function public.create_practice_draft_version(
  p_prompt_id uuid,
  p_content text
)
returns public.practice_draft_versions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_pro boolean := false;
  v_next_version integer;
  v_word_count integer;
  v_version public.practice_draft_versions%rowtype;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_content, ''))) = 0 or length(p_content) > 30000 then
    raise exception 'draft content must contain between 1 and 30000 characters' using errcode = '22023';
  end if;

  v_is_pro := public.is_user_pro(v_user_id);
  if not exists (
    select 1
    from public.practice_prompts
    where id = p_prompt_id
      and is_published = true
      and (access_tier = 'free' or v_is_pro)
  ) then
    raise exception 'prompt is not available' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':' || p_prompt_id::text, 0));

  select coalesce(max(version_number), 0) + 1
  into v_next_version
  from public.practice_draft_versions
  where user_id = v_user_id
    and prompt_id = p_prompt_id;

  if v_next_version > 5 then
    raise exception 'a prompt can have at most five saved versions' using errcode = '23514';
  end if;

  select cardinality(regexp_split_to_array(btrim(p_content), '\\s+'))
  into v_word_count;

  insert into public.practice_draft_versions (
    user_id,
    prompt_id,
    version_number,
    content,
    word_count
  )
  values (
    v_user_id,
    p_prompt_id,
    v_next_version,
    btrim(p_content),
    v_word_count
  )
  returning * into v_version;

  return v_version;
end;
$$;

revoke all on function public.start_b1_exam_attempt(uuid, integer) from public, anon;
revoke all on function public.save_b1_section_attempt_progress(uuid, text, jsonb, text, uuid) from public, anon;
revoke all on function public.create_practice_draft_version(uuid, text) from public, anon;
grant execute on function public.start_b1_exam_attempt(uuid, integer) to authenticated;
grant execute on function public.save_b1_section_attempt_progress(uuid, text, jsonb, text, uuid) to authenticated;
grant execute on function public.create_practice_draft_version(uuid, text) to authenticated;
