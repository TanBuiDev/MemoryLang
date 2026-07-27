alter table public.practice_questions
  add column translation text,
  add column explanation text;

create function public.submit_b1_exam_attempt(p_attempt_id uuid)
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
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select * into v_attempt
  from public.exam_attempts
  where id = p_attempt_id
    and user_id = v_user_id
    and status = 'in_progress'
  for update;

  if not found then
    raise exception 'attempt is not available for submission' using errcode = '42501';
  end if;

  select
    coalesce(jsonb_agg(review order by section_order, question_order), '[]'::jsonb),
    count(*),
    count(*) filter (where is_correct)
  into v_reviews, v_total_questions, v_total_score
  from (
    select
      es.order_index as section_order,
      pq.order_index as question_order,
      jsonb_build_object(
        'section_source_key', esa.exam_section_source_key,
        'question_source_key', pq.source_key,
        'question', pq.prompt,
        'user_answer', coalesce(esa.progress -> 'answers' ->> pq.source_key, ''),
        'correct_option_keys', coalesce((
          select jsonb_agg(option ->> 'key' order by option ->> 'key')
          from jsonb_array_elements(pq.options) option
          where coalesce((option ->> 'is_correct')::boolean, false)
        ), '[]'::jsonb),
        'accepted_answers', pq.accepted_answers,
        'translation', pq.translation,
        'explanation', pq.explanation,
        'is_correct', (
          coalesce(esa.progress -> 'answers' ->> pq.source_key, '') = any(
            array(select option ->> 'key' from jsonb_array_elements(pq.options) option where coalesce((option ->> 'is_correct')::boolean, false))
          )
          or lower(btrim(coalesce(esa.progress -> 'answers' ->> pq.source_key, ''))) = any(
            array(select lower(btrim(value #>> '{}')) from jsonb_array_elements(pq.accepted_answers) value)
          )
        )
      ) as review,
      (
        coalesce(esa.progress -> 'answers' ->> pq.source_key, '') = any(
          array(select option ->> 'key' from jsonb_array_elements(pq.options) option where coalesce((option ->> 'is_correct')::boolean, false))
        )
        or lower(btrim(coalesce(esa.progress -> 'answers' ->> pq.source_key, ''))) = any(
          array(select lower(btrim(value #>> '{}')) from jsonb_array_elements(pq.accepted_answers) value)
        )
      ) as is_correct
    from public.exam_section_attempts esa
    join public.exam_sections es
      on es.exam_id = v_attempt.exam_id
      and es.source_key = esa.exam_section_source_key
    join public.practice_questions pq
      on es.resource_type = 'activity'
      and pq.activity_id = es.resource_id
    where esa.attempt_id = v_attempt.id
  ) scored;

  update public.exam_section_attempts esa
  set
    score = section_scores.score,
    max_score = section_scores.max_score,
    status = 'completed',
    completed_at = now()
  from (
    select
      review ->> 'section_source_key' as section_source_key,
      count(*) filter (where (review ->> 'is_correct')::boolean)::numeric as score,
      count(*)::numeric as max_score
    from jsonb_array_elements(v_reviews) review
    group by review ->> 'section_source_key'
  ) section_scores
  where esa.attempt_id = v_attempt.id
    and esa.exam_section_source_key = section_scores.section_source_key;

  update public.exam_attempts
  set
    status = 'submitted',
    submitted_at = now(),
    last_activity_at = now(),
    elapsed_seconds = greatest(0, floor(extract(epoch from now() - started_at))::integer),
    overtime_seconds = greatest(0, floor(extract(epoch from now() - started_at))::integer - target_duration_seconds)
  where id = v_attempt.id;

  return jsonb_build_object(
    'attempt_id', v_attempt.id,
    'score', v_total_score,
    'max_score', v_total_questions,
    'reviews', v_reviews
  );
end;
$$;

revoke all on function public.submit_b1_exam_attempt(uuid) from public, anon;
grant execute on function public.submit_b1_exam_attempt(uuid) to authenticated;
