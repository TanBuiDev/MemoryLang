begin;

create extension if not exists pgtap with schema extensions;
select extensions.no_plan();

select extensions.has_table('public', 'exam_sections', 'exam sections table exists');
select extensions.has_table('public', 'practice_activities', 'practice activities table exists');
select extensions.has_table('public', 'practice_questions', 'practice questions table exists');
select extensions.has_table('public', 'practice_prompts', 'practice prompts table exists');

select extensions.has_column('public', 'exams', 'source_key', 'exams expose a stable source key');
select extensions.has_column('public', 'exams', 'cefr_level', 'exams expose a CEFR level');
select extensions.has_column(
  'public',
  'exams',
  'default_time_minutes',
  'exams expose a default practice duration'
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
  );

update public.profiles
set is_admin = true
where id = '91000000-0000-0000-0000-000000000001';

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
values (
  '92000000-0000-0000-0000-000000000001',
  'B1 practice fixture',
  'GENERAL',
  true,
  'free',
  'b1-practice-fixture',
  'B1',
  120,
  '91000000-0000-0000-0000-000000000001'
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
values (
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
values (
  '95000000-0000-0000-0000-000000000001',
  'b1-writing-published',
  'writing',
  'Published writing prompt',
  'Write an email applying for a part-time job.',
  10,
  true,
  'free',
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
values (
  '96000000-0000-0000-0000-000000000001',
  '92000000-0000-0000-0000-000000000001',
  'b1-grammar-section',
  'grammar',
  'Grammar',
  'activity',
  '93000000-0000-0000-0000-000000000001',
  1,
  true
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
select extensions.lives_ok(
  $$
    update public.practice_activities
    set title = 'Updated by admin'
    where source_key = 'admin-crud-fixture'
  $$,
  'profile admins can update practice content'
);
select extensions.lives_ok(
  $$
    delete from public.practice_activities
    where source_key = 'admin-crud-fixture'
  $$,
  'profile admins can delete practice content'
);
select extensions.is(
  (select count(*) from public.practice_activities),
  2::bigint,
  'profile admins can read both published and draft practice content'
);

reset role;
select extensions.finish();
rollback;
