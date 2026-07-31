create or replace function public.b1_exam_generated_source_key(
  p_exam_id uuid,
  p_request_id uuid,
  p_resource_kind text,
  p_skill text
)
returns text
language sql
volatile
set search_path = ''
as $$
  select pg_catalog.format(
    'b1-%s-%s-%s-%s-%s',
    p_resource_kind,
    p_skill,
    pg_catalog.substr(pg_catalog.replace(p_exam_id::text, '-', ''), 1, 12),
    pg_catalog.substr(pg_catalog.replace(p_request_id::text, '-', ''), 1, 12),
    pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '')
  );
$$;

revoke all on function public.b1_exam_generated_source_key(uuid, uuid, text, text)
  from public, anon, authenticated;

create or replace function public.b1_exam_blank_activity_payload(p_skill text)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'activity_type', 'multiple_choice',
    'presentation_type', 'choice_list',
    'grading_mode', 'single_choice',
    'question_type', 'multiple_choice',
    'options', pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('key', 'A', 'text', '', 'is_correct', true),
      pg_catalog.jsonb_build_object('key', 'B', 'text', '', 'is_correct', false),
      pg_catalog.jsonb_build_object('key', 'C', 'text', '', 'is_correct', false),
      pg_catalog.jsonb_build_object('key', 'D', 'text', '', 'is_correct', false)
    )
  )
  where p_skill in ('reading', 'listening');
$$;

revoke all on function public.b1_exam_blank_activity_payload(text)
  from public, anon, authenticated;

create or replace function public.b1_exam_blank_prompt_payload(p_skill text)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'presentation_type', case
      when p_skill = 'writing' then 'long_form_prompt'
      else 'speaking_script_prompt'
    end,
    'grading_mode', 'manual',
    'prompt', ''
  )
  where p_skill in ('writing', 'speaking');
$$;

revoke all on function public.b1_exam_blank_prompt_payload(text)
  from public, anon, authenticated;

create or replace function public.create_b1_exam(
  p_request_id uuid,
  p_title text,
  p_description text,
  p_access_tier text,
  p_default_time_minutes integer,
  p_initialization_mode text,
  p_source_exam_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_exam_id uuid;
  v_exam_id uuid := pg_catalog.gen_random_uuid();
  v_exam_source_key text;
  v_resource_id uuid;
  v_resource_source_key text;
  v_section_source_key text;
  v_question_source_key text;
  v_resource_payload jsonb;
  v_section record;
begin
  if auth.uid() is null or not security.has_permission('exam.create') then
    raise exception using errcode = '42501', message = 'B1_CREATE_FORBIDDEN';
  end if;
  if p_request_id is null then
    raise exception using errcode = '22023', message = 'B1_REQUEST_ID_REQUIRED';
  end if;
  if btrim(coalesce(p_title, '')) = '' then
    raise exception using errcode = '22023', message = 'B1_TITLE_REQUIRED';
  end if;
  if p_default_time_minutes is null or p_default_time_minutes not between 1 and 480 then
    raise exception using errcode = '22023', message = 'B1_DURATION_INVALID';
  end if;
  if p_access_tier not in ('free', 'pro') or p_access_tier is null then
    raise exception using errcode = '22023', message = 'B1_ACCESS_TIER_INVALID';
  end if;
  if p_initialization_mode <> 'blank' or p_initialization_mode is null then
    raise exception using errcode = '22023', message = 'B1_MODE_INVALID';
  end if;
  if p_source_exam_id is not null then
    raise exception using errcode = '22023', message = 'B1_SOURCE_NOT_ALLOWED';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || ':' || p_request_id::text, 0)
  );

  select requests.exam_id
  into v_existing_exam_id
  from public.b1_exam_creation_requests requests
  where requests.requested_by = v_user_id
    and requests.request_id = p_request_id;

  if v_existing_exam_id is not null then
    return v_existing_exam_id;
  end if;

  v_exam_source_key := public.b1_exam_generated_source_key(
    v_exam_id,
    p_request_id,
    'exam',
    'b1'
  );

  insert into public.exams (
    id,
    title,
    category,
    description,
    time_limit_minutes,
    total_questions,
    is_published,
    access_tier,
    created_by,
    source_key,
    cefr_level,
    default_time_minutes,
    exam_format,
    cloned_from_exam_id,
    clone_mode
  )
  values (
    v_exam_id,
    btrim(p_title),
    'GENERAL',
    p_description,
    p_default_time_minutes,
    0,
    false,
    p_access_tier,
    v_user_id,
    v_exam_source_key,
    'B1',
    p_default_time_minutes,
    'b1_practice',
    null,
    null
  );

  for v_section in
    select *
    from (
      values
        (1, 'Reading'::text, 'reading'::text, 'activity'::text),
        (2, 'Listening'::text, 'listening'::text, 'activity'::text),
        (3, 'Writing'::text, 'writing'::text, 'prompt'::text),
        (4, 'Speaking'::text, 'speaking'::text, 'prompt'::text)
    ) as section_specs(order_index, title, skill, resource_type)
    order by order_index
  loop
    v_resource_id := pg_catalog.gen_random_uuid();
    v_resource_source_key := public.b1_exam_generated_source_key(
      v_exam_id,
      p_request_id,
      v_section.resource_type,
      v_section.skill
    );
    v_section_source_key := public.b1_exam_generated_source_key(
      v_exam_id,
      p_request_id,
      'section',
      v_section.skill
    );

    if v_section.resource_type = 'activity' then
      v_resource_payload := public.b1_exam_blank_activity_payload(v_section.skill);

      insert into public.practice_activities (
        id,
        source_key,
        skill,
        activity_type,
        title,
        is_published,
        access_tier,
        created_by,
        presentation_type,
        grading_mode
      )
      values (
        v_resource_id,
        v_resource_source_key,
        v_section.skill,
        v_resource_payload ->> 'activity_type',
        v_section.title,
        false,
        p_access_tier,
        v_user_id,
        v_resource_payload ->> 'presentation_type',
        v_resource_payload ->> 'grading_mode'
      );

      v_question_source_key := public.b1_exam_generated_source_key(
        v_exam_id,
        p_request_id,
        'question',
        v_section.skill
      );

      insert into public.practice_questions (
        activity_id,
        source_key,
        source_number,
        question_type,
        prompt,
        options,
        accepted_answers,
        order_index
      )
      values (
        v_resource_id,
        v_question_source_key,
        '1',
        v_resource_payload ->> 'question_type',
        '',
        v_resource_payload -> 'options',
        '[]'::jsonb,
        0
      );
    else
      v_resource_payload := public.b1_exam_blank_prompt_payload(v_section.skill);

      insert into public.practice_prompts (
        id,
        source_key,
        skill,
        title,
        prompt,
        is_published,
        access_tier,
        created_by,
        presentation_type,
        grading_mode
      )
      values (
        v_resource_id,
        v_resource_source_key,
        v_section.skill,
        v_section.title,
        v_resource_payload ->> 'prompt',
        false,
        p_access_tier,
        v_user_id,
        v_resource_payload ->> 'presentation_type',
        v_resource_payload ->> 'grading_mode'
      );
    end if;

    insert into public.exam_sections (
      exam_id,
      source_key,
      skill,
      title,
      resource_type,
      resource_id,
      order_index,
      is_required
    )
    values (
      v_exam_id,
      v_section_source_key,
      v_section.skill,
      v_section.title,
      v_section.resource_type,
      v_resource_id,
      v_section.order_index,
      true
    );
  end loop;

  insert into public.b1_exam_creation_requests (requested_by, request_id, exam_id)
  values (v_user_id, p_request_id, v_exam_id);

  return v_exam_id;
end;
$$;

revoke all on function public.create_b1_exam(uuid, text, text, text, integer, text, uuid)
  from public, anon;
grant execute on function public.create_b1_exam(uuid, text, text, text, integer, text, uuid)
  to authenticated;
