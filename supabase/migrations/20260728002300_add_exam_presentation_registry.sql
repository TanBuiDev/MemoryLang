alter table public.practice_activities
  add column presentation_type text,
  add column grading_mode text,
  add column content_schema_version integer not null default 1,
  add column content_blocks jsonb not null default '[]'::jsonb,
  add column presentation_config jsonb not null default '{}'::jsonb,
  add column review_config jsonb not null default '{}'::jsonb,
  add constraint practice_activities_presentation_type_check
    check (presentation_type is null or presentation_type in (
      'choice_list', 'boolean_list', 'image_choice_list', 'passage_choice_inline',
      'passage_text_inline', 'passage_questions', 'sentence_transformation',
      'short_answer_list', 'long_form_prompt', 'speaking_script_prompt', 'matching', 'ordering'
    )),
  add constraint practice_activities_grading_mode_check
    check (grading_mode is null or grading_mode in (
      'single_choice', 'exact_text', 'normalized_text', 'manual', 'sample_compare', 'matching', 'ordered_list'
    )),
  add constraint practice_activities_content_schema_version_check
    check (content_schema_version > 0),
  add constraint practice_activities_content_blocks_array_check
    check (jsonb_typeof(content_blocks) = 'array'),
  add constraint practice_activities_presentation_config_object_check
    check (jsonb_typeof(presentation_config) = 'object'),
  add constraint practice_activities_review_config_object_check
    check (jsonb_typeof(review_config) = 'object');

alter table public.practice_prompts
  add column presentation_type text,
  add column grading_mode text,
  add column content_schema_version integer not null default 1,
  add column content_blocks jsonb not null default '[]'::jsonb,
  add column presentation_config jsonb not null default '{}'::jsonb,
  add column review_config jsonb not null default '{}'::jsonb,
  add constraint practice_prompts_presentation_type_check
    check (presentation_type is null or presentation_type in ('long_form_prompt', 'speaking_script_prompt')),
  add constraint practice_prompts_grading_mode_check
    check (grading_mode is null or grading_mode in ('manual', 'sample_compare')),
  add constraint practice_prompts_content_schema_version_check
    check (content_schema_version > 0),
  add constraint practice_prompts_content_blocks_array_check
    check (jsonb_typeof(content_blocks) = 'array'),
  add constraint practice_prompts_presentation_config_object_check
    check (jsonb_typeof(presentation_config) = 'object'),
  add constraint practice_prompts_review_config_object_check
    check (jsonb_typeof(review_config) = 'object');

update public.practice_activities
set
  presentation_type = case source_key
    when 'grammar-use-of-english' then 'choice_list'
    when 'signs' then 'image_choice_list'
    when 'cloze-text-15-william-the-hero' then 'passage_choice_inline'
    when 'sentence-transformation' then 'sentence_transformation'
    when 'listening-text-1' then 'passage_text_inline'
    when 'listening-text-52' then 'boolean_list'
    when 'listening-text-56' then 'boolean_list'
    when 'reading-text-2-coasteering' then 'passage_questions'
    when 'reading-text-3-karina-moore' then 'passage_questions'
    else 'choice_list'
  end,
  grading_mode = case source_key
    when 'sentence-transformation' then 'normalized_text'
    when 'listening-text-1' then 'normalized_text'
    else 'single_choice'
  end,
  content_blocks = case
    when source_key in ('cloze-text-15-william-the-hero', 'listening-text-1') then
      jsonb_build_array(jsonb_build_object('type', 'legacy_passage', 'value', coalesce(passage, content, '')))
    when passage is not null then
      jsonb_build_array(jsonb_build_object('type', 'legacy_passage', 'value', passage))
    when content is not null then
      jsonb_build_array(jsonb_build_object('type', 'legacy_content', 'value', content))
    else '[]'::jsonb
  end,
  presentation_config = case source_key
    when 'sentence-transformation' then jsonb_build_object('normalization_profile', 'ignore_punctuation')
    when 'listening-text-1' then jsonb_build_object('enter_behavior', 'next_gap')
    else '{}'::jsonb
  end
where presentation_type is null;

update public.practice_prompts
set
  presentation_type = case when skill = 'speaking' then 'speaking_script_prompt' else 'long_form_prompt' end,
  grading_mode = 'sample_compare',
  content_blocks = jsonb_build_array(jsonb_build_object('type', 'legacy_prompt', 'value', prompt))
where presentation_type is null;

create or replace function public.start_b1_exam_attempt(
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
  where id = p_exam_id and is_published = true and deleted_at is null;

  if not found then
    raise exception 'exam is not available' using errcode = '42501';
  end if;

  v_is_pro := public.is_user_pro(v_user_id);
  if v_exam.access_tier <> 'free' and not v_is_pro then
    raise exception 'exam requires Pro access' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.exam_sections es
    left join public.practice_activities pa on es.resource_type = 'activity' and pa.id = es.resource_id
    left join public.practice_prompts pp on es.resource_type = 'prompt' and pp.id = es.resource_id
    where es.exam_id = v_exam.id and es.is_required = true
      and (
        (es.resource_type = 'activity' and (pa.id is null or pa.is_published = false or (pa.access_tier <> 'free' and not v_is_pro)))
        or (es.resource_type = 'prompt' and (pp.id is null or pp.is_published = false or (pp.access_tier <> 'free' and not v_is_pro)))
      )
  ) then
    raise exception 'exam has inaccessible required sections' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'exam', jsonb_build_object(
      'id', v_exam.id, 'title', v_exam.title, 'source_key', v_exam.source_key,
      'default_time_minutes', v_exam.default_time_minutes, 'content_schema_version', 2
    ),
    'sections', coalesce(jsonb_agg(section_snapshot order by order_index), '[]'::jsonb)
  ) into v_snapshot
  from (
    select es.order_index, jsonb_build_object(
      'source_key', es.source_key, 'skill', es.skill, 'title', es.title,
      'resource_type', es.resource_type, 'is_required', es.is_required,
      'suggested_time_minutes', es.suggested_time_minutes,
      'resource', case
        when es.resource_type = 'activity' then (
          select jsonb_build_object(
            'id', pa.id, 'source_key', pa.source_key, 'title', pa.title,
            'instructions', pa.instructions, 'content', pa.content, 'passage', pa.passage,
            'audio_url', pa.audio_url, 'activity_type', pa.activity_type,
            'presentation_type', pa.presentation_type, 'grading_mode', pa.grading_mode,
            'content_schema_version', pa.content_schema_version,
            'content_blocks', pa.content_blocks, 'presentation_config', pa.presentation_config,
            'review_config', pa.review_config,
            'questions', coalesce((
              select jsonb_agg(jsonb_build_object(
                'id', pq.id, 'source_key', pq.source_key, 'source_number', pq.source_number,
                'question_type', pq.question_type, 'prompt', pq.prompt,
                'options', coalesce((
                  select jsonb_agg(option - 'is_correct' order by option ->> 'key')
                  from jsonb_array_elements(pq.options) as option
                ), '[]'::jsonb),
                'source_page', pq.source_page, 'image_url', pq.image_url, 'order_index', pq.order_index
              ) order by pq.order_index)
              from public.practice_questions pq where pq.activity_id = pa.id
            ), '[]'::jsonb)
          )
          from public.practice_activities pa
          where pa.id = es.resource_id and pa.is_published = true and (pa.access_tier = 'free' or v_is_pro)
        )
        when es.resource_type = 'prompt' then (
          select jsonb_build_object(
            'id', pp.id, 'source_key', pp.source_key, 'title', pp.title, 'prompt', pp.prompt,
            'instructions', pp.instructions, 'content', pp.content, 'image_url', pp.image_url,
            'audio_url', pp.audio_url, 'source_page', pp.source_page,
            'presentation_type', pp.presentation_type, 'grading_mode', pp.grading_mode,
            'content_schema_version', pp.content_schema_version,
            'content_blocks', pp.content_blocks, 'presentation_config', pp.presentation_config,
            'review_config', pp.review_config
          )
          from public.practice_prompts pp
          where pp.id = es.resource_id and pp.is_published = true and (pp.access_tier = 'free' or v_is_pro)
        )
      end
    ) as section_snapshot
    from public.exam_sections es where es.exam_id = v_exam.id
  ) section_rows
  where section_snapshot ->> 'resource' is not null;

  if jsonb_array_length(v_snapshot -> 'sections') = 0 then
    raise exception 'exam has no accessible sections' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'sections', coalesce(jsonb_agg(section_grading order by order_index), '[]'::jsonb)
  ) into v_grading_snapshot
  from (
    select es.order_index, jsonb_build_object(
      'section_source_key', es.source_key,
      'questions', coalesce((
        select jsonb_agg(jsonb_build_object(
          'source_key', pq.source_key, 'accepted_answers', pq.accepted_answers,
          'correct_option_keys', coalesce((
            select jsonb_agg(option ->> 'key' order by option ->> 'key')
            from jsonb_array_elements(pq.options) as option where (option ->> 'is_correct')::boolean
          ), '[]'::jsonb)
        ) order by pq.order_index)
        from public.practice_questions pq where pq.activity_id = es.resource_id
      ), '[]'::jsonb)
    ) as section_grading
    from public.exam_sections es
    join public.practice_activities pa on pa.id = es.resource_id
    where es.exam_id = v_exam.id and es.resource_type = 'activity'
      and pa.is_published = true and (pa.access_tier = 'free' or v_is_pro)
  ) grading_rows;

  insert into public.exam_attempts (exam_id, user_id, target_duration_seconds, exam_snapshot)
  values (v_exam.id, v_user_id, p_target_duration_seconds, v_snapshot)
  returning * into v_attempt;

  insert into public.exam_attempt_grading_snapshots (attempt_id, grading_snapshot)
  values (v_attempt.id, v_grading_snapshot);

  insert into public.exam_section_attempts (attempt_id, exam_section_source_key)
  select v_attempt.id, section ->> 'source_key'
  from jsonb_array_elements(v_snapshot -> 'sections') as section;

  return v_attempt;
end;
$$;

revoke all on function public.start_b1_exam_attempt(uuid, integer) from public, anon;
grant execute on function public.start_b1_exam_attempt(uuid, integer) to authenticated;
