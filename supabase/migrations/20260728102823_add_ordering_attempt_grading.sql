-- Correct positions are answer keys. Strip them from every learner-visible
-- attempt snapshot while keeping the full presentation config in the already
-- private exam_attempt_grading_snapshots row.
create or replace function public.redact_ordering_attempt_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.exam_snapshot := jsonb_set(
    new.exam_snapshot,
    '{sections}',
    coalesce((
      select jsonb_agg(
        case when section.value #>> '{resource,presentation_type}' = 'ordering' then
          jsonb_set(
            section.value,
            '{resource,presentation_config,ordering,items}',
            coalesce((
              select jsonb_agg(item - 'correctPosition' order by item_ordinality)
              from jsonb_array_elements(coalesce(section.value #> '{resource,presentation_config,ordering,items}', '[]'::jsonb)) with ordinality ordered_item(item, item_ordinality)
            ), '[]'::jsonb),
            true
          )
        else section.value end
        order by section.ordinality
      )
      from jsonb_array_elements(coalesce(new.exam_snapshot -> 'sections', '[]'::jsonb)) with ordinality section(value, ordinality)
    ), '[]'::jsonb),
    true
  );
  return new;
end;
$$;

drop trigger if exists redact_ordering_attempt_snapshot on public.exam_attempts;
create trigger redact_ordering_attempt_snapshot
before insert on public.exam_attempts
for each row execute function public.redact_ordering_attempt_snapshot();

-- Existing submit RPC owns authentication and the state transition. This
-- trigger adds ordering scoring from the private snapshot after that transition.
create or replace function public.grade_ordering_after_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  section_grading jsonb;
  section_attempt public.exam_section_attempts%rowtype;
  learner_order jsonb;
  correct_order jsonb;
  correct_count integer;
  item_count integer;
begin
  if old.status = 'submitted' or new.status <> 'submitted' then return new; end if;
  for section_grading in
    select item.value
    from public.exam_attempt_grading_snapshots snapshot
    cross join lateral jsonb_array_elements(snapshot.grading_snapshot -> 'sections') item(value)
    where snapshot.attempt_id = new.id and item.value ->> 'presentation_type' = 'ordering'
  loop
    select * into section_attempt from public.exam_section_attempts
    where attempt_id = new.id and exam_section_source_key = section_grading ->> 'section_source_key'
    for update;
    learner_order := coalesce((section_attempt.progress -> 'answers' ->> ((section_grading ->> 'section_source_key') || ':ordering'))::jsonb, '[]'::jsonb);
    select coalesce(jsonb_agg(item.value ->> 'id' order by (item.value ->> 'correctPosition')::integer), '[]'::jsonb), count(*)
    into correct_order, item_count
    from jsonb_array_elements(coalesce(section_grading #> '{presentation_config,ordering,items}', '[]'::jsonb)) item(value);
    select count(*) into correct_count
    from jsonb_array_elements(correct_order) with ordinality correct_item(value, ordinal)
    join jsonb_array_elements(learner_order) with ordinality learner_item(value, ordinal) using (ordinal)
    where correct_item.value = learner_item.value;
    update public.exam_section_attempts
    set score = correct_count, max_score = item_count,
      progress = progress || jsonb_build_object('review', jsonb_build_array(jsonb_build_object(
        'section_source_key', section_grading ->> 'section_source_key',
        'question_source_key', 'ordering', 'question', 'Sắp xếp thứ tự',
        'user_answer', learner_order::text, 'correct_option_keys', '[]'::jsonb,
        'accepted_answers', correct_order, 'translation', null, 'explanation', null,
        'is_correct', learner_order = correct_order
      )))
    where id = section_attempt.id;
  end loop;
  return new;
end;
$$;

drop trigger if exists grade_ordering_after_submission on public.exam_attempts;
create trigger grade_ordering_after_submission
after update of status on public.exam_attempts
for each row execute function public.grade_ordering_after_submission();

revoke all on function public.redact_ordering_attempt_snapshot() from public, anon, authenticated;
revoke all on function public.grade_ordering_after_submission() from public, anon, authenticated;
