with recalculated_reviews as (
  select
    esa.id,
    jsonb_agg(
      case
        when review ->> 'question_source_key' like 'transformation-%'
          and regexp_replace(lower(btrim(regexp_replace(coalesce(review ->> 'user_answer', ''), '[[:punct:]]', '', 'g'))), '\\s+', ' ', 'g')
            = any(
              array(
                select regexp_replace(lower(btrim(regexp_replace(value #>> '{}', '[[:punct:]]', '', 'g'))), '\\s+', ' ', 'g')
                from jsonb_array_elements(coalesce(review -> 'accepted_answers', '[]'::jsonb)) value
              )
            )
        then jsonb_set(review, '{is_correct}', 'true'::jsonb)
        else review
      end
      order by review ->> 'question_source_key'
    ) as reviews
  from public.exam_section_attempts esa
  cross join lateral jsonb_array_elements(coalesce(esa.progress -> 'review', '[]'::jsonb)) review
  where esa.progress ? 'review'
  group by esa.id
), recalculated_scores as (
  select
    id,
    reviews,
    count(*) filter (where (review ->> 'is_correct')::boolean)::numeric as score
  from recalculated_reviews
  cross join lateral jsonb_array_elements(reviews) review
  group by id, reviews
)
update public.exam_section_attempts esa
set progress = jsonb_set(esa.progress, '{review}', recalculated_scores.reviews),
    score = recalculated_scores.score,
    updated_at = now()
from recalculated_scores
where esa.id = recalculated_scores.id;
