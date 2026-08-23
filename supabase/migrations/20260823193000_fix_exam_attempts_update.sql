create or replace function public.submit_b1_exam_attempt(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_attempt public.exam_attempts%rowtype;
  v_reviews jsonb := '[]'::jsonb;
  v_total_score integer := 0;
  v_total_questions integer := 0;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  select * into v_attempt from public.exam_attempts
  where id = p_attempt_id and user_id = v_user_id and status = 'in_progress' for update;
  if not found then raise exception 'attempt is not available for submission' using errcode = '42501'; end if;

  with grading_sections as (
    select section.value as section_grading, section.ordinality::integer as section_order
    from public.exam_attempt_grading_snapshots grading
    cross join lateral jsonb_array_elements(grading.grading_snapshot -> 'sections') with ordinality section(value, ordinality)
    where grading.attempt_id = v_attempt.id
  ), standard_reviews as (
    select grading_sections.section_order, question.ordinality::integer as question_order,
      jsonb_build_object(
        'section_source_key', grading_sections.section_grading ->> 'section_source_key',
        'question_source_key', question.value ->> 'source_key',
        'question', question.value ->> 'prompt',
        'user_answer', coalesce(section_attempt.progress -> 'answers' ->> (question.value ->> 'source_key'), ''),
        'correct_option_keys', coalesce(question.value -> 'correct_option_keys', '[]'::jsonb),
        'accepted_answers', coalesce(question.value -> 'accepted_answers', '[]'::jsonb),
        'translation', question.value ->> 'translation', 'explanation', question.value ->> 'explanation',
        'is_correct', (
          coalesce(section_attempt.progress -> 'answers' ->> (question.value ->> 'source_key'), '') = any(array(select value #>> '{}' from jsonb_array_elements(coalesce(question.value -> 'correct_option_keys', '[]'::jsonb))))
          or lower(btrim(coalesce(section_attempt.progress -> 'answers' ->> (question.value ->> 'source_key'), ''))) = any(array(select lower(btrim(value #>> '{}')) from jsonb_array_elements(coalesce(question.value -> 'accepted_answers', '[]'::jsonb)) value))
          or (grading_sections.section_grading ->> 'presentation_type' = 'sentence_transformation'
            and (
              regexp_replace(lower(btrim(regexp_replace(coalesce(section_attempt.progress -> 'answers' ->> (question.value ->> 'source_key'), ''), '[[:punct:]]', '', 'g'))), '\s+', ' ', 'g')
                = any(array(select regexp_replace(lower(btrim(regexp_replace(value #>> '{}', '[[:punct:]]', '', 'g'))), '\s+', ' ', 'g') from jsonb_array_elements(coalesce(question.value -> 'accepted_answers', '[]'::jsonb)) value))
              or
              regexp_replace(lower(btrim(regexp_replace(
                concat_ws(' ', 
                  trim((regexp_split_to_array(split_part(question.value ->> 'prompt', E'\n', 2), '[.]{3,}|_{3,}|…'))[1]),
                  trim(coalesce(section_attempt.progress -> 'answers' ->> (question.value ->> 'source_key'), '')),
                  trim((regexp_split_to_array(split_part(question.value ->> 'prompt', E'\n', 2), '[.]{3,}|_{3,}|…'))[2])
                )
              , '[[:punct:]]', '', 'g'))), '\s+', ' ', 'g')
                = any(array(select regexp_replace(lower(btrim(regexp_replace(value #>> '{}', '[[:punct:]]', '', 'g'))), '\s+', ' ', 'g') from jsonb_array_elements(coalesce(question.value -> 'accepted_answers', '[]'::jsonb)) value))
            )
          )
        )
      ) review
    from grading_sections
    join public.exam_section_attempts section_attempt on section_attempt.attempt_id = v_attempt.id
      and section_attempt.exam_section_source_key = grading_sections.section_grading ->> 'section_source_key'
    cross join lateral jsonb_array_elements(coalesce(grading_sections.section_grading -> 'questions', '[]'::jsonb)) with ordinality question(value, ordinality)
    where coalesce(grading_sections.section_grading ->> 'presentation_type', '') <> 'matching'
  ), matching_reviews as (
    select grading_sections.section_order, left_item.ordinality::integer as question_order,
      jsonb_build_object(
        'section_source_key', grading_sections.section_grading ->> 'section_source_key',
        'question_source_key', 'matching:' || (left_item.value ->> 'id'),
        'question', left_item.value ->> 'text',
        'user_answer', coalesce(section_attempt.progress -> 'answers' ->> ((grading_sections.section_grading ->> 'section_source_key') || ':matching:' || (left_item.value ->> 'id')), ''),
        'correct_option_keys', '[]'::jsonb,
        'accepted_answers', jsonb_build_array(matching_pair.right_id),
        'translation', null, 'explanation', null,
        'is_correct', coalesce(section_attempt.progress -> 'answers' ->> ((grading_sections.section_grading ->> 'section_source_key') || ':matching:' || (left_item.value ->> 'id')), '') = matching_pair.right_id
      ) review
    from grading_sections
    join public.exam_section_attempts section_attempt on section_attempt.attempt_id = v_attempt.id
      and section_attempt.exam_section_source_key = grading_sections.section_grading ->> 'section_source_key'
    cross join lateral jsonb_array_elements(coalesce(grading_sections.section_grading #> '{presentation_config,matching,leftItems}', '[]'::jsonb)) with ordinality left_item(value, ordinality)
    left join lateral (
      select pair.value ->> 'rightId' as right_id
      from jsonb_array_elements(coalesce(grading_sections.section_grading #> '{presentation_config,matching,pairs}', '[]'::jsonb)) pair(value)
      where pair.value ->> 'leftId' = left_item.value ->> 'id'
      limit 1
    ) matching_pair on true
    where grading_sections.section_grading ->> 'presentation_type' = 'matching'
  ), all_reviews as (
    select * from standard_reviews union all select * from matching_reviews
  )
  select coalesce(jsonb_agg(review order by section_order, question_order), '[]'::jsonb), count(*), count(*) filter (where (review ->> 'is_correct')::boolean)
  into v_reviews, v_total_questions, v_total_score from all_reviews;

  update public.exam_section_attempts section_attempt
  set score = section_scores.score, max_score = section_scores.max_score, status = 'completed', completed_at = now(),
      progress = section_attempt.progress || jsonb_build_object('review', section_scores.reviews)
  from (
    select 
      (review ->> 'section_source_key') as section_source_key,
      count(*) as max_score,
      count(*) filter (where (review ->> 'is_correct')::boolean) as score,
      jsonb_agg(review order by question_order) as reviews
    from (select value as review, ordinality as question_order from jsonb_array_elements(v_reviews) with ordinality) t
    group by (review ->> 'section_source_key')
  ) section_scores
  where section_attempt.attempt_id = v_attempt.id and section_attempt.exam_section_source_key = section_scores.section_source_key;

  update public.exam_attempts
  set
    status = 'submitted',
    submitted_at = now(),
    last_activity_at = now(),
    elapsed_seconds = greatest(0, floor(extract(epoch from now() - v_attempt.started_at))::integer),
    overtime_seconds = greatest(0, floor(extract(epoch from now() - v_attempt.started_at))::integer - coalesce(v_attempt.target_duration_seconds, 0))
  where id = v_attempt.id;

  return jsonb_build_object('attempt_id', v_attempt.id, 'score', v_total_score, 'max_score', v_total_questions, 'reviews', v_reviews);
end;
$$;
