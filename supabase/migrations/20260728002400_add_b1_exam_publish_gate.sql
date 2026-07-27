-- Publish B1 only after the complete server-side content contract passes.
-- The client checklist is informational; this RPC is the authoritative gate.
create or replace function public.set_b1_exam_published_guarded(
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
  if not public.is_admin() then
    raise exception 'Admin access is required to change B1 publication.';
  end if;

  select id into v_exam_id
  from public.exams
  where source_key = 'b1-de-full-copy'
    and deleted_at is null;

  if v_exam_id is null then
    raise exception 'B1 exam was not found.';
  end if;

  if not p_is_published then
    update public.exams set is_published = false where id = v_exam_id;
    return;
  end if;

  if exists (
    select 1
    from public.exam_sections es
    left join public.practice_activities pa on pa.id = es.resource_id and es.resource_type = 'activity'
    left join public.practice_prompts pp on pp.id = es.resource_id and es.resource_type = 'prompt'
    where es.exam_id = v_exam_id
      and es.is_required
      and (
        (es.resource_type = 'activity' and (pa.id is null or not pa.is_published))
        or (es.resource_type = 'prompt' and (pp.id is null or not pp.is_published))
      )
  ) then
    raise exception 'Every required B1 section must be published before publishing the exam.';
  end if;

  if exists (
    select 1
    from public.exam_sections es
    join public.practice_activities pa on pa.id = es.resource_id
    where es.exam_id = v_exam_id
      and es.is_required
      and es.skill = 'listening'
      and (pa.audio_url is null or btrim(pa.audio_url) = '')
  ) then
    raise exception 'A required Listening section is missing audio.';
  end if;

  if exists (
    select 1
    from public.exam_sections es
    left join public.practice_activities pa on pa.id = es.resource_id and es.resource_type = 'activity'
    left join public.practice_prompts pp on pp.id = es.resource_id and es.resource_type = 'prompt'
    where es.exam_id = v_exam_id
      and es.is_required
      and (
        coalesce(pa.presentation_type, pp.presentation_type) is null
        or coalesce(pa.grading_mode, pp.grading_mode) is null
      )
  ) then
    raise exception 'Every required section needs a presentation type and grading mode.';
  end if;

  if exists (
    select 1
    from public.exam_sections es
    join public.practice_prompts pp on pp.id = es.resource_id
    where es.exam_id = v_exam_id
      and es.is_required
      and (
        btrim(coalesce(pp.prompt, '')) = ''
        or btrim(coalesce(pp.instructions, '')) = ''
        or (pp.grading_mode = 'sample_compare' and not exists (
          select 1 from public.practice_prompt_samples pps where pps.prompt_id = pp.id
        ))
      )
  ) then
    raise exception 'A required Writing/Speaking prompt is incomplete or has no sample.';
  end if;

  if exists (
    select 1
    from public.exam_sections es
    join public.practice_activities pa on pa.id = es.resource_id
    where es.exam_id = v_exam_id
      and es.is_required
      and (
        not exists (select 1 from public.practice_questions pq where pq.activity_id = pa.id)
        or (pa.presentation_type in ('passage_text_inline', 'passage_choice_inline', 'passage_questions')
          and btrim(coalesce(pa.passage, pa.content, '')) = ''
          and jsonb_array_length(pa.content_blocks) = 0)
      )
  ) then
    raise exception 'A required objective section is missing questions or passage content.';
  end if;

  if exists (
    select 1
    from public.exam_sections es
    join public.practice_activities pa on pa.id = es.resource_id
    join public.practice_questions pq on pq.activity_id = pa.id
    where es.exam_id = v_exam_id
      and es.is_required
      and (
        btrim(coalesce(pq.prompt, '')) = ''
        or btrim(coalesce(pq.translation, '')) = ''
        or btrim(coalesce(pq.explanation, '')) = ''
        or (pa.presentation_type in ('choice_list', 'boolean_list', 'image_choice_list', 'passage_choice_inline', 'passage_questions') and (
          jsonb_array_length(coalesce(pq.options, '[]'::jsonb)) < 2
          or (select count(*) from jsonb_array_elements(coalesce(pq.options, '[]'::jsonb)) option where coalesce((option ->> 'is_correct')::boolean, false)) <> 1
        ))
        or (pa.presentation_type in ('passage_text_inline', 'sentence_transformation', 'short_answer_list')
          and jsonb_array_length(coalesce(pq.accepted_answers, '[]'::jsonb)) = 0)
        or (pa.presentation_type = 'image_choice_list' and (pq.image_url is null or btrim(pq.image_url) = ''))
      )
  ) then
    raise exception 'A required B1 question is missing answer, review content, or required media.';
  end if;

  update public.exams set is_published = true where id = v_exam_id;
end;
$function$;

revoke all on function public.set_b1_exam_published_guarded(boolean) from public, anon;
grant execute on function public.set_b1_exam_published_guarded(boolean) to authenticated;
