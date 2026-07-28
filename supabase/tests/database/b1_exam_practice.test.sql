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

select extensions.has_column('public', 'exams', 'source_key', 'exams expose a stable source key');
select extensions.has_column('public', 'exams', 'cefr_level', 'exams expose a CEFR level');
select extensions.has_column(
  'public',
  'exams',
  'default_time_minutes',
  'exams expose a default practice duration'
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
  );

update public.profiles
set is_admin = true
where id = '91000000-0000-0000-0000-000000000001';

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

select extensions.lives_ok(
  $$
    select public.start_b1_exam_attempt(
      '92000000-0000-0000-0000-000000000001',
      7200
    )
  $$,
  'learners can start an accessible exam through the guarded RPC'
);
select extensions.is(
  (
    select count(*)
    from public.exam_attempts
    where exam_id = '92000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'learners can read only their own newly created attempt'
);
select extensions.is(
  (
    select target_duration_seconds
    from public.exam_attempts
    where exam_id = '92000000-0000-0000-0000-000000000001'
  ),
  7200,
  'attempt keeps the learner-selected duration'
);
select extensions.is(
  (
    select jsonb_array_length(exam_snapshot -> 'sections')
    from public.exam_attempts
    where exam_id = '92000000-0000-0000-0000-000000000001'
  ),
  1,
  'attempt snapshot contains only sections accessible to the learner'
);
select extensions.lives_ok(
  $$
    select public.save_b1_section_attempt_progress(
      (
        select id
        from public.exam_attempts
        where exam_id = '92000000-0000-0000-0000-000000000001'
      ),
      'b1-grammar-section',
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
    where exam_section_source_key = 'b1-grammar-section'
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
