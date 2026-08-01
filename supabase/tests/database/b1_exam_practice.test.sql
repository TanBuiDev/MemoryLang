begin;

create extension if not exists pgtap with schema extensions;
select extensions.no_plan();

select extensions.has_table('public', 'exam_sections', 'exam sections table exists');
select extensions.has_table('public', 'practice_activities', 'practice activities table exists');
select extensions.has_table('public', 'practice_questions', 'practice questions table exists');
select extensions.has_table('public', 'practice_prompts', 'practice prompts table exists');
select extensions.has_table('public', 'exam_attempts', 'learner exam attempts table exists');
select extensions.has_table('public', 'exam_section_attempts', 'learner section attempts table exists');
select extensions.has_table('public', 'practice_draft_versions', 'learner writing and speaking draft versions table exists');
select extensions.has_table('public', 'b1_exam_creation_requests', 'B1 exam creation request table exists');

select extensions.has_column('public', 'exams', 'source_key', 'exams expose a stable source key');
select extensions.has_column('public', 'exams', 'cefr_level', 'exams expose a CEFR level');
select extensions.has_column(
  'public',
  'exams',
  'default_time_minutes',
  'exams expose a default practice duration'
);
select extensions.has_column('public', 'exams', 'exam_format', 'exams expose an exam format');
select extensions.has_column('public', 'exams', 'cloned_from_exam_id', 'exams expose their clone source');
select extensions.has_column('public', 'exams', 'clone_mode', 'exams expose their clone mode');
select extensions.is(
  (select exam_format from public.exams where source_key = 'b1-de-full-copy'),
  'b1_practice',
  'seeded B1 exam is backfilled'
);
select extensions.has_column(
  'public',
  'exam_attempts',
  'target_duration_seconds',
  'attempts preserve the learner-selected duration'
);
select extensions.has_column(
  'public',
  'exam_attempts',
  'exam_snapshot',
  'attempts preserve a content snapshot'
);
select extensions.has_column(
  'public',
  'exam_section_attempts',
  'progress',
  'section attempts persist autosaved progress'
);
select extensions.has_column(
  'public',
  'practice_draft_versions',
  'version_number',
  'draft versions preserve their sequence number'
);

select extensions.col_is_null(
  'public',
  'practice_questions',
  'image_url',
  'question images remain optional'
);
select extensions.col_is_null(
  'public',
  'practice_activities',
  'audio_url',
  'activity audio remains optional'
);
select extensions.col_is_null(
  'public',
  'practice_prompts',
  'audio_url',
  'prompt audio remains optional'
);

select extensions.fk_ok(
  'public',
  'exam_sections',
  'exam_id',
  'public',
  'exams',
  'id',
  'exam sections belong to an exam'
);
select extensions.fk_ok(
  'public',
  'practice_questions',
  'activity_id',
  'public',
  'practice_activities',
  'id',
  'practice questions belong to an activity'
);
select extensions.fk_ok(
  'public',
  'practice_activities',
  'created_by',
  'public',
  'profiles',
  'id',
  'practice activities identify their creator'
);
select extensions.fk_ok(
  'public',
  'practice_prompts',
  'created_by',
  'public',
  'profiles',
  'id',
  'practice prompts identify their creator'
);

select extensions.col_is_unique(
  'public',
  'exams',
  'source_key',
  'exam source keys are unique'
);
select extensions.col_is_unique(
  'public',
  'exam_sections',
  array['exam_id', 'source_key'],
  'section source keys are unique within an exam'
);
select extensions.col_is_unique(
  'public',
  'practice_activities',
  'source_key',
  'activity source keys are unique'
);
select extensions.col_is_unique(
  'public',
  'practice_questions',
  array['activity_id', 'source_key'],
  'question source keys are unique within an activity'
);
select extensions.col_is_unique(
  'public',
  'practice_prompts',
  'source_key',
  'prompt source keys are unique'
);

select extensions.ok(
  (select relrowsecurity from pg_class where oid = 'public.exam_sections'::regclass),
  'exam sections have RLS enabled'
);
select extensions.ok(
  (select relrowsecurity from pg_class where oid = 'public.practice_activities'::regclass),
  'practice activities have RLS enabled'
);
select extensions.ok(
  (select relrowsecurity from pg_class where oid = 'public.practice_questions'::regclass),
  'practice questions have RLS enabled'
);
select extensions.ok(
  (select relrowsecurity from pg_class where oid = 'public.practice_prompts'::regclass),
  'practice prompts have RLS enabled'
);
select extensions.ok(
  (select relrowsecurity from pg_class where oid = 'public.exam_attempts'::regclass)
    and (select relrowsecurity from pg_class where oid = 'public.exam_attempt_grading_snapshots'::regclass)
    and (select relrowsecurity from pg_class where oid = 'public.exam_section_attempts'::regclass)
    and (select relrowsecurity from pg_class where oid = 'public.practice_draft_versions'::regclass),
  'learner attempt and draft tables have RLS enabled'
);
select extensions.ok(
  (select relrowsecurity from pg_class where oid = 'public.b1_exam_creation_requests'::regclass),
  'B1 exam creation requests have RLS enabled'
);

select extensions.ok(
  has_table_privilege('authenticated', 'public.exam_sections', 'SELECT')
    and has_table_privilege('authenticated', 'public.practice_activities', 'SELECT')
    and has_table_privilege('authenticated', 'public.practice_questions', 'SELECT')
    and has_table_privilege('authenticated', 'public.practice_prompts', 'SELECT'),
  'authenticated users can select practice content through RLS'
);
select extensions.ok(
  has_table_privilege('authenticated', 'public.exam_sections', 'INSERT')
    and has_table_privilege('authenticated', 'public.exam_sections', 'UPDATE')
    and has_table_privilege('authenticated', 'public.exam_sections', 'DELETE')
    and has_table_privilege('authenticated', 'public.practice_activities', 'INSERT')
    and has_table_privilege('authenticated', 'public.practice_activities', 'UPDATE')
    and has_table_privilege('authenticated', 'public.practice_activities', 'DELETE')
    and has_table_privilege('authenticated', 'public.practice_questions', 'INSERT')
    and has_table_privilege('authenticated', 'public.practice_questions', 'UPDATE')
    and has_table_privilege('authenticated', 'public.practice_questions', 'DELETE')
    and has_table_privilege('authenticated', 'public.practice_prompts', 'INSERT')
    and has_table_privilege('authenticated', 'public.practice_prompts', 'UPDATE')
    and has_table_privilege('authenticated', 'public.practice_prompts', 'DELETE'),
  'authenticated admins have the table grants required for CRUD through RLS'
);
select extensions.ok(
  not has_table_privilege('anon', 'public.exam_sections', 'SELECT')
    and not has_table_privilege('anon', 'public.practice_activities', 'SELECT')
    and not has_table_privilege('anon', 'public.practice_questions', 'SELECT')
    and not has_table_privilege('anon', 'public.practice_prompts', 'SELECT'),
  'anonymous requests receive no practice-content table privileges'
);
select extensions.ok(
  has_table_privilege('authenticated', 'public.exam_attempts', 'SELECT')
    and has_table_privilege('authenticated', 'public.exam_section_attempts', 'SELECT')
    and has_table_privilege('authenticated', 'public.practice_draft_versions', 'SELECT')
    and not has_table_privilege('authenticated', 'public.exam_attempt_grading_snapshots', 'SELECT')
    and not has_table_privilege('authenticated', 'public.exam_attempts', 'INSERT')
    and not has_table_privilege('authenticated', 'public.exam_section_attempts', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.practice_draft_versions', 'INSERT'),
  'learner writes use guarded RPCs and grading snapshots remain private'
);
select extensions.ok(
  has_table_privilege('authenticated', 'public.b1_exam_creation_requests', 'SELECT')
    and not has_table_privilege('authenticated', 'public.b1_exam_creation_requests', 'INSERT')
    and not has_table_privilege('authenticated', 'public.b1_exam_creation_requests', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.b1_exam_creation_requests', 'DELETE'),
  'B1 exam creation request writes are reserved for guarded RPCs'
);
select extensions.has_function(
  'public',
  'start_b1_exam_attempt',
  array['uuid', 'integer'],
  'start attempt RPC exists'
);
select extensions.has_function(
  'public',
  'save_b1_section_attempt_progress',
  array['uuid', 'text', 'jsonb', 'text', 'uuid'],
  'section autosave RPC exists'
);
select extensions.has_function(
  'public',
  'create_practice_draft_version',
  array['uuid', 'text'],
  'draft version RPC exists'
);

select extensions.ok(
  position(
    'from public.practice_activities where practice_activities.id = new.resource_id for share;'
    in validator.source
  ) > 0,
  'section activity validation locks the referenced target row'
)
from (
  select lower(regexp_replace(prosrc, '\s+', ' ', 'g')) as source
  from pg_proc
  where oid = 'public.validate_exam_section_resource()'::regprocedure
) as validator;
select extensions.ok(
  position(
    'from public.practice_prompts where practice_prompts.id = new.resource_id for share;'
    in validator.source
  ) > 0,
  'section prompt validation locks the referenced target row'
)
from (
  select lower(regexp_replace(prosrc, '\s+', ' ', 'g')) as source
  from pg_proc
  where oid = 'public.validate_exam_section_resource()'::regprocedure
) as validator;

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '91000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'b1-admin@example.test',
    crypt('local-test-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '91000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'b1-user@example.test',
    crypt('local-test-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"role":"admin"}'::jsonb,
    now(),
    now()
  ),
  (
    '91000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'b1-pro@example.test',
    crypt('local-test-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '91000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'b1-creator-only@example.test',
    crypt('local-test-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

update public.profiles
set is_admin = true
where id = '91000000-0000-0000-0000-000000000001';

insert into security.user_roles (user_id, role_id, granted_by, reason)
select
  '91000000-0000-0000-0000-000000000001',
  id,
  '91000000-0000-0000-0000-000000000001',
  'B1 exam creation test administrator'
from security.roles
where code = 'exam_admin';

insert into security.roles (id, code, name, description, is_system)
values (
  '91200000-0000-0000-0000-000000000001',
  'clone_creator',
  'Clone creator fixture',
  'Can create exams but cannot read clone sources',
  false
);

insert into security.role_permissions (role_id, permission_id)
select
  '91200000-0000-0000-0000-000000000001',
  id
from security.permissions
where code = 'exam.create';

insert into security.user_roles (user_id, role_id, granted_by, reason)
values (
  '91000000-0000-0000-0000-000000000004',
  '91200000-0000-0000-0000-000000000001',
  '91000000-0000-0000-0000-000000000001',
  'B1 clone source authorization fixture'
);

insert into public.subscriptions (
  id,
  user_id,
  plan_type,
  status,
  billing_cycle,
  current_period_start,
  current_period_end
)
values (
  '91100000-0000-0000-0000-000000000003',
  '91000000-0000-0000-0000-000000000003',
  'pro',
  'active',
  'monthly',
  now(),
  now() + interval '1 day'
)
on conflict (user_id) do update
set
  plan_type = excluded.plan_type,
  status = excluded.status,
  billing_cycle = excluded.billing_cycle,
  current_period_start = excluded.current_period_start,
  current_period_end = excluded.current_period_end;

insert into public.exams (
  id,
  title,
  category,
  is_published,
  access_tier,
  source_key,
  cefr_level,
  default_time_minutes,
  created_by
)
values
  (
    '92000000-0000-0000-0000-000000000001',
    'B1 practice fixture',
    'GENERAL',
    true,
    'free',
    'b1-practice-fixture',
    'B1',
    120,
    '91000000-0000-0000-0000-000000000001'
  ),
  (
    '92000000-0000-0000-0000-000000000002',
    'B1 Pro practice fixture',
    'GENERAL',
    true,
    'pro',
    'b1-pro-practice-fixture',
    'B1',
    120,
    '91000000-0000-0000-0000-000000000001'
  );

insert into public.exam_passage_sets (
  id,
  exam_id,
  part_number,
  title,
  order_index
)
values (
  '92100000-0000-0000-0000-000000000001',
  '92000000-0000-0000-0000-000000000001',
  1,
  'Legacy passage fixture',
  1
);

insert into public.practice_activities (
  id,
  source_key,
  skill,
  activity_type,
  title,
  is_published,
  access_tier,
  created_by
)
values
  (
    '93000000-0000-0000-0000-000000000001',
    'b1-grammar-published',
    'grammar',
    'multiple_choice',
    'Published grammar activity',
    true,
    'free',
    '91000000-0000-0000-0000-000000000001'
  ),
  (
    '93000000-0000-0000-0000-000000000002',
    'b1-grammar-draft',
    'grammar',
    'multiple_choice',
    'Draft grammar activity',
    false,
    'free',
    '91000000-0000-0000-0000-000000000001'
  ),
  (
    '93000000-0000-0000-0000-000000000003',
    'b1-grammar-pro',
    'grammar',
    'multiple_choice',
    'Pro grammar activity',
    true,
    'pro',
    '91000000-0000-0000-0000-000000000001'
  );

insert into public.practice_questions (
  id,
  activity_id,
  source_key,
  source_number,
  question_type,
  prompt,
  options,
  accepted_answers,
  source_page,
  order_index
)
values
  (
    '94000000-0000-0000-0000-000000000001',
    '93000000-0000-0000-0000-000000000001',
    'b1-grammar-question-1',
    '101',
    'multiple_choice',
    'Choose the correct answer.',
    '[{"key":"A","text":"works","is_correct":true}]'::jsonb,
    '[]'::jsonb,
    1,
    1
  ),
  (
    '94000000-0000-0000-0000-000000000002',
    '93000000-0000-0000-0000-000000000003',
    'b1-grammar-pro-question-1',
    '102',
    'multiple_choice',
    'Choose the Pro answer.',
    '[{"key":"A","text":"worked","is_correct":true}]'::jsonb,
    '[]'::jsonb,
    1,
    1
  );

insert into public.practice_prompts (
  id,
  source_key,
  skill,
  title,
  prompt,
  source_page,
  is_published,
  access_tier,
  created_by
)
values
  (
    '95000000-0000-0000-0000-000000000001',
    'b1-writing-published',
    'writing',
    'Published writing prompt',
    'Write an email applying for a part-time job.',
    10,
    true,
    'free',
    '91000000-0000-0000-0000-000000000001'
  ),
  (
    '95000000-0000-0000-0000-000000000002',
    'b1-writing-pro',
    'writing',
    'Pro writing prompt',
    'Write a formal complaint.',
    11,
    true,
    'pro',
    '91000000-0000-0000-0000-000000000001'
  );

insert into public.exam_sections (
  id,
  exam_id,
  source_key,
  skill,
  title,
  resource_type,
  resource_id,
  order_index,
  is_required
)
values
  (
    '96000000-0000-0000-0000-000000000001',
    '92000000-0000-0000-0000-000000000001',
    'b1-grammar-section',
    'grammar',
    'Grammar',
    'activity',
    '93000000-0000-0000-0000-000000000001',
    1,
    true
  ),
  (
    '96000000-0000-0000-0000-000000000002',
    '92000000-0000-0000-0000-000000000001',
    'b1-draft-activity-section',
    'grammar',
    'Draft activity section',
    'activity',
    '93000000-0000-0000-0000-000000000002',
    2,
    true
  ),
  (
    '96000000-0000-0000-0000-000000000003',
    '92000000-0000-0000-0000-000000000001',
    'b1-pro-activity-section',
    'grammar',
    'Pro activity section',
    'activity',
    '93000000-0000-0000-0000-000000000003',
    3,
    true
  ),
  (
    '96000000-0000-0000-0000-000000000004',
    '92000000-0000-0000-0000-000000000001',
    'b1-pro-prompt-section',
    'writing',
    'Pro prompt section',
    'prompt',
    '95000000-0000-0000-0000-000000000002',
    4,
    true
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
  exam_format
)
values (
  '98000000-0000-0000-0000-000000000001',
  'B1 clone source fixture',
  'GENERAL',
  'Authored source exam that must remain independent from its clones.',
  135,
  1,
  false,
  'pro',
  '91000000-0000-0000-0000-000000000001',
  'b1-clone-source-fixture',
  'B1',
  135,
  'b1_practice'
);

insert into public.exams (
  id,
  title,
  category,
  is_published,
  access_tier,
  created_by,
  source_key,
  cefr_level,
  default_time_minutes,
  exam_format,
  deleted_at
)
values (
  '98000000-0000-0000-0000-000000000002',
  'Deleted B1 clone source fixture',
  'GENERAL',
  false,
  'free',
  '91000000-0000-0000-0000-000000000001',
  'deleted-b1-clone-source-fixture',
  'B1',
  60,
  'b1_practice',
  now()
);

insert into public.practice_activities (
  id,
  source_key,
  skill,
  activity_type,
  title,
  instructions,
  content,
  passage,
  audio_url,
  is_published,
  access_tier,
  metadata,
  created_by,
  presentation_type,
  grading_mode,
  content_schema_version,
  content_blocks,
  presentation_config,
  review_config
)
values
  (
    '98100000-0000-0000-0000-000000000001',
    'clone-source-choice',
    'reading',
    'multiple_choice',
    'Authored choice resource',
    'Choose the best answer.',
    '<p>Authored activity content.</p>',
    '<p>Authored source passage.</p>',
    'https://cdn.example.test/b1/source-audio.mp3',
    true,
    'pro',
    '{"difficulty":"authored-choice"}'::jsonb,
    '91000000-0000-0000-0000-000000000001',
    'choice_list',
    'single_choice',
    3,
    '[{"type":"rich_text","value":"<p>Authored choice block.</p>"}]'::jsonb,
    '{"layout":"stacked"}'::jsonb,
    '{"show_translation":true}'::jsonb
  ),
  (
    '98100000-0000-0000-0000-000000000002',
    'clone-source-matching',
    'reading',
    'multiple_choice',
    'Authored matching resource',
    'Match every item.',
    'Authored matching content.',
    null,
    null,
    true,
    'pro',
    '{"difficulty":"authored-matching"}'::jsonb,
    '91000000-0000-0000-0000-000000000001',
    'matching',
    'matching',
    2,
    '[{"type":"instructions","value":"Match these authored pairs."}]'::jsonb,
    '{"matching":{"leftItems":[{"id":"left-1","text":"Monday"}],"rightItems":[{"id":"right-1","text":"Thứ Hai"}],"pairs":[{"leftId":"left-1","rightId":"right-1"}]}}'::jsonb,
    '{"show_answers":true}'::jsonb
  ),
  (
    '98100000-0000-0000-0000-000000000003',
    'clone-source-ordering',
    'listening',
    'multiple_choice',
    'Authored ordering resource',
    'Put the steps in order.',
    'Authored ordering content.',
    null,
    null,
    true,
    'pro',
    '{"difficulty":"authored-ordering"}'::jsonb,
    '91000000-0000-0000-0000-000000000001',
    'ordering',
    'ordered_list',
    4,
    '[{"type":"instructions","value":"Order these authored items."}]'::jsonb,
    '{"ordering":{"items":[{"id":"first","text":"First","correctPosition":1},{"id":"second","text":"Second","correctPosition":2}]}}'::jsonb,
    '{"show_answers":true}'::jsonb
  );

insert into public.practice_questions (
  id,
  activity_id,
  source_key,
  source_number,
  question_type,
  prompt,
  options,
  accepted_answers,
  source_page,
  image_url,
  order_index,
  metadata,
  translation,
  explanation
)
values (
  '98300000-0000-0000-0000-000000000001',
  '98100000-0000-0000-0000-000000000001',
  'clone-source-choice-q1',
  'C-7',
  'multiple_choice',
  'Which authored option is correct?',
  '[{"key":"A","text":"Alpha","is_correct":true},{"key":"B","text":"Beta","is_correct":false}]'::jsonb,
  '["Alpha","First option"]'::jsonb,
  27,
  'https://cdn.example.test/b1/source-sign.png',
  4,
  '{"image_alt":"Authored sign","image_crop":"top"}'::jsonb,
  'Phương án nào đúng?',
  'Alpha is correct because this is the authored fixture.'
);

insert into public.practice_prompts (
  id,
  source_key,
  skill,
  title,
  prompt,
  instructions,
  content,
  source_page,
  image_url,
  audio_url,
  is_published,
  access_tier,
  metadata,
  created_by,
  presentation_type,
  grading_mode,
  content_schema_version,
  content_blocks,
  presentation_config,
  review_config
)
values
  (
    '98200000-0000-0000-0000-000000000001',
    'clone-source-writing',
    'writing',
    'Authored writing resource',
    'Write an authored email.',
    'Write at least 100 words.',
    '<p>Authored writing context.</p>',
    31,
    null,
    null,
    true,
    'pro',
    '{"audience":"friend"}'::jsonb,
    '91000000-0000-0000-0000-000000000001',
    'long_form_prompt',
    'sample_compare',
    5,
    '[{"type":"rich_text","value":"<p>Authored writing block.</p>"}]'::jsonb,
    '{"minimum_words":100}'::jsonb,
    '{"comparison":"sample"}'::jsonb
  ),
  (
    '98200000-0000-0000-0000-000000000002',
    'clone-source-speaking',
    'speaking',
    'Authored speaking resource',
    'Describe an authored photograph.',
    'Prepare for one minute.',
    '<p>Authored speaking context.</p>',
    32,
    'https://cdn.example.test/b1/stale-speaking-image.png',
    null,
    false,
    'pro',
    '{"audience":"examiner"}'::jsonb,
    '91000000-0000-0000-0000-000000000001',
    'speaking_script_prompt',
    'sample_compare',
    6,
    '[{"type":"rich_text","value":"<p>Authored speaking block.</p>"}]'::jsonb,
    '{"preparation_seconds":60}'::jsonb,
    '{"comparison":"sample"}'::jsonb
  );

insert into public.exam_sections (
  id,
  exam_id,
  source_key,
  skill,
  title,
  instructions,
  resource_type,
  resource_id,
  order_index,
  is_required,
  suggested_time_minutes,
  metadata
)
values
  (
    '98400000-0000-0000-0000-000000000001',
    '98000000-0000-0000-0000-000000000001',
    'clone-source-choice-section',
    'reading',
    'Choice section',
    'Authored choice section instructions.',
    'activity',
    '98100000-0000-0000-0000-000000000001',
    2,
    true,
    12,
    '{"section":"choice"}'::jsonb
  ),
  (
    '98400000-0000-0000-0000-000000000002',
    '98000000-0000-0000-0000-000000000001',
    'clone-source-matching-section',
    'reading',
    'Matching section',
    'Authored matching section instructions.',
    'activity',
    '98100000-0000-0000-0000-000000000002',
    4,
    false,
    null,
    '{"section":"matching"}'::jsonb
  ),
  (
    '98400000-0000-0000-0000-000000000003',
    '98000000-0000-0000-0000-000000000001',
    'clone-source-ordering-section',
    'listening',
    'Ordering section',
    'Authored ordering section instructions.',
    'activity',
    '98100000-0000-0000-0000-000000000003',
    6,
    true,
    15,
    '{"section":"ordering"}'::jsonb
  ),
  (
    '98400000-0000-0000-0000-000000000004',
    '98000000-0000-0000-0000-000000000001',
    'clone-source-writing-section',
    'writing',
    'Writing section',
    'Authored writing section instructions.',
    'prompt',
    '98200000-0000-0000-0000-000000000001',
    8,
    true,
    30,
    '{"section":"writing"}'::jsonb
  ),
  (
    '98400000-0000-0000-0000-000000000005',
    '98000000-0000-0000-0000-000000000001',
    'clone-source-speaking-section',
    'speaking',
    'Speaking section',
    'Authored speaking section instructions.',
    'prompt',
    '98200000-0000-0000-0000-000000000002',
    10,
    false,
    20,
    '{"section":"speaking"}'::jsonb
  );

insert into public.practice_prompt_samples (id, prompt_id, title, content)
values
  (
    '98500000-0000-0000-0000-000000000001',
    '98200000-0000-0000-0000-000000000001',
    'Authored writing sample',
    'This is the authored writing sample.'
  ),
  (
    '98500000-0000-0000-0000-000000000002',
    '98200000-0000-0000-0000-000000000002',
    'Authored speaking sample',
    'This is the authored speaking sample.'
  );

insert into public.exam_media_assets (
  id,
  media_kind,
  bucket_id,
  storage_path,
  public_url,
  display_name,
  created_by
)
values
  (
    '98600000-0000-0000-0000-000000000001',
    'audio',
    'external',
    'clone-fixture/source-audio.mp3',
    'https://cdn.example.test/b1/source-audio.mp3',
    'Clone source audio',
    '91000000-0000-0000-0000-000000000001'
  ),
  (
    '98600000-0000-0000-0000-000000000002',
    'image',
    'external',
    'clone-fixture/source-sign.png',
    'https://cdn.example.test/b1/source-sign.png',
    'Clone source sign',
    '91000000-0000-0000-0000-000000000001'
  );

insert into public.exam_media_asset_usages (
  id,
  asset_id,
  resource_type,
  resource_id,
  usage_role
)
values
  (
    '98700000-0000-0000-0000-000000000001',
    '98600000-0000-0000-0000-000000000001',
    'activity',
    '98100000-0000-0000-0000-000000000001',
    'audio'
  ),
  (
    '98700000-0000-0000-0000-000000000002',
    '98600000-0000-0000-0000-000000000002',
    'question',
    '98300000-0000-0000-0000-000000000001',
    'image'
  ),
  (
    '98700000-0000-0000-0000-000000000003',
    '98600000-0000-0000-0000-000000000002',
    'prompt',
    '98200000-0000-0000-0000-000000000002',
    'image'
  );

insert into public.exam_attempts (
  id,
  exam_id,
  user_id,
  status,
  target_duration_seconds,
  exam_snapshot,
  current_section_source_key,
  submitted_at
)
values (
  '98800000-0000-0000-0000-000000000001',
  '98000000-0000-0000-0000-000000000001',
  '91000000-0000-0000-0000-000000000002',
  'submitted',
  8100,
  '{"exam":{"source_key":"b1-clone-source-fixture"},"sections":[]}'::jsonb,
  'clone-source-choice-section',
  now()
);

insert into public.exam_attempt_grading_snapshots (attempt_id, grading_snapshot)
values (
  '98800000-0000-0000-0000-000000000001',
  '{"sections":[]}'::jsonb
);

insert into public.practice_draft_versions (
  id,
  user_id,
  prompt_id,
  version_number,
  content,
  word_count
)
values (
  '98900000-0000-0000-0000-000000000001',
  '91000000-0000-0000-0000-000000000002',
  '98200000-0000-0000-0000-000000000001',
  1,
  'Authored learner draft.',
  3
);

insert into public.exam_section_attempts (
  id,
  attempt_id,
  exam_section_source_key,
  status,
  progress,
  score,
  max_score,
  draft_version_id,
  completed_at
)
values (
  '98900000-0000-0000-0000-000000000002',
  '98800000-0000-0000-0000-000000000001',
  'clone-source-writing-section',
  'completed',
  '{"draft":"Authored learner draft."}'::jsonb,
  1,
  1,
  '98900000-0000-0000-0000-000000000001',
  now()
);

select extensions.throws_ok(
  $$
    insert into public.exam_sections (
      exam_id,
      source_key,
      skill,
      title,
      resource_type,
      resource_id,
      order_index
    )
    values (
      '92000000-0000-0000-0000-000000000001',
      'missing-activity-resource',
      'grammar',
      'Missing activity resource',
      'activity',
      '93999999-0000-0000-0000-000000000999',
      10
    )
  $$,
  '23503',
  'exam section activity resource does not exist or skill does not match',
  'section resources cannot point at a missing activity'
);
select extensions.throws_ok(
  $$
    insert into public.exam_sections (
      exam_id,
      source_key,
      skill,
      title,
      resource_type,
      resource_id,
      order_index
    )
    values (
      '92000000-0000-0000-0000-000000000001',
      'mismatched-prompt-resource',
      'grammar',
      'Mismatched prompt resource',
      'prompt',
      '93000000-0000-0000-0000-000000000001',
      11
    )
  $$,
  '23503',
  'exam section prompt resource does not exist or skill does not match',
  'section resource type must match the referenced table'
);
select extensions.throws_ok(
  $$
    delete from public.practice_activities
    where id = '93000000-0000-0000-0000-000000000001'
  $$,
  '23503',
  'practice activity is referenced by exam_sections',
  'referenced practice activities cannot be deleted'
);
select extensions.throws_ok(
  $$
    update public.practice_prompts
    set skill = 'speaking'
    where id = '95000000-0000-0000-0000-000000000002'
  $$,
  '23503',
  'practice prompt is referenced by exam_sections',
  'referenced practice prompt skills cannot be changed'
);

select extensions.ok(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in ('exams', 'exam_passage_sets', 'exam_questions')
      and (
        coalesce(qual, '') ~* 'user_metadata|auth[.]jwt'
        or coalesce(with_check, '') ~* 'user_metadata|auth[.]jwt'
      )
  ),
  'legacy exam policies contain no user_metadata or auth.jwt authorization'
);

select extensions.is(
  (
    select count(*)
    from (
      select tablename
      from pg_policies
      where schemaname = 'public'
        and tablename in (
          'exams',
          'exam_passage_sets',
          'exam_questions',
          'exam_sections',
          'practice_activities',
          'practice_questions',
          'practice_prompts'
        )
        and cmd in ('SELECT', 'ALL')
        and 'authenticated' = any (roles)
      group by tablename
      having count(*) > 1
    ) overlapping_select_policies
  ),
  0::bigint,
  'exam and B1 tables have no overlapping authenticated SELECT policies'
);

select extensions.throws_ok(
  $$
    insert into public.practice_activities (
      source_key,
      skill,
      activity_type,
      title
    )
    values ('invalid-skill', 'invalid', 'multiple_choice', 'Invalid skill')
  $$,
  '23514',
  'new row for relation "practice_activities" violates check constraint "practice_activities_skill_check"',
  'activity skill values are constrained'
);
select extensions.throws_ok(
  $$
    insert into public.practice_activities (
      source_key,
      skill,
      activity_type,
      title
    )
    values ('invalid-activity-type', 'grammar', 'essay', 'Invalid activity type')
  $$,
  '23514',
  'new row for relation "practice_activities" violates check constraint "practice_activities_activity_type_check"',
  'activity types are constrained'
);
select extensions.throws_ok(
  $$
    insert into public.practice_questions (
      activity_id,
      source_key,
      question_type,
      prompt,
      source_page
    )
    values (
      '93000000-0000-0000-0000-000000000001',
      'invalid-question-type',
      'essay',
      'Invalid question type',
      1
    )
  $$,
  '23514',
  'new row for relation "practice_questions" violates check constraint "practice_questions_question_type_check"',
  'question types are constrained'
);
select extensions.throws_ok(
  $$
    insert into public.exam_sections (
      exam_id,
      source_key,
      skill,
      title,
      resource_type,
      resource_id,
      order_index
    )
    values (
      '92000000-0000-0000-0000-000000000001',
      'invalid-resource-type',
      'grammar',
      'Invalid resource type',
      'external',
      '93000000-0000-0000-0000-000000000001',
      2
    )
  $$,
  '23514',
  'new row for relation "exam_sections" violates check constraint "exam_sections_resource_type_check"',
  'section resource types are constrained'
);
select extensions.throws_ok(
  $$
    insert into public.practice_prompts (
      source_key,
      skill,
      title,
      prompt,
      source_page
    )
    values (
      'invalid-prompt-skill',
      'grammar',
      'Invalid prompt skill',
      'This should fail.',
      1
    )
  $$,
  '23514',
  'new row for relation "practice_prompts" violates check constraint "practice_prompts_skill_check"',
  'prompt skills are restricted to writing and speaking'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '91000000-0000-0000-0000-000000000002',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"91000000-0000-0000-0000-000000000002","role":"authenticated","user_metadata":{"role":"admin"}}',
  true
);

select extensions.is(
  (select count(*) from public.exams where id = '92000000-0000-0000-0000-000000000001'),
  1::bigint,
  'authenticated users can read a published free exam'
);
select extensions.is(
  (select count(*) from public.exam_sections),
  1::bigint,
  'authenticated users can read sections of an accessible exam'
);
select extensions.is(
  (select count(*) from public.practice_activities),
  1::bigint,
  'authenticated users can read published free activities but not drafts'
);
select extensions.is(
  (select count(*) from public.practice_questions),
  1::bigint,
  'authenticated users can read questions from an accessible activity'
);
select extensions.is(
  (select count(*) from public.practice_prompts),
  1::bigint,
  'authenticated users can read published free prompts'
);
select extensions.is(
  (
    select count(*)
    from public.exams
    where id = '92000000-0000-0000-0000-000000000002'
  ),
  0::bigint,
  'Free users cannot read Pro exams'
);
select extensions.is(
  (
    select count(*)
    from public.practice_activities
    where id = '93000000-0000-0000-0000-000000000003'
  ),
  0::bigint,
  'Free users cannot read Pro activities'
);
select extensions.is(
  (
    select count(*)
    from public.practice_prompts
    where id = '95000000-0000-0000-0000-000000000002'
  ),
  0::bigint,
  'Free users cannot read Pro prompts'
);
select extensions.is(
  (
    select count(*)
    from public.exam_sections
    where id in (
      '96000000-0000-0000-0000-000000000002',
      '96000000-0000-0000-0000-000000000003',
      '96000000-0000-0000-0000-000000000004'
    )
  ),
  0::bigint,
  'Free users cannot read sections linked to draft or Pro resources'
);
select extensions.is(
  (
    select count(*)
    from public.practice_questions
    where id = '94000000-0000-0000-0000-000000000002'
  ),
  0::bigint,
  'Free users cannot read questions from Pro activities'
);

select extensions.throws_ok(
  $$
    insert into public.practice_activities (
      source_key,
      skill,
      activity_type,
      title
    )
    values ('metadata-admin-denied', 'grammar', 'multiple_choice', 'Denied activity')
  $$,
  '42501',
  'new row violates row-level security policy for table "practice_activities"',
  'user-editable user_metadata cannot grant admin write access'
);
select extensions.throws_ok(
  $$
    insert into public.exams (title, category)
    values ('Forged metadata exam', 'GENERAL')
  $$,
  '42501',
  'new row violates row-level security policy for table "exams"',
  'forged user_metadata cannot insert legacy exams'
);
select extensions.throws_ok(
  $$
    insert into public.exam_passage_sets (
      exam_id,
      part_number,
      title,
      order_index
    )
    values (
      '92000000-0000-0000-0000-000000000001',
      2,
      'Forged metadata passage',
      2
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "exam_passage_sets"',
  'forged user_metadata cannot insert legacy exam passage sets'
);
select extensions.throws_ok(
  $$
    insert into public.exam_questions (
      passage_set_id,
      question_number,
      question_text
    )
    values (
      '92100000-0000-0000-0000-000000000001',
      999,
      'Forged metadata question'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "exam_questions"',
  'forged user_metadata cannot insert legacy exam questions'
);

select set_config(
  'request.jwt.claim.sub',
  '91000000-0000-0000-0000-000000000003',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"91000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);

select extensions.is(
  (
    select count(*)
    from public.exams
    where id = '92000000-0000-0000-0000-000000000002'
  ),
  1::bigint,
  'active Pro users can read Pro exams'
);
select extensions.is(
  (
    select count(*)
    from public.practice_activities
    where id = '93000000-0000-0000-0000-000000000003'
  ),
  1::bigint,
  'active Pro users can read Pro activities'
);
select extensions.is(
  (
    select count(*)
    from public.practice_prompts
    where id = '95000000-0000-0000-0000-000000000002'
  ),
  1::bigint,
  'active Pro users can read Pro prompts'
);
select extensions.is(
  (
    select count(*)
    from public.exam_sections
    where id = '96000000-0000-0000-0000-000000000003'
  ),
  1::bigint,
  'active Pro users can read sections linked to Pro activities'
);
select extensions.is(
  (
    select count(*)
    from public.practice_questions
    where id = '94000000-0000-0000-0000-000000000002'
  ),
  1::bigint,
  'active Pro users can read questions from Pro activities'
);

select set_config(
  'request.jwt.claim.sub',
  '91000000-0000-0000-0000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"91000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select extensions.lives_ok(
  $$
    insert into public.practice_activities (
      source_key,
      skill,
      activity_type,
      title
    )
    values ('admin-crud-fixture', 'grammar', 'multiple_choice', 'Admin CRUD fixture')
  $$,
  'profile admins can insert practice content'
);
select extensions.results_eq(
  $$
    update public.practice_activities
    set title = 'Updated by admin'
    where source_key = 'admin-crud-fixture'
    returning source_key, title
  $$,
  $$
    values (
      'admin-crud-fixture'::text,
      'Updated by admin'::text
    )
  $$,
  'profile admin UPDATE changes and returns the targeted row'
);
select extensions.lives_ok(
  $$
    delete from public.practice_activities
    where source_key = 'admin-crud-fixture'
  $$,
  'profile admins can delete practice content'
);
select extensions.is(
  (
    select count(*)
    from public.practice_activities
    where source_key in ('b1-grammar-published', 'b1-grammar-draft')
  ),
  2::bigint,
  'profile admins can read both published and draft practice content'
);

select extensions.has_function(
  'public',
  'create_b1_exam',
  array['uuid', 'text', 'text', 'text', 'integer', 'text', 'uuid'],
  'guarded B1 exam creation RPC exists'
);
select extensions.ok(
  has_function_privilege(
    'authenticated',
    'public.create_b1_exam(uuid,text,text,text,integer,text,uuid)',
    'EXECUTE'
  )
    and not has_function_privilege(
      'anon',
      'public.create_b1_exam(uuid,text,text,text,integer,text,uuid)',
      'EXECUTE'
  ),
  'only authenticated clients can invoke B1 exam creation'
);
select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'public.b1_exam_generated_source_key(uuid,uuid,text,text)',
    'EXECUTE'
  )
    and not has_function_privilege(
      'authenticated',
      'public.b1_exam_blank_activity_payload(text)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated',
      'public.b1_exam_blank_prompt_payload(text)',
      'EXECUTE'
    ),
  'B1 exam creation helpers are not directly executable by clients'
);

select set_config(
  'request.jwt.claim.sub',
  '91000000-0000-0000-0000-000000000002',
  true
);
select extensions.throws_ok(
  $$
    select public.create_b1_exam(
      '97000000-0000-0000-0000-000000000099',
      'Forbidden B1 exam',
      null,
      'free',
      120,
      'blank',
      null
    )
  $$,
  '42501',
  'B1_CREATE_FORBIDDEN',
  'users without exam.create cannot create a B1 exam'
);

select set_config(
  'request.jwt.claim.sub',
  '91000000-0000-0000-0000-000000000001',
  true
);
select extensions.throws_ok(
  $$
    select public.create_b1_exam(
      '97000000-0000-0000-0000-000000000098',
      '   ',
      null,
      'free',
      120,
      'blank',
      null
    )
  $$,
  '22023',
  'B1_TITLE_REQUIRED',
  'blank B1 exams require a non-blank title'
);
select extensions.throws_ok(
  $$
    select public.create_b1_exam(
      '97000000-0000-0000-0000-000000000097',
      'Invalid duration B1 exam',
      null,
      'free',
      481,
      'blank',
      null
    )
  $$,
  '22023',
  'B1_DURATION_INVALID',
  'blank B1 exams reject durations longer than 480 minutes'
);
select extensions.throws_ok(
  $$
    select public.create_b1_exam(
      '97000000-0000-0000-0000-000000000096',
      'Invalid source B1 exam',
      null,
      'free',
      120,
      'blank',
      '92000000-0000-0000-0000-000000000001'
    )
  $$,
  '22023',
  'B1_SOURCE_NOT_ALLOWED',
  'blank B1 exams reject a source exam'
);

select extensions.lives_ok(
  $$
    select public.create_b1_exam(
      '97000000-0000-0000-0000-000000000001',
      'Blank B1 Practice',
      'Draft scaffold',
      'free',
      120,
      'blank',
      null
    )
  $$,
  'exam administrators can create a scaffolded blank B1 exam'
);
select extensions.results_eq(
  $$
    select
      title,
      description,
      access_tier,
      default_time_minutes,
      exam_format,
      cefr_level,
      is_published,
      created_by
    from public.exams
    where id = (
      select exam_id
      from public.b1_exam_creation_requests
      where requested_by = '91000000-0000-0000-0000-000000000001'
        and request_id = '97000000-0000-0000-0000-000000000001'
    )
  $$,
  $$
    values (
      'Blank B1 Practice'::text,
      'Draft scaffold'::text,
      'free'::text,
      120,
      'b1_practice'::text,
      'B1'::text,
      false,
      '91000000-0000-0000-0000-000000000001'::uuid
    )
  $$,
  'blank creation stores one unpublished B1 practice exam'
);
select extensions.results_eq(
  $$
    select es.title, es.skill, es.resource_type, es.order_index, es.is_required
    from public.exam_sections es
    where es.exam_id = (
      select exam_id
      from public.b1_exam_creation_requests
      where requested_by = '91000000-0000-0000-0000-000000000001'
        and request_id = '97000000-0000-0000-0000-000000000001'
    )
    order by es.order_index
  $$,
  $$
    values
      ('Reading'::text, 'reading'::text, 'activity'::text, 1, true),
      ('Listening'::text, 'listening'::text, 'activity'::text, 2, true),
      ('Writing'::text, 'writing'::text, 'prompt'::text, 3, true),
      ('Speaking'::text, 'speaking'::text, 'prompt'::text, 4, true)
  $$,
  'blank creation adds the four required B1 sections in skill order'
);
select extensions.results_eq(
  $$
    select
      es.skill,
      pa.activity_type,
      pa.presentation_type,
      pa.grading_mode,
      pa.is_published,
      pa.created_by
    from public.exam_sections es
    join public.practice_activities pa on pa.id = es.resource_id
    where es.exam_id = (
      select exam_id
      from public.b1_exam_creation_requests
      where requested_by = '91000000-0000-0000-0000-000000000001'
        and request_id = '97000000-0000-0000-0000-000000000001'
    )
    order by es.order_index
  $$,
  $$
    values
      (
        'reading'::text,
        'multiple_choice'::text,
        'choice_list'::text,
        'single_choice'::text,
        false,
        '91000000-0000-0000-0000-000000000001'::uuid
      ),
      (
        'listening'::text,
        'multiple_choice'::text,
        'choice_list'::text,
        'single_choice'::text,
        false,
        '91000000-0000-0000-0000-000000000001'::uuid
      )
  $$,
  'Reading and Listening receive compatible draft objective activities'
);
select extensions.is(
  (
    select count(*)
    from public.exam_sections es
    join public.practice_activities pa on pa.id = es.resource_id
    join public.practice_questions pq on pq.activity_id = pa.id
    where es.exam_id = (
      select exam_id
      from public.b1_exam_creation_requests
      where requested_by = '91000000-0000-0000-0000-000000000001'
        and request_id = '97000000-0000-0000-0000-000000000001'
    )
      and pq.prompt = ''
      and pq.accepted_answers = '[]'::jsonb
      and pq.translation is null
      and pq.explanation is null
  ),
  2::bigint,
  'objective activities receive editable starter questions without authored answers or review text'
);
select extensions.results_eq(
  $$
    select
      es.skill,
      pp.presentation_type,
      pp.grading_mode,
      pp.prompt,
      pp.is_published,
      pp.created_by
    from public.exam_sections es
    join public.practice_prompts pp on pp.id = es.resource_id
    where es.exam_id = (
      select exam_id
      from public.b1_exam_creation_requests
      where requested_by = '91000000-0000-0000-0000-000000000001'
        and request_id = '97000000-0000-0000-0000-000000000001'
    )
    order by es.order_index
  $$,
  $$
    values
      (
        'writing'::text,
        'long_form_prompt'::text,
        'manual'::text,
        ''::text,
        false,
        '91000000-0000-0000-0000-000000000001'::uuid
      ),
      (
        'speaking'::text,
        'speaking_script_prompt'::text,
        'manual'::text,
        ''::text,
        false,
        '91000000-0000-0000-0000-000000000001'::uuid
      )
  $$,
  'Writing and Speaking receive compatible draft prompt resources'
);
select extensions.ok(
  (
    with created_source_keys as (
      select e.source_key
      from public.exams e
      where e.id = (
        select exam_id
        from public.b1_exam_creation_requests
        where requested_by = '91000000-0000-0000-0000-000000000001'
          and request_id = '97000000-0000-0000-0000-000000000001'
      )
      union all
      select es.source_key
      from public.exam_sections es
      where es.exam_id = (
        select exam_id
        from public.b1_exam_creation_requests
        where requested_by = '91000000-0000-0000-0000-000000000001'
          and request_id = '97000000-0000-0000-0000-000000000001'
      )
      union all
      select pa.source_key
      from public.exam_sections es
      join public.practice_activities pa on pa.id = es.resource_id
      where es.exam_id = (
        select exam_id
        from public.b1_exam_creation_requests
        where requested_by = '91000000-0000-0000-0000-000000000001'
          and request_id = '97000000-0000-0000-0000-000000000001'
      )
      union all
      select pq.source_key
      from public.exam_sections es
      join public.practice_activities pa on pa.id = es.resource_id
      join public.practice_questions pq on pq.activity_id = pa.id
      where es.exam_id = (
        select exam_id
        from public.b1_exam_creation_requests
        where requested_by = '91000000-0000-0000-0000-000000000001'
          and request_id = '97000000-0000-0000-0000-000000000001'
      )
      union all
      select pp.source_key
      from public.exam_sections es
      join public.practice_prompts pp on pp.id = es.resource_id
      where es.exam_id = (
        select exam_id
        from public.b1_exam_creation_requests
        where requested_by = '91000000-0000-0000-0000-000000000001'
          and request_id = '97000000-0000-0000-0000-000000000001'
      )
    )
    select
      count(*) = count(distinct source_key)
      and bool_and(btrim(source_key) <> '')
    from created_source_keys
  ),
  'every generated exam, section, resource, and question source key is non-blank and unique'
);
select extensions.ok(
  not exists (
    select 1
    from public.exam_media_asset_usages usage
    where usage.resource_id in (
      select es.resource_id
      from public.exam_sections es
      where es.exam_id = (
        select exam_id
        from public.b1_exam_creation_requests
        where requested_by = '91000000-0000-0000-0000-000000000001'
          and request_id = '97000000-0000-0000-0000-000000000001'
      )
      union all
      select pq.id
      from public.exam_sections es
      join public.practice_activities pa on pa.id = es.resource_id
      join public.practice_questions pq on pq.activity_id = pa.id
      where es.exam_id = (
        select exam_id
        from public.b1_exam_creation_requests
        where requested_by = '91000000-0000-0000-0000-000000000001'
          and request_id = '97000000-0000-0000-0000-000000000001'
      )
    )
  )
    and not exists (
      select 1
      from public.practice_prompt_samples samples
      join public.exam_sections es on es.resource_id = samples.prompt_id
      where es.exam_id = (
        select exam_id
        from public.b1_exam_creation_requests
        where requested_by = '91000000-0000-0000-0000-000000000001'
          and request_id = '97000000-0000-0000-0000-000000000001'
      )
    ),
  'blank creation adds no media usages or prompt samples'
);
select extensions.is(
  public.create_b1_exam(
    '97000000-0000-0000-0000-000000000001',
    'Blank B1 Practice',
    'Draft scaffold',
    'free',
    120,
    'blank',
    null
  ),
  (
    select exam_id
    from public.b1_exam_creation_requests
    where requested_by = '91000000-0000-0000-0000-000000000001'
      and request_id = '97000000-0000-0000-0000-000000000001'
  ),
  'repeating a B1 creation request returns the original exam ID'
);
select extensions.is(
  (
    select count(*)
    from public.exams
    where title = 'Blank B1 Practice'
      and created_by = '91000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'repeating a B1 creation request leaves exactly one exam row'
);

select set_config(
  'request.jwt.claim.sub',
  '91000000-0000-0000-0000-000000000004',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"91000000-0000-0000-0000-000000000004","role":"authenticated"}',
  true
);
select extensions.throws_ok(
  $$
    select public.create_b1_exam(
      '99000000-0000-0000-0000-000000000099',
      'Unreadable source clone',
      null,
      'free',
      90,
      'structure_only',
      '98000000-0000-0000-0000-000000000001'
    )
  $$,
  '42501',
  'B1_CREATE_FORBIDDEN',
  'clone creation requires exam.read in addition to exam.create'
);

select set_config(
  'request.jwt.claim.sub',
  '91000000-0000-0000-0000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"91000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
select extensions.throws_ok(
  $$
    select public.create_b1_exam(
      '99000000-0000-0000-0000-000000000098',
      'Missing source clone',
      null,
      'free',
      90,
      'structure_only',
      null
    )
  $$,
  '22023',
  'B1_SOURCE_UNAVAILABLE',
  'clone creation rejects a missing source exam'
);
select extensions.throws_ok(
  $$
    select public.create_b1_exam(
      '99000000-0000-0000-0000-000000000097',
      'Legacy source clone',
      null,
      'free',
      90,
      'full_content',
      '92000000-0000-0000-0000-000000000001'
    )
  $$,
  '22023',
  'B1_SOURCE_UNAVAILABLE',
  'clone creation rejects a legacy source exam'
);
select extensions.throws_ok(
  $$
    select public.create_b1_exam(
      '99000000-0000-0000-0000-000000000096',
      'Nonexistent source clone',
      null,
      'free',
      90,
      'structure_only',
      '98000000-0000-0000-0000-000000000999'
    )
  $$,
  '22023',
  'B1_SOURCE_UNAVAILABLE',
  'clone creation rejects a nonexistent source exam'
);
select extensions.throws_ok(
  $$
    select public.create_b1_exam(
      '99000000-0000-0000-0000-000000000095',
      'Deleted source clone',
      null,
      'free',
      90,
      'full_content',
      '98000000-0000-0000-0000-000000000002'
    )
  $$,
  '22023',
  'B1_SOURCE_UNAVAILABLE',
  'clone creation rejects a deleted B1 source exam'
);
reset role;
select extensions.ok(
  not exists (
    select 1
    from public.exams
    where title in (
      'Unreadable source clone',
      'Missing source clone',
      'Legacy source clone',
      'Nonexistent source clone',
      'Deleted source clone'
    )
  )
    and not exists (
      select 1
      from public.b1_exam_creation_requests
      where request_id in (
        '99000000-0000-0000-0000-000000000099',
        '99000000-0000-0000-0000-000000000098',
        '99000000-0000-0000-0000-000000000097',
        '99000000-0000-0000-0000-000000000096',
        '99000000-0000-0000-0000-000000000095'
      )
    ),
  'rejected clone requests leave no partial exam or idempotency record'
);
select extensions.has_function(
  'public',
  'set_b1_exam_published_guarded',
  array['uuid', 'boolean'],
  'B1 publication is scoped to an explicit exam ID'
);
select extensions.ok(
  to_regprocedure('public.set_b1_exam_published_guarded(boolean)') is null,
  'the singleton B1 publication signature is removed'
);
select extensions.ok(
  has_function_privilege('authenticated', 'public.set_b1_exam_published_guarded(uuid,boolean)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.set_b1_exam_published_guarded(uuid,boolean)', 'EXECUTE'),
  'only authenticated clients can invoke exam-scoped publication'
);

set local role authenticated;

select extensions.lives_ok(
  $$
    select public.create_b1_exam(
      '99000000-0000-0000-0000-000000000001',
      'Structure-only clone',
      'Fresh structure without authored content.',
      'free',
      90,
      'structure_only',
      '98000000-0000-0000-0000-000000000001'
    )
  $$,
  'exam administrators can create a structure-only B1 clone'
);
select extensions.results_eq(
  $$
    select
      e.title,
      e.description,
      e.access_tier,
      e.default_time_minutes,
      e.exam_format,
      e.cefr_level,
      e.is_published,
      e.created_by,
      e.cloned_from_exam_id,
      e.clone_mode
    from public.exams e
    where e.id = (
      select exam_id
      from public.b1_exam_creation_requests
      where requested_by = '91000000-0000-0000-0000-000000000001'
        and request_id = '99000000-0000-0000-0000-000000000001'
    )
  $$,
  $$
    values (
      'Structure-only clone'::text,
      'Fresh structure without authored content.'::text,
      'free'::text,
      90,
      'b1_practice'::text,
      'B1'::text,
      false,
      '91000000-0000-0000-0000-000000000001'::uuid,
      '98000000-0000-0000-0000-000000000001'::uuid,
      'structure_only'::text
    )
  $$,
  'structure-only clone stores new exam metadata and source lineage'
);
select extensions.results_eq(
  $$
    select
      clone_section.order_index,
      clone_section.title,
      clone_section.skill,
      clone_section.resource_type,
      clone_section.is_required,
      clone_section.suggested_time_minutes,
      clone_section.id <> source_section.id,
      clone_section.resource_id <> source_section.resource_id,
      clone_section.source_key <> source_section.source_key
    from public.exam_sections clone_section
    join public.exam_sections source_section
      on source_section.exam_id = '98000000-0000-0000-0000-000000000001'
      and source_section.order_index = clone_section.order_index
    where clone_section.exam_id = (
      select exam_id
      from public.b1_exam_creation_requests
      where request_id = '99000000-0000-0000-0000-000000000001'
        and requested_by = '91000000-0000-0000-0000-000000000001'
    )
    order by clone_section.order_index
  $$,
  $$
    values
      (2, 'Choice section'::text, 'reading'::text, 'activity'::text, true, 12, true, true, true),
      (4, 'Matching section'::text, 'reading'::text, 'activity'::text, false, null::integer, true, true, true),
      (6, 'Ordering section'::text, 'listening'::text, 'activity'::text, true, 15, true, true, true),
      (8, 'Writing section'::text, 'writing'::text, 'prompt'::text, true, 30, true, true, true),
      (10, 'Speaking section'::text, 'speaking'::text, 'prompt'::text, false, 20, true, true, true)
  $$,
  'structure-only clone preserves section structure while regenerating IDs and source keys'
);
select extensions.results_eq(
  $$
    select
      es.order_index,
      coalesce(pa.presentation_type, pp.presentation_type),
      coalesce(pa.grading_mode, pp.grading_mode),
      es.resource_type,
      coalesce(pa.title, pp.title),
      coalesce(pa.skill, pp.skill),
      coalesce(pa.is_published, pp.is_published),
      coalesce(pa.access_tier, pp.access_tier),
      coalesce(pa.created_by, pp.created_by),
      coalesce(pa.source_key, pp.source_key) <> source_resource.source_key
    from public.exam_sections es
    left join public.practice_activities pa
      on es.resource_type = 'activity' and pa.id = es.resource_id
    left join public.practice_prompts pp
      on es.resource_type = 'prompt' and pp.id = es.resource_id
    join lateral (
      select coalesce(source_activity.source_key, source_prompt.source_key) as source_key
      from public.exam_sections source_section
      left join public.practice_activities source_activity
        on source_section.resource_type = 'activity' and source_activity.id = source_section.resource_id
      left join public.practice_prompts source_prompt
        on source_section.resource_type = 'prompt' and source_prompt.id = source_section.resource_id
      where source_section.exam_id = '98000000-0000-0000-0000-000000000001'
        and source_section.order_index = es.order_index
    ) source_resource on true
    where es.exam_id = (
      select exam_id
      from public.b1_exam_creation_requests
      where request_id = '99000000-0000-0000-0000-000000000001'
        and requested_by = '91000000-0000-0000-0000-000000000001'
    )
    order by es.order_index
  $$,
  $$
    values
      (2, 'choice_list'::text, 'single_choice'::text, 'activity'::text, 'Choice section'::text, 'reading'::text, false, 'free'::text, '91000000-0000-0000-0000-000000000001'::uuid, true),
      (4, 'matching'::text, 'matching'::text, 'activity'::text, 'Matching section'::text, 'reading'::text, false, 'free'::text, '91000000-0000-0000-0000-000000000001'::uuid, true),
      (6, 'ordering'::text, 'ordered_list'::text, 'activity'::text, 'Ordering section'::text, 'listening'::text, false, 'free'::text, '91000000-0000-0000-0000-000000000001'::uuid, true),
      (8, 'long_form_prompt'::text, 'sample_compare'::text, 'prompt'::text, 'Writing section'::text, 'writing'::text, false, 'free'::text, '91000000-0000-0000-0000-000000000001'::uuid, true),
      (10, 'speaking_script_prompt'::text, 'sample_compare'::text, 'prompt'::text, 'Speaking section'::text, 'speaking'::text, false, 'free'::text, '91000000-0000-0000-0000-000000000001'::uuid, true)
  $$,
  'structure-only clone preserves presentation modes with fresh builder-compatible draft resources'
);
select extensions.results_eq(
  $$
    select pa.presentation_type, pa.activity_type, pa.presentation_config
    from public.exam_sections es
    join public.practice_activities pa on pa.id = es.resource_id
    where es.exam_id = (
      select exam_id
      from public.b1_exam_creation_requests
      where request_id = '99000000-0000-0000-0000-000000000001'
        and requested_by = '91000000-0000-0000-0000-000000000001'
    )
    order by es.order_index
  $$,
  $$
    values
      ('choice_list'::text, 'multiple_choice'::text, '{}'::jsonb),
      ('matching'::text, 'multiple_choice'::text, '{"matching":{"leftItems":[],"rightItems":[],"pairs":[]}}'::jsonb),
      ('ordering'::text, 'multiple_choice'::text, '{"ordering":{"items":[]}}'::jsonb)
  $$,
  'structure-only objective resources use builder-compatible empty configurations'
);
select extensions.results_eq(
  $$
    select
      es.order_index,
      pq.source_number,
      pq.question_type,
      pq.prompt,
      pq.options,
      pq.accepted_answers,
      pq.order_index,
      pq.id <> '98300000-0000-0000-0000-000000000001'::uuid,
      pq.source_key <> 'clone-source-choice-q1'
    from public.exam_sections es
    join public.practice_questions pq on pq.activity_id = es.resource_id
    where es.exam_id = (
      select exam_id
      from public.b1_exam_creation_requests
      where request_id = '99000000-0000-0000-0000-000000000001'
        and requested_by = '91000000-0000-0000-0000-000000000001'
    )
    order by es.order_index, pq.order_index
  $$,
  $$
    values (
      2,
      '1'::text,
      'multiple_choice'::text,
      ''::text,
      '[{"key":"A","text":"","is_correct":true},{"key":"B","text":"","is_correct":false},{"key":"C","text":"","is_correct":false},{"key":"D","text":"","is_correct":false}]'::jsonb,
      '[]'::jsonb,
      0,
      true,
      true
    )
  $$,
  'structure-only clone creates one empty starter question and none for matching or ordering'
);
select extensions.ok(
  not exists (
    select 1
    from public.exam_sections es
    where es.exam_id = (
      select exam_id
      from public.b1_exam_creation_requests
      where request_id = '99000000-0000-0000-0000-000000000001'
        and requested_by = '91000000-0000-0000-0000-000000000001'
    )
      and (
        es.instructions is not null
        or es.metadata <> '{}'::jsonb
      )
  )
    and not exists (
      select 1
      from public.exam_sections es
      join public.practice_activities pa on pa.id = es.resource_id
      where es.exam_id = (
        select exam_id
        from public.b1_exam_creation_requests
        where request_id = '99000000-0000-0000-0000-000000000001'
          and requested_by = '91000000-0000-0000-0000-000000000001'
      )
        and (
          pa.instructions is not null
          or pa.content is not null
          or pa.passage is not null
          or pa.audio_url is not null
          or pa.metadata <> '{}'::jsonb
          or pa.content_blocks <> '[]'::jsonb
          or pa.review_config <> '{}'::jsonb
        )
    )
    and not exists (
      select 1
      from public.exam_sections es
      join public.practice_questions pq on pq.activity_id = es.resource_id
      where es.exam_id = (
        select exam_id
        from public.b1_exam_creation_requests
        where request_id = '99000000-0000-0000-0000-000000000001'
          and requested_by = '91000000-0000-0000-0000-000000000001'
      )
        and (
          pq.prompt <> ''
          or pq.accepted_answers <> '[]'::jsonb
          or pq.source_page is not null
          or pq.image_url is not null
          or pq.metadata <> '{}'::jsonb
          or pq.translation is not null
          or pq.explanation is not null
        )
    )
    and not exists (
      select 1
      from public.exam_sections es
      join public.practice_prompts pp on pp.id = es.resource_id
      where es.exam_id = (
        select exam_id
        from public.b1_exam_creation_requests
        where request_id = '99000000-0000-0000-0000-000000000001'
          and requested_by = '91000000-0000-0000-0000-000000000001'
      )
        and (
          pp.prompt <> ''
          or pp.instructions is not null
          or pp.content is not null
          or pp.source_page is not null
          or pp.image_url is not null
          or pp.audio_url is not null
          or pp.metadata <> '{}'::jsonb
          or pp.content_blocks <> '[]'::jsonb
          or pp.presentation_config <> '{}'::jsonb
          or pp.review_config <> '{}'::jsonb
        )
    ),
  'structure-only resources contain no authored text, answers, review metadata, or URLs'
);
select extensions.ok(
  not exists (
    select 1
    from public.practice_prompt_samples samples
    join public.exam_sections es on es.resource_id = samples.prompt_id
    where es.exam_id = (
      select exam_id
      from public.b1_exam_creation_requests
      where request_id = '99000000-0000-0000-0000-000000000001'
        and requested_by = '91000000-0000-0000-0000-000000000001'
    )
  )
    and not exists (
      select 1
      from public.exam_media_asset_usages usage
      where usage.resource_id in (
        select es.resource_id
        from public.exam_sections es
        where es.exam_id = (
          select exam_id
          from public.b1_exam_creation_requests
          where request_id = '99000000-0000-0000-0000-000000000001'
            and requested_by = '91000000-0000-0000-0000-000000000001'
        )
        union all
        select pq.id
        from public.exam_sections es
        join public.practice_questions pq on pq.activity_id = es.resource_id
        where es.exam_id = (
          select exam_id
          from public.b1_exam_creation_requests
          where request_id = '99000000-0000-0000-0000-000000000001'
            and requested_by = '91000000-0000-0000-0000-000000000001'
        )
      )
    ),
  'structure-only clone creates no prompt samples or media usages'
);

select extensions.lives_ok(
  $$
    select public.create_b1_exam(
      '99000000-0000-0000-0000-000000000002',
      'Full-content clone',
      'Independent authored content with shared media assets.',
      'free',
      105,
      'full_content',
      '98000000-0000-0000-0000-000000000001'
    )
  $$,
  'exam administrators can create a full-content B1 clone'
);
select extensions.results_eq(
  $$
    select
      e.title,
      e.description,
      e.access_tier,
      e.default_time_minutes,
      e.exam_format,
      e.cefr_level,
      e.is_published,
      e.created_by,
      e.cloned_from_exam_id,
      e.clone_mode
    from public.exams e
    where e.id = (
      select exam_id
      from public.b1_exam_creation_requests
      where requested_by = '91000000-0000-0000-0000-000000000001'
        and request_id = '99000000-0000-0000-0000-000000000002'
    )
  $$,
  $$
    values (
      'Full-content clone'::text,
      'Independent authored content with shared media assets.'::text,
      'free'::text,
      105,
      'b1_practice'::text,
      'B1'::text,
      false,
      '91000000-0000-0000-0000-000000000001'::uuid,
      '98000000-0000-0000-0000-000000000001'::uuid,
      'full_content'::text
    )
  $$,
  'full-content clone stores new exam metadata and source lineage'
);
select extensions.ok(
  (
    select count(*) = 5
      and bool_and(
        clone_section.id <> source_section.id
        and clone_section.resource_id <> source_section.resource_id
        and clone_section.source_key <> source_section.source_key
        and clone_section.title = source_section.title
        and clone_section.skill = source_section.skill
        and clone_section.instructions is not distinct from source_section.instructions
        and clone_section.resource_type = source_section.resource_type
        and clone_section.order_index = source_section.order_index
        and clone_section.is_required = source_section.is_required
        and clone_section.suggested_time_minutes is not distinct from source_section.suggested_time_minutes
        and clone_section.metadata = source_section.metadata
      )
    from public.exam_sections clone_section
    join public.exam_sections source_section
      on source_section.exam_id = '98000000-0000-0000-0000-000000000001'
      and source_section.order_index = clone_section.order_index
    where clone_section.exam_id = (
      select exam_id
      from public.b1_exam_creation_requests
      where request_id = '99000000-0000-0000-0000-000000000002'
        and requested_by = '91000000-0000-0000-0000-000000000001'
    )
  ),
  'full-content clone deep-copies every section field into new IDs and source keys'
);
select extensions.ok(
  (
    select count(*) = 3
      and bool_and(
        clone_activity.id <> source_activity.id
        and clone_activity.source_key <> source_activity.source_key
        and clone_activity.skill = source_activity.skill
        and clone_activity.activity_type = source_activity.activity_type
        and clone_activity.title = source_activity.title
        and clone_activity.instructions is not distinct from source_activity.instructions
        and clone_activity.content is not distinct from source_activity.content
        and clone_activity.passage is not distinct from source_activity.passage
        and clone_activity.audio_url is not distinct from source_activity.audio_url
        and clone_activity.metadata = source_activity.metadata
        and clone_activity.presentation_type is not distinct from source_activity.presentation_type
        and clone_activity.grading_mode is not distinct from source_activity.grading_mode
        and clone_activity.content_schema_version = source_activity.content_schema_version
        and clone_activity.content_blocks = source_activity.content_blocks
        and clone_activity.presentation_config = source_activity.presentation_config
        and clone_activity.review_config = source_activity.review_config
        and clone_activity.is_published = false
        and clone_activity.access_tier = 'free'
        and clone_activity.created_by = '91000000-0000-0000-0000-000000000001'
      )
    from public.exam_sections clone_section
    join public.exam_sections source_section
      on source_section.exam_id = '98000000-0000-0000-0000-000000000001'
      and source_section.order_index = clone_section.order_index
      and source_section.resource_type = 'activity'
    join public.practice_activities clone_activity on clone_activity.id = clone_section.resource_id
    join public.practice_activities source_activity on source_activity.id = source_section.resource_id
    where clone_section.exam_id = (
      select exam_id
      from public.b1_exam_creation_requests
      where request_id = '99000000-0000-0000-0000-000000000002'
        and requested_by = '91000000-0000-0000-0000-000000000001'
    )
  ),
  'full-content clone copies every activity field consumed by attempt and result renderers'
);
select extensions.ok(
  (
    select count(*) = 2
      and bool_and(
        clone_prompt.id <> source_prompt.id
        and clone_prompt.source_key <> source_prompt.source_key
        and clone_prompt.skill = source_prompt.skill
        and clone_prompt.title = source_prompt.title
        and clone_prompt.prompt = source_prompt.prompt
        and clone_prompt.instructions is not distinct from source_prompt.instructions
        and clone_prompt.content is not distinct from source_prompt.content
        and clone_prompt.source_page is not distinct from source_prompt.source_page
        and clone_prompt.image_url is not distinct from case
          when source_prompt.id = '98200000-0000-0000-0000-000000000002'::uuid
            then 'https://cdn.example.test/b1/source-sign.png'
          else source_prompt.image_url
        end
        and clone_prompt.audio_url is not distinct from source_prompt.audio_url
        and clone_prompt.metadata = source_prompt.metadata
        and clone_prompt.presentation_type is not distinct from source_prompt.presentation_type
        and clone_prompt.grading_mode is not distinct from source_prompt.grading_mode
        and clone_prompt.content_schema_version = source_prompt.content_schema_version
        and clone_prompt.content_blocks = source_prompt.content_blocks
        and clone_prompt.presentation_config = source_prompt.presentation_config
        and clone_prompt.review_config = source_prompt.review_config
        and clone_prompt.is_published = false
        and clone_prompt.access_tier = 'free'
        and clone_prompt.created_by = '91000000-0000-0000-0000-000000000001'
      )
    from public.exam_sections clone_section
    join public.exam_sections source_section
      on source_section.exam_id = '98000000-0000-0000-0000-000000000001'
      and source_section.order_index = clone_section.order_index
      and source_section.resource_type = 'prompt'
    join public.practice_prompts clone_prompt on clone_prompt.id = clone_section.resource_id
    join public.practice_prompts source_prompt on source_prompt.id = source_section.resource_id
    where clone_section.exam_id = (
      select exam_id
      from public.b1_exam_creation_requests
      where request_id = '99000000-0000-0000-0000-000000000002'
        and requested_by = '91000000-0000-0000-0000-000000000001'
    )
  ),
  'full-content clone copies every prompt field consumed by attempt and result renderers'
);
select extensions.ok(
  (
    select count(*) = 1
      and bool_and(
        clone_question.id <> source_question.id
        and clone_question.source_key <> source_question.source_key
        and clone_question.source_number is not distinct from source_question.source_number
        and clone_question.question_type = source_question.question_type
        and clone_question.prompt = source_question.prompt
        and clone_question.options = source_question.options
        and clone_question.accepted_answers = source_question.accepted_answers
        and clone_question.source_page is not distinct from source_question.source_page
        and clone_question.image_url is not distinct from source_question.image_url
        and clone_question.order_index = source_question.order_index
        and clone_question.metadata = source_question.metadata
        and clone_question.translation is not distinct from source_question.translation
        and clone_question.explanation is not distinct from source_question.explanation
      )
    from public.exam_sections clone_section
    join public.exam_sections source_section
      on source_section.exam_id = '98000000-0000-0000-0000-000000000001'
      and source_section.order_index = clone_section.order_index
      and source_section.resource_type = 'activity'
    join public.practice_questions clone_question on clone_question.activity_id = clone_section.resource_id
    join public.practice_questions source_question
      on source_question.activity_id = source_section.resource_id
      and source_question.order_index = clone_question.order_index
    where clone_section.exam_id = (
      select exam_id
      from public.b1_exam_creation_requests
      where request_id = '99000000-0000-0000-0000-000000000002'
        and requested_by = '91000000-0000-0000-0000-000000000001'
    )
  ),
  'full-content clone copies question options, answers, review text, metadata, and URLs into new rows'
);
select extensions.ok(
  (
    select count(*) = 2
      and bool_and(
        clone_sample.id <> source_sample.id
        and clone_sample.prompt_id <> source_sample.prompt_id
        and clone_sample.title = source_sample.title
        and clone_sample.content = source_sample.content
      )
    from public.exam_sections clone_section
    join public.exam_sections source_section
      on source_section.exam_id = '98000000-0000-0000-0000-000000000001'
      and source_section.order_index = clone_section.order_index
      and source_section.resource_type = 'prompt'
    join public.practice_prompt_samples clone_sample on clone_sample.prompt_id = clone_section.resource_id
    join public.practice_prompt_samples source_sample
      on source_sample.prompt_id = source_section.resource_id
      and source_sample.title = clone_sample.title
    where clone_section.exam_id = (
      select exam_id
      from public.b1_exam_creation_requests
      where request_id = '99000000-0000-0000-0000-000000000002'
        and requested_by = '91000000-0000-0000-0000-000000000001'
    )
  ),
  'full-content clone deep-copies Writing and Speaking samples into new IDs'
);
select extensions.results_eq(
  $$
    select usage.asset_id, usage.resource_type, usage.usage_role,
      usage.id not in (
        '98700000-0000-0000-0000-000000000001'::uuid,
        '98700000-0000-0000-0000-000000000002'::uuid,
        '98700000-0000-0000-0000-000000000003'::uuid
      )
    from public.exam_media_asset_usages usage
    where usage.resource_id in (
      select es.resource_id
      from public.exam_sections es
      where es.exam_id = (
        select exam_id
        from public.b1_exam_creation_requests
        where request_id = '99000000-0000-0000-0000-000000000002'
          and requested_by = '91000000-0000-0000-0000-000000000001'
      )
      union all
      select pq.id
      from public.exam_sections es
      join public.practice_questions pq on pq.activity_id = es.resource_id
      where es.exam_id = (
        select exam_id
        from public.b1_exam_creation_requests
        where request_id = '99000000-0000-0000-0000-000000000002'
          and requested_by = '91000000-0000-0000-0000-000000000001'
      )
    )
    order by usage.resource_type
  $$,
  $$
    values
      ('98600000-0000-0000-0000-000000000001'::uuid, 'activity'::text, 'audio'::text, true),
      ('98600000-0000-0000-0000-000000000002'::uuid, 'prompt'::text, 'image'::text, true),
      ('98600000-0000-0000-0000-000000000002'::uuid, 'question'::text, 'image'::text, true)
  $$,
  'full-content clone creates distinct usage rows that share the source media asset IDs'
);
select extensions.results_eq(
  $$
    select
      clone_activity.audio_url,
      source_prompt.image_url,
      clone_prompt.image_url,
      clone_question.image_url,
      (select count(*) from public.exam_media_assets)
    from public.exam_sections clone_choice_section
    join public.practice_activities clone_activity on clone_activity.id = clone_choice_section.resource_id
    join public.practice_questions clone_question on clone_question.activity_id = clone_activity.id
    join public.exam_sections clone_speaking_section
      on clone_speaking_section.exam_id = clone_choice_section.exam_id
      and clone_speaking_section.order_index = 10
    join public.practice_prompts clone_prompt on clone_prompt.id = clone_speaking_section.resource_id
    join public.practice_prompts source_prompt
      on source_prompt.id = '98200000-0000-0000-0000-000000000002'
    where clone_choice_section.exam_id = (
      select exam_id
      from public.b1_exam_creation_requests
      where request_id = '99000000-0000-0000-0000-000000000002'
        and requested_by = '91000000-0000-0000-0000-000000000001'
    )
      and clone_choice_section.order_index = 2
  $$,
  $$
    values (
      'https://cdn.example.test/b1/source-audio.mp3'::text,
      'https://cdn.example.test/b1/stale-speaking-image.png'::text,
      'https://cdn.example.test/b1/source-sign.png'::text,
      'https://cdn.example.test/b1/source-sign.png'::text,
      2::bigint
    )
  $$,
  'full-content clone keeps resource URLs aligned while creating no media asset rows'
);
reset role;
select extensions.results_eq(
  $$
    select
      (select count(*) from public.exam_attempts),
      (select count(*) from public.exam_attempt_grading_snapshots),
      (select count(*) from public.exam_section_attempts),
      (select count(*) from public.practice_draft_versions)
  $$,
  $$ values (1::bigint, 1::bigint, 1::bigint, 1::bigint) $$,
  'cloning creates no learner attempts, grading results, section progress, or draft versions'
);
set local role authenticated;

insert into public.exam_media_assets (
  id,
  media_kind,
  bucket_id,
  storage_path,
  public_url,
  display_name,
  replaces_asset_id,
  created_by
)
values (
  '98600000-0000-0000-0000-000000000003',
  'audio',
  'external',
  'clone-fixture/replacement-audio.mp3',
  'https://cdn.example.test/b1/replacement-audio.mp3',
  'Clone-only replacement audio',
  '98600000-0000-0000-0000-000000000001',
  '91000000-0000-0000-0000-000000000001'
);
select extensions.lives_ok(
  $$
    update public.exam_media_asset_usages usage
    set asset_id = '98600000-0000-0000-0000-000000000003'
    where usage.resource_type = 'activity'
      and usage.usage_role = 'audio'
      and usage.resource_id = (
        select es.resource_id
        from public.exam_sections es
        where es.exam_id = (
          select exam_id
          from public.b1_exam_creation_requests
          where request_id = '99000000-0000-0000-0000-000000000002'
            and requested_by = '91000000-0000-0000-0000-000000000001'
        )
          and es.order_index = 2
      )
  $$,
  'clone media usage can move to a replacement asset without changing the source usage'
);
select extensions.lives_ok(
  $$
    update public.practice_activities activity
    set audio_url = 'https://cdn.example.test/b1/replacement-audio.mp3'
    where activity.id = (
      select es.resource_id
      from public.exam_sections es
      where es.exam_id = (
        select exam_id
        from public.b1_exam_creation_requests
        where request_id = '99000000-0000-0000-0000-000000000002'
          and requested_by = '91000000-0000-0000-0000-000000000001'
      )
        and es.order_index = 2
    )
  $$,
  'clone resource URL can move to the replacement asset URL'
);
select extensions.results_eq(
  $$
    select
      source_activity.audio_url,
      source_usage.asset_id,
      clone_activity.audio_url,
      clone_usage.asset_id
    from public.practice_activities source_activity
    join public.exam_media_asset_usages source_usage
      on source_usage.resource_type = 'activity'
      and source_usage.resource_id = source_activity.id
      and source_usage.usage_role = 'audio'
    join public.exam_sections clone_section
      on clone_section.exam_id = (
        select exam_id
        from public.b1_exam_creation_requests
        where request_id = '99000000-0000-0000-0000-000000000002'
          and requested_by = '91000000-0000-0000-0000-000000000001'
      )
      and clone_section.order_index = 2
    join public.practice_activities clone_activity on clone_activity.id = clone_section.resource_id
    join public.exam_media_asset_usages clone_usage
      on clone_usage.resource_type = 'activity'
      and clone_usage.resource_id = clone_activity.id
      and clone_usage.usage_role = 'audio'
    where source_activity.id = '98100000-0000-0000-0000-000000000001'
  $$,
  $$
    values (
      'https://cdn.example.test/b1/source-audio.mp3'::text,
      '98600000-0000-0000-0000-000000000001'::uuid,
      'https://cdn.example.test/b1/replacement-audio.mp3'::text,
      '98600000-0000-0000-0000-000000000003'::uuid
    )
  $$,
  'media replacement is copy-on-write for clone usage and URL state'
);
reset role;
select extensions.lives_ok(
  $$
    do $clone_edit$
    begin
      update public.practice_activities activity
      set passage = '<p>Clone-only edited passage.</p>'
      where activity.id = (
        select es.resource_id
        from public.exam_sections es
        where es.exam_id = (
          select exam_id
          from public.b1_exam_creation_requests
          where request_id = '99000000-0000-0000-0000-000000000002'
            and requested_by = '91000000-0000-0000-0000-000000000001'
        )
          and es.order_index = 2
      );

      update public.practice_questions question
      set
        prompt = 'Clone-only edited question?',
        explanation = 'Clone-only edited explanation.'
      where question.activity_id = (
        select es.resource_id
        from public.exam_sections es
        where es.exam_id = (
          select exam_id
          from public.b1_exam_creation_requests
          where request_id = '99000000-0000-0000-0000-000000000002'
            and requested_by = '91000000-0000-0000-0000-000000000001'
        )
          and es.order_index = 2
      );

      update public.practice_prompt_samples sample
      set content = 'Clone-only edited writing sample.'
      where sample.prompt_id = (
        select es.resource_id
        from public.exam_sections es
        where es.exam_id = (
          select exam_id
          from public.b1_exam_creation_requests
          where request_id = '99000000-0000-0000-0000-000000000002'
            and requested_by = '91000000-0000-0000-0000-000000000001'
        )
          and es.order_index = 8
      );
    end;
    $clone_edit$;
  $$,
  'full clone content can be edited independently'
);
set local role authenticated;
select extensions.results_eq(
  $$
    select
      source_activity.passage,
      clone_activity.passage,
      source_question.prompt,
      clone_question.prompt,
      source_question.explanation,
      clone_question.explanation,
      source_sample.content,
      clone_sample.content
    from public.practice_activities source_activity
    join public.practice_questions source_question on source_question.activity_id = source_activity.id
    join public.practice_prompt_samples source_sample
      on source_sample.id = '98500000-0000-0000-0000-000000000001'
    join public.exam_sections clone_choice_section
      on clone_choice_section.exam_id = (
        select exam_id
        from public.b1_exam_creation_requests
        where request_id = '99000000-0000-0000-0000-000000000002'
          and requested_by = '91000000-0000-0000-0000-000000000001'
      )
      and clone_choice_section.order_index = 2
    join public.practice_activities clone_activity on clone_activity.id = clone_choice_section.resource_id
    join public.practice_questions clone_question on clone_question.activity_id = clone_activity.id
    join public.exam_sections clone_writing_section
      on clone_writing_section.exam_id = clone_choice_section.exam_id
      and clone_writing_section.order_index = 8
    join public.practice_prompt_samples clone_sample
      on clone_sample.prompt_id = clone_writing_section.resource_id
      and clone_sample.title = source_sample.title
    where source_activity.id = '98100000-0000-0000-0000-000000000001'
  $$,
  $$
    values (
      '<p>Authored source passage.</p>'::text,
      '<p>Clone-only edited passage.</p>'::text,
      'Which authored option is correct?'::text,
      'Clone-only edited question?'::text,
      'Alpha is correct because this is the authored fixture.'::text,
      'Clone-only edited explanation.'::text,
      'This is the authored writing sample.'::text,
      'Clone-only edited writing sample.'::text
    )
  $$,
  'editing cloned content and samples leaves the source rows unchanged'
);
select extensions.results_eq(
  $$
    select
      source_question.image_url,
      source_usage.asset_id,
      clone_question.image_url,
      clone_usage.asset_id,
      source_usage.id <> clone_usage.id
    from public.practice_questions source_question
    join public.exam_media_asset_usages source_usage
      on source_usage.resource_type = 'question'
      and source_usage.resource_id = source_question.id
      and source_usage.usage_role = 'image'
    join public.exam_sections clone_section
      on clone_section.exam_id = (
        select exam_id
        from public.b1_exam_creation_requests
        where request_id = '99000000-0000-0000-0000-000000000002'
          and requested_by = '91000000-0000-0000-0000-000000000001'
      )
      and clone_section.order_index = 2
    join public.practice_questions clone_question on clone_question.activity_id = clone_section.resource_id
    join public.exam_media_asset_usages clone_usage
      on clone_usage.resource_type = 'question'
      and clone_usage.resource_id = clone_question.id
      and clone_usage.usage_role = 'image'
    where source_question.id = '98300000-0000-0000-0000-000000000001'
  $$,
  $$
    values (
      'https://cdn.example.test/b1/source-sign.png'::text,
      '98600000-0000-0000-0000-000000000002'::uuid,
      'https://cdn.example.test/b1/source-sign.png'::text,
      '98600000-0000-0000-0000-000000000002'::uuid,
      true
    )
  $$,
  'question image media remains shared only through distinct usage rows'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '91000000-0000-0000-0000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"91000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select extensions.lives_ok(
  $$
    select public.create_b1_exam(
      '99000000-0000-0000-0000-000000000003',
      'Published counter clone',
      'Independent published clone used to prove unpublish isolation.',
      'free',
      105,
      'full_content',
      '98000000-0000-0000-0000-000000000001'
    )
  $$,
  'exam administrators can create a published-state counter clone'
);
select extensions.lives_ok(
  $$
    do $prepare_clone$
    begin
      update public.practice_activities activity
      set is_published = true,
          audio_url = case when activity.skill = 'listening' then 'https://cdn.example.test/b1/ready-clone-listening.mp3' else activity.audio_url end
      where exists (
        select 1 from public.exam_sections section
        where section.exam_id in (
          select exam_id from public.b1_exam_creation_requests
          where request_id in ('99000000-0000-0000-0000-000000000002', '99000000-0000-0000-0000-000000000003')
            and requested_by = '91000000-0000-0000-0000-000000000001'
        ) and section.resource_type = 'activity' and section.resource_id = activity.id and section.is_required
      );
      update public.practice_prompts prompt
      set is_published = true
      where exists (
        select 1 from public.exam_sections section
        where section.exam_id in (
          select exam_id from public.b1_exam_creation_requests
          where request_id in ('99000000-0000-0000-0000-000000000002', '99000000-0000-0000-0000-000000000003')
            and requested_by = '91000000-0000-0000-0000-000000000001'
        ) and section.resource_type = 'prompt' and section.resource_id = prompt.id and section.is_required
      );
    end;
    $prepare_clone$;
  $$,
  'the full-content clone can be prepared for exam-scoped publication'
);
select extensions.lives_ok(
  $$ select public.set_b1_exam_published_guarded((
    select exam_id from public.b1_exam_creation_requests
    where request_id = '99000000-0000-0000-0000-000000000002'
      and requested_by = '91000000-0000-0000-0000-000000000001'
  ), true) $$,
  'publishing a ready B1 clone ignores a different incomplete B1 clone'
);
select extensions.results_eq(
  $$
    select is_published from public.exams where id = (
      select exam_id from public.b1_exam_creation_requests
      where request_id = '99000000-0000-0000-0000-000000000002'
        and requested_by = '91000000-0000-0000-0000-000000000001'
    )
  $$,
  $$ values (true::boolean) $$,
  'publishing changes only the requested ready clone'
);
select extensions.results_eq(
  $$
    select is_published from public.exams where id = (
      select exam_id from public.b1_exam_creation_requests
      where request_id = '99000000-0000-0000-0000-000000000001'
        and requested_by = '91000000-0000-0000-0000-000000000001'
    )
  $$,
  $$ values (false::boolean) $$,
  'publishing does not inspect or publish the incomplete clone'
);
select extensions.lives_ok(
  $$ select public.set_b1_exam_published_guarded((
    select exam_id from public.b1_exam_creation_requests
    where request_id = '99000000-0000-0000-0000-000000000003'
      and requested_by = '91000000-0000-0000-0000-000000000001'
  ), true) $$,
  'the counter clone can be published before unpublish isolation is checked'
);
select extensions.lives_ok(
  $$ select public.set_b1_exam_published_guarded((
    select exam_id from public.b1_exam_creation_requests
    where request_id = '99000000-0000-0000-0000-000000000002'
      and requested_by = '91000000-0000-0000-0000-000000000001'
  ), false) $$,
  'unpublishing targets the requested ready clone'
);
select extensions.results_eq(
  $$
    select is_published from public.exams where id = (
      select exam_id from public.b1_exam_creation_requests
      where request_id = '99000000-0000-0000-0000-000000000002'
        and requested_by = '91000000-0000-0000-0000-000000000001'
    )
  $$,
  $$ values (false::boolean) $$,
  'unpublishing changes the requested ready clone to false'
);
select extensions.results_eq(
  $$
    select is_published from public.exams where id = (
      select exam_id from public.b1_exam_creation_requests
      where request_id = '99000000-0000-0000-0000-000000000003'
        and requested_by = '91000000-0000-0000-0000-000000000001'
    )
  $$,
  $$ values (true::boolean) $$,
  'unpublishing leaves the separately published counter clone true'
);
select extensions.lives_ok(
  $$ select public.set_b1_exam_published_guarded((
    select exam_id from public.b1_exam_creation_requests
    where request_id = '99000000-0000-0000-0000-000000000002'
      and requested_by = '91000000-0000-0000-0000-000000000001'
  ), true) $$,
  'the ready clone can be republished for learner eligibility'
);
select extensions.throws_ok(
  $$ select public.set_b1_exam_published_guarded('92000000-0000-0000-0000-000000000001', true) $$,
  '22023', 'B1_EXAM_UNAVAILABLE', 'legacy exams cannot be published through the B1 publication RPC'
);
select extensions.throws_ok(
  $$ select public.set_b1_exam_published_guarded('98000000-0000-0000-0000-000000000002', true) $$,
  '22023', 'B1_EXAM_UNAVAILABLE', 'deleted B1 exams cannot be published'
);

select extensions.has_function(
  'public',
  'clear_b1_exam_audio_asset_atomically',
  array['uuid', 'text', 'uuid'],
  'atomic B1 audio clear RPC exists'
);
select extensions.ok(
  has_function_privilege('authenticated', 'public.clear_b1_exam_audio_asset_atomically(uuid,text,uuid)', 'EXECUTE')
    and not has_function_privilege('anon', 'public.clear_b1_exam_audio_asset_atomically(uuid,text,uuid)', 'EXECUTE'),
  'only authenticated users can invoke atomic B1 audio clear'
);

insert into public.exam_media_asset_usages (id, asset_id, resource_type, resource_id, usage_role)
values (
  '98700000-0000-0000-0000-000000000004',
  '98600000-0000-0000-0000-000000000001',
  'prompt',
  '98200000-0000-0000-0000-000000000001',
  'audio'
);

select extensions.throws_ok(
  $$
    select public.clear_b1_exam_audio_asset_atomically(
      (
        select exam_id from public.b1_exam_creation_requests
        where request_id = '99000000-0000-0000-0000-000000000002'
          and requested_by = '91000000-0000-0000-0000-000000000001'
      ),
      'activity',
      '98100000-0000-0000-0000-000000000001'
    )
  $$,
  '22023', 'B1_MEDIA_RESOURCE_UNAVAILABLE',
  'atomic audio clear refuses a resource outside the requested B1 exam'
);

reset role;
create function public.fail_b1_audio_usage_clear_test()
returns trigger
language plpgsql
as $$
begin
  raise exception using errcode = 'P0001', message = 'B1_MEDIA_USAGE_DELETE_FORCED_FAILURE';
end;
$$;
create trigger fail_b1_audio_usage_clear_test
before delete on public.exam_media_asset_usages
for each row
when (
  old.resource_type = 'activity'
  and old.resource_id = '98100000-0000-0000-0000-000000000001'::uuid
  and old.usage_role = 'audio'
)
execute function public.fail_b1_audio_usage_clear_test();
set local role authenticated;

select extensions.throws_ok(
  $$
    select public.clear_b1_exam_audio_asset_atomically(
      '98000000-0000-0000-0000-000000000001',
      'activity',
      '98100000-0000-0000-0000-000000000001'
    )
  $$,
  'P0001', 'B1_MEDIA_USAGE_DELETE_FORCED_FAILURE',
  'atomic audio clear rolls back when usage deletion fails'
);
select extensions.results_eq(
  $$
    select
      activity.audio_url,
      exists (
        select 1 from public.exam_media_asset_usages usage
        where usage.resource_type = 'activity'
          and usage.resource_id = activity.id
          and usage.usage_role = 'audio'
      ),
      exists (
        select 1 from public.exam_media_asset_usages usage
        where usage.id = '98700000-0000-0000-0000-000000000004'
      )
    from public.practice_activities activity
    where activity.id = '98100000-0000-0000-0000-000000000001'
  $$,
  $$ values ('https://cdn.example.test/b1/source-audio.mp3'::text, true, true) $$,
  'failed atomic clear commits neither the target URL nor either usage row'
);

reset role;
drop trigger fail_b1_audio_usage_clear_test on public.exam_media_asset_usages;
drop function public.fail_b1_audio_usage_clear_test();
set local role authenticated;

select extensions.lives_ok(
  $$
    select public.clear_b1_exam_audio_asset_atomically(
      '98000000-0000-0000-0000-000000000001',
      'activity',
      '98100000-0000-0000-0000-000000000001'
    )
  $$,
  'atomic audio clear removes the requested resource usage'
);
select extensions.results_eq(
  $$
    select
      activity.audio_url,
      exists (
        select 1 from public.exam_media_asset_usages usage
        where usage.resource_type = 'activity'
          and usage.resource_id = activity.id
          and usage.usage_role = 'audio'
      ),
      exists (
        select 1 from public.exam_media_asset_usages usage
        where usage.id = '98700000-0000-0000-0000-000000000004'
      )
    from public.practice_activities activity
    where activity.id = '98100000-0000-0000-0000-000000000001'
  $$,
  $$ values (null::text, false, true) $$,
  'successful atomic clear changes only the selected resource and keeps the shared usage'
);

select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"91000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select extensions.throws_ok(
  $$
    select public.clear_b1_exam_audio_asset_atomically(
      '98000000-0000-0000-0000-000000000001',
      'activity',
      '98100000-0000-0000-0000-000000000001'
    )
  $$,
  '42501', 'B1_MEDIA_UPDATE_FORBIDDEN',
  'callers without exam.update cannot clear B1 audio'
);
select extensions.throws_ok(
  $$ select public.set_b1_exam_published_guarded((
    select exam_id from public.b1_exam_creation_requests
    where request_id = '99000000-0000-0000-0000-000000000002'
      and requested_by = '91000000-0000-0000-0000-000000000001'
  ), false) $$,
  '42501', 'B1_PUBLISH_FORBIDDEN', 'callers without exam.publish cannot change publication'
);

select extensions.lives_ok(
  $$
    select public.start_b1_exam_attempt(
      (
        select exam_id from public.b1_exam_creation_requests
        where request_id = '99000000-0000-0000-0000-000000000002'
          and requested_by = '91000000-0000-0000-0000-000000000001'
      ),
      7200
    )
  $$,
  'learners can start a published ready B1 clone through the guarded RPC'
);
select extensions.throws_ok(
  $$ select public.start_b1_exam_attempt('92000000-0000-0000-0000-000000000001', 7200) $$,
  '42501', 'exam is not available',
  'learners cannot start a published legacy exam even when its CEFR level is B1'
);
select extensions.is(
  (
    select count(*)
    from public.exam_attempts
    where exam_id = (
      select exam_id from public.b1_exam_creation_requests
      where request_id = '99000000-0000-0000-0000-000000000002'
        and requested_by = '91000000-0000-0000-0000-000000000001'
    )
  ),
  1::bigint,
  'learners can read only their own newly created attempt'
);
select extensions.is(
  (
    select target_duration_seconds
    from public.exam_attempts
    where exam_id = (
      select exam_id from public.b1_exam_creation_requests
      where request_id = '99000000-0000-0000-0000-000000000002'
        and requested_by = '91000000-0000-0000-0000-000000000001'
    )
  ),
  7200,
  'attempt keeps the learner-selected duration'
);
select extensions.is(
  (
    select jsonb_array_length(exam_snapshot -> 'sections')
    from public.exam_attempts
    where exam_id = (
      select exam_id from public.b1_exam_creation_requests
      where request_id = '99000000-0000-0000-0000-000000000002'
        and requested_by = '91000000-0000-0000-0000-000000000001'
    )
  ),
  3,
  'attempt snapshot contains only sections accessible to the learner'
);
select extensions.lives_ok(
  $$
    select public.save_b1_section_attempt_progress(
      (
        select id
        from public.exam_attempts
        where exam_id = (
          select exam_id from public.b1_exam_creation_requests
          where request_id = '99000000-0000-0000-0000-000000000002'
            and requested_by = '91000000-0000-0000-0000-000000000001'
        )
      ),
      (
        select source_key from public.exam_sections
        where exam_id = (
          select exam_id from public.b1_exam_creation_requests
          where request_id = '99000000-0000-0000-0000-000000000002'
            and requested_by = '91000000-0000-0000-0000-000000000001'
        ) and order_index = 2
      ),
      '{"answers":{"b1-grammar-question-1":"A"}}'::jsonb,
      'completed'
    )
  $$,
  'learners can autosave their own section progress through the guarded RPC'
);
select extensions.is(
  (
    select status
    from public.exam_section_attempts
    where attempt_id = (
      select id from public.exam_attempts
      where exam_id = (
        select exam_id from public.b1_exam_creation_requests
        where request_id = '99000000-0000-0000-0000-000000000002'
          and requested_by = '91000000-0000-0000-0000-000000000001'
      )
    )
      and exam_section_source_key = (
        select source_key from public.exam_sections
        where exam_id = (
          select exam_id from public.b1_exam_creation_requests
          where request_id = '99000000-0000-0000-0000-000000000002'
            and requested_by = '91000000-0000-0000-0000-000000000001'
        ) and order_index = 2
      )
  ),
  'completed',
  'autosave changes the owned section state'
);
select extensions.lives_ok(
  $$ select public.create_practice_draft_version('95000000-0000-0000-0000-000000000001', 'Version one.') $$,
  'learners can save their first prompt version'
);
select extensions.is(
  (
    select word_count
    from public.practice_draft_versions
    where prompt_id = '95000000-0000-0000-0000-000000000001'
      and version_number = 1
  ),
  2,
  'draft versions count whitespace-separated words correctly'
);
select extensions.lives_ok(
  $$ select public.create_practice_draft_version('95000000-0000-0000-0000-000000000001', 'Version two.') $$,
  'learners can save their second prompt version'
);
select extensions.lives_ok(
  $$ select public.create_practice_draft_version('95000000-0000-0000-0000-000000000001', 'Version three.') $$,
  'learners can save their third prompt version'
);
select extensions.lives_ok(
  $$ select public.create_practice_draft_version('95000000-0000-0000-0000-000000000001', 'Version four.') $$,
  'learners can save their fourth prompt version'
);
select extensions.lives_ok(
  $$ select public.create_practice_draft_version('95000000-0000-0000-0000-000000000001', 'Version five.') $$,
  'learners can save their fifth prompt version'
);
select extensions.throws_ok(
  $$ select public.create_practice_draft_version('95000000-0000-0000-0000-000000000001', 'Version six.') $$,
  '23514',
  'a prompt can have at most five saved versions',
  'the sixth draft version is refused'
);
select extensions.is(
  (
    select count(*)
    from public.practice_draft_versions
    where prompt_id = '95000000-0000-0000-0000-000000000001'
  ),
  5::bigint,
  'the learner has exactly five immutable draft versions'
);

select set_config(
  'request.jwt.claim.sub',
  '91000000-0000-0000-0000-000000000003',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"91000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);
select extensions.is(
  (
    select count(*)
    from public.exam_attempts
    where exam_id = '92000000-0000-0000-0000-000000000001'
  ),
  0::bigint,
  'another learner cannot read an attempt they do not own'
);
select extensions.is(
  (
    select count(*)
    from public.practice_draft_versions
    where prompt_id = '95000000-0000-0000-0000-000000000001'
  ),
  0::bigint,
  'another learner cannot read draft versions they do not own'
);

reset role;
select extensions.finish();
rollback;
