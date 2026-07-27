-- The B1 DeFull speaking component has one learner topic: Topic 33.
-- Retain only that prompt in the exam and remove the accidentally imported
-- auxiliary speaking prompts when they are not referenced elsewhere.
delete from public.exam_sections es
using public.exams e, public.practice_prompts pp
where es.exam_id = e.id
  and es.resource_type = 'prompt'
  and es.resource_id = pp.id
  and e.source_key = 'b1-de-full-copy'
  and pp.source_key in (
    'speaking-test-instructions',
    'speaking-example-famous-person',
    'speaking-topic-34',
    'speaking-topic-35'
  );

delete from public.practice_prompts pp
where pp.source_key in (
  'speaking-test-instructions',
  'speaking-example-famous-person',
  'speaking-topic-34',
  'speaking-topic-35'
)
and not exists (
  select 1
  from public.exam_sections es
  where es.resource_type = 'prompt'
    and es.resource_id = pp.id
);
