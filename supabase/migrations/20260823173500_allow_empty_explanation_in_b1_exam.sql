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
      btrim(coalesce(pq.prompt, '')) = '' or btrim(coalesce(pq.translation, '')) = ''
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
