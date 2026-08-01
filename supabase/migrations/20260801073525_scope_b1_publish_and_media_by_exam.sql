drop function if exists public.set_b1_exam_published_guarded(boolean);

create or replace function public.set_b1_exam_published_guarded(
  p_exam_id uuid,
  p_is_published boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_exam_id uuid;
begin
  if auth.uid() is null or not security.has_permission('exam.publish') then
    raise exception using errcode = '42501', message = 'B1_PUBLISH_FORBIDDEN';
  end if;

  select exam.id
  into v_exam_id
  from public.exams exam
  where exam.id = p_exam_id
    and exam.exam_format = 'b1_practice'
    and exam.deleted_at is null;

  if v_exam_id is null then
    raise exception using errcode = '22023', message = 'B1_EXAM_UNAVAILABLE';
  end if;

  if not p_is_published then
    update public.exams
    set is_published = false
    where id = v_exam_id;
    return;
  end if;

  if exists (
    select 1
    from public.exam_sections es
    left join public.practice_activities pa on pa.id = es.resource_id and es.resource_type = 'activity'
    left join public.practice_prompts pp on pp.id = es.resource_id and es.resource_type = 'prompt'
    where es.exam_id = v_exam_id and es.is_required and (
      (es.resource_type = 'activity' and (pa.id is null or not pa.is_published))
      or (es.resource_type = 'prompt' and (pp.id is null or not pp.is_published))
    )
  ) then raise exception 'Every required B1 section must be published before publishing the exam.'; end if;

  if exists (
    select 1
    from public.exam_sections es
    join public.practice_activities pa on pa.id = es.resource_id
    where es.exam_id = v_exam_id and es.is_required and es.skill = 'listening'
      and (pa.audio_url is null or btrim(pa.audio_url) = '')
  ) then raise exception 'A required Listening section is missing audio.'; end if;

  if exists (
    select 1
    from public.exam_sections es
    left join public.practice_activities pa on pa.id = es.resource_id and es.resource_type = 'activity'
    left join public.practice_prompts pp on pp.id = es.resource_id and es.resource_type = 'prompt'
    where es.exam_id = v_exam_id and es.is_required
      and (coalesce(pa.presentation_type, pp.presentation_type) is null or coalesce(pa.grading_mode, pp.grading_mode) is null)
  ) then raise exception 'Every required section needs a presentation type and grading mode.'; end if;

  if exists (
    select 1
    from public.exam_sections es
    join public.practice_prompts pp on pp.id = es.resource_id
    where es.exam_id = v_exam_id and es.is_required and (
      btrim(coalesce(pp.prompt, '')) = '' or btrim(coalesce(pp.instructions, '')) = ''
      or (pp.grading_mode = 'sample_compare' and not exists (
        select 1 from public.practice_prompt_samples pps where pps.prompt_id = pp.id
      ))
    )
  ) then raise exception 'A required Writing/Speaking prompt is incomplete or has no sample.'; end if;

  if exists (
    select 1
    from public.exam_sections es
    join public.practice_activities pa on pa.id = es.resource_id
    where es.exam_id = v_exam_id and es.is_required and pa.presentation_type = 'matching'
      and not public.is_valid_matching_presentation_config(pa.presentation_config)
  ) then raise exception 'A required matching section has an incomplete one-to-one configuration.'; end if;

  if exists (
    select 1
    from public.exam_sections es
    join public.practice_activities pa on pa.id = es.resource_id
    where es.exam_id = v_exam_id and es.is_required and pa.presentation_type = 'ordering'
      and not public.is_valid_ordering_presentation_config(pa.presentation_config)
  ) then raise exception 'A required ordering section has an incomplete ordered configuration.'; end if;

  if exists (
    select 1
    from public.exam_sections es
    join public.practice_activities pa on pa.id = es.resource_id
    where es.exam_id = v_exam_id and es.is_required and pa.presentation_type not in ('matching', 'ordering') and (
      not exists (select 1 from public.practice_questions pq where pq.activity_id = pa.id)
      or (pa.presentation_type in ('passage_text_inline', 'passage_choice_inline', 'passage_questions')
        and btrim(coalesce(pa.passage, pa.content, '')) = '' and jsonb_array_length(pa.content_blocks) = 0)
    )
  ) then raise exception 'A required objective section is missing questions or passage content.'; end if;

  if exists (
    select 1
    from public.exam_sections es
    join public.practice_activities pa on pa.id = es.resource_id
    join public.practice_questions pq on pq.activity_id = pa.id
    where es.exam_id = v_exam_id and es.is_required and pa.presentation_type not in ('matching', 'ordering') and (
      btrim(coalesce(pq.prompt, '')) = '' or btrim(coalesce(pq.translation, '')) = '' or btrim(coalesce(pq.explanation, '')) = ''
      or (pa.presentation_type in ('choice_list', 'boolean_list', 'image_choice_list', 'passage_choice_inline', 'passage_questions') and (
        jsonb_array_length(coalesce(pq.options, '[]'::jsonb)) < 2
        or (select count(*) from jsonb_array_elements(coalesce(pq.options, '[]'::jsonb)) option where coalesce((option ->> 'is_correct')::boolean, false)) <> 1
      ))
      or (pa.presentation_type in ('passage_text_inline', 'sentence_transformation', 'short_answer_list')
        and jsonb_array_length(coalesce(pq.accepted_answers, '[]'::jsonb)) = 0)
      or (pa.presentation_type = 'image_choice_list' and (pq.image_url is null or btrim(pq.image_url) = ''))
    )
  ) then raise exception 'A required B1 question is missing answer, review content, or required media.'; end if;

  update public.exams set is_published = true where id = v_exam_id;
end;
$function$;

revoke all on function public.set_b1_exam_published_guarded(uuid, boolean) from public, anon;
grant execute on function public.set_b1_exam_published_guarded(uuid, boolean) to authenticated;

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
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if p_target_duration_seconds not between 60 and 28800 then
    raise exception 'target duration must be between 60 seconds and 8 hours' using errcode = '22023';
  end if;

  select * into v_exam from public.exams
  where id = p_exam_id and exam_format = 'b1_practice' and is_published = true and deleted_at is null;
  if not found then raise exception 'exam is not available' using errcode = '42501'; end if;

  v_is_pro := public.is_user_pro(v_user_id);
  if v_exam.access_tier <> 'free' and not v_is_pro then raise exception 'exam requires Pro access' using errcode = '42501'; end if;

  if exists (
    select 1 from public.exam_sections es
    left join public.practice_activities pa on es.resource_type = 'activity' and pa.id = es.resource_id
    left join public.practice_prompts pp on es.resource_type = 'prompt' and pp.id = es.resource_id
    where es.exam_id = v_exam.id and es.is_required and (
      (es.resource_type = 'activity' and (pa.id is null or pa.is_published = false or (pa.access_tier <> 'free' and not v_is_pro)))
      or (es.resource_type = 'prompt' and (pp.id is null or pp.is_published = false or (pp.access_tier <> 'free' and not v_is_pro)))
    )
  ) then raise exception 'exam has inaccessible required sections' using errcode = '42501'; end if;

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
      'resource', case when es.resource_type = 'activity' then (
        select jsonb_build_object(
          'id', pa.id, 'source_key', pa.source_key, 'title', pa.title,
          'instructions', pa.instructions, 'content', pa.content, 'passage', pa.passage,
          'audio_url', pa.audio_url, 'activity_type', pa.activity_type,
          'presentation_type', pa.presentation_type, 'grading_mode', pa.grading_mode,
          'content_schema_version', pa.content_schema_version, 'content_blocks', pa.content_blocks,
          'presentation_config', case when pa.presentation_type = 'matching' then jsonb_build_object(
            'matching', jsonb_build_object(
              'leftItems', coalesce(pa.presentation_config #> '{matching,leftItems}', '[]'::jsonb),
              'rightItems', coalesce(pa.presentation_config #> '{matching,rightItems}', '[]'::jsonb)
            )
          ) else pa.presentation_config end,
          'review_config', pa.review_config,
          'questions', coalesce((
            select jsonb_agg(jsonb_build_object(
              'id', pq.id, 'source_key', pq.source_key, 'source_number', pq.source_number,
              'question_type', pq.question_type, 'prompt', pq.prompt,
              'options', coalesce((
                select jsonb_agg(option - 'is_correct' order by option ->> 'key')
                from jsonb_array_elements(pq.options) option
              ), '[]'::jsonb),
              'source_page', pq.source_page, 'image_url', pq.image_url, 'order_index', pq.order_index
            ) order by pq.order_index)
            from public.practice_questions pq where pq.activity_id = pa.id
          ), '[]'::jsonb)
        )
        from public.practice_activities pa
        where pa.id = es.resource_id and pa.is_published = true and (pa.access_tier = 'free' or v_is_pro)
      ) when es.resource_type = 'prompt' then (
        select jsonb_build_object(
          'id', pp.id, 'source_key', pp.source_key, 'title', pp.title, 'prompt', pp.prompt,
          'instructions', pp.instructions, 'content', pp.content, 'image_url', pp.image_url,
          'audio_url', pp.audio_url, 'source_page', pp.source_page,
          'presentation_type', pp.presentation_type, 'grading_mode', pp.grading_mode,
          'content_schema_version', pp.content_schema_version, 'content_blocks', pp.content_blocks,
          'presentation_config', pp.presentation_config, 'review_config', pp.review_config
        )
        from public.practice_prompts pp
        where pp.id = es.resource_id and pp.is_published = true and (pp.access_tier = 'free' or v_is_pro)
      ) end
    ) section_snapshot
    from public.exam_sections es where es.exam_id = v_exam.id
  ) section_rows
  where section_snapshot ->> 'resource' is not null;

  if jsonb_array_length(v_snapshot -> 'sections') = 0 then raise exception 'exam has no accessible sections' using errcode = '42501'; end if;

  select jsonb_build_object('sections', coalesce(jsonb_agg(section_grading order by order_index), '[]'::jsonb))
  into v_grading_snapshot
  from (
    select es.order_index, jsonb_build_object(
      'section_source_key', es.source_key,
      'presentation_type', pa.presentation_type,
      'presentation_config', pa.presentation_config,
      'questions', coalesce((
        select jsonb_agg(jsonb_build_object(
          'source_key', pq.source_key, 'order_index', pq.order_index, 'prompt', pq.prompt,
          'accepted_answers', pq.accepted_answers, 'translation', pq.translation, 'explanation', pq.explanation,
          'correct_option_keys', coalesce((
            select jsonb_agg(option ->> 'key' order by option ->> 'key')
            from jsonb_array_elements(pq.options) option where coalesce((option ->> 'is_correct')::boolean, false)
          ), '[]'::jsonb)
        ) order by pq.order_index)
        from public.practice_questions pq where pq.activity_id = es.resource_id
      ), '[]'::jsonb)
    ) section_grading
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
  select v_attempt.id, section ->> 'source_key' from jsonb_array_elements(v_snapshot -> 'sections') section;
  return v_attempt;
end;
$$;

revoke all on function public.start_b1_exam_attempt(uuid, integer) from public, anon;
grant execute on function public.start_b1_exam_attempt(uuid, integer) to authenticated;
