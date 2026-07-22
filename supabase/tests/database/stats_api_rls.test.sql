begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(30);

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
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'stats-a@example.test',
    crypt('local-test-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Stats user A"}'::jsonb,
    now(),
    now()
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'stats-b@example.test',
    crypt('local-test-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Stats user B"}'::jsonb,
    now(),
    now()
  );

insert into public.global_terms (
  id,
  source_text,
  normalized_text,
  source_language,
  native_language,
  deleted_at
)
values
  (
    '30000000-0000-0000-0000-000000000001',
    'active fixture',
    'active fixture',
    'en',
    'vi',
    null
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    'deleted fixture',
    'deleted fixture',
    'en',
    'vi',
    now()
  );

insert into public.user_terms (id, user_id, global_term_id, status)
values
  (
    '40000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'learning'
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001',
    'learning'
  );

insert into public.decks (
  id,
  user_id,
  name,
  source_language,
  native_language,
  visibility
)
values
  (
    '50000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'User A private deck',
    'en',
    'vi',
    'private'
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    'User B public deck',
    'en',
    'vi',
    'public'
  );

insert into public.deck_terms (deck_id, global_term_id)
values
  (
    '50000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001'
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001'
  );

insert into public.study_sessions (
  id,
  user_id,
  deck_id,
  mode,
  total_cards,
  viewed_cards,
  remembered_count,
  difficult_count,
  ended_at
)
values
  (
    '60000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    'flashcard',
    1,
    1,
    1,
    0,
    now()
  ),
  (
    '60000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000002',
    'flashcard',
    1,
    1,
    0,
    1,
    now()
  );

insert into public.quiz_results (
  id,
  user_id,
  deck_id,
  quiz_type,
  total_questions,
  correct_answers,
  wrong_answers
)
values
  (
    '70000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    'translation',
    1,
    1,
    0
  ),
  (
    '70000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000002',
    'translation',
    1,
    0,
    1
  );

select extensions.ok(
  exists (
    select 1
    from pg_roles
    where rolname = 'memorylang_stats_readonly'
  ),
  'statistics role exists'
);

select extensions.is(
  (select rolcanlogin from pg_roles where rolname = 'memorylang_stats_readonly'),
  true,
  'statistics role can login'
);
select extensions.is(
  (select rolsuper from pg_roles where rolname = 'memorylang_stats_readonly'),
  false,
  'statistics role is not superuser'
);
select extensions.is(
  (select rolcreaterole from pg_roles where rolname = 'memorylang_stats_readonly'),
  false,
  'statistics role cannot create roles'
);
select extensions.is(
  (select rolcreatedb from pg_roles where rolname = 'memorylang_stats_readonly'),
  false,
  'statistics role cannot create databases'
);
select extensions.is(
  (select rolinherit from pg_roles where rolname = 'memorylang_stats_readonly'),
  false,
  'statistics role does not inherit privileges'
);
select extensions.is(
  (select rolbypassrls from pg_roles where rolname = 'memorylang_stats_readonly'),
  false,
  'statistics role cannot bypass RLS'
);
select extensions.ok(
  coalesce(
    (
      select rolconfig @> array['default_transaction_read_only=on']
      from pg_roles
      where rolname = 'memorylang_stats_readonly'
    ),
    false
  ),
  'statistics role defaults to read-only transactions'
);
select extensions.ok(
  not exists (
    select 1
    from pg_auth_members memberships
    join pg_roles member_role on member_role.oid = memberships.member
    join pg_roles granted_role on granted_role.oid = memberships.roleid
    where member_role.rolname = 'memorylang_stats_readonly'
      and granted_role.rolname in ('authenticated', 'service_role', 'postgres')
  ),
  'statistics role has no privileged role memberships'
);

select extensions.is(
  (
    select array_agg(t.table_name::text order by t.table_name)
    from information_schema.tables t
    where t.table_schema = 'public'
      and t.table_type = 'BASE TABLE'
      and has_table_privilege(
        'memorylang_stats_readonly',
        format('%I.%I', t.table_schema, t.table_name),
        'SELECT'
      )
  ),
  array[
    'deck_terms',
    'decks',
    'global_terms',
    'quiz_results',
    'study_sessions',
    'user_terms'
  ]::text[],
  'statistics role can select exactly the six allowlisted tables'
);
select extensions.ok(
  not exists (
    select 1
    from unnest(array[
      'deck_terms',
      'decks',
      'global_terms',
      'quiz_results',
      'study_sessions',
      'user_terms'
    ]) as allowed(table_name)
    where has_table_privilege(
      'memorylang_stats_readonly',
      format('public.%I', allowed.table_name),
      'INSERT,UPDATE,DELETE'
    )
  ),
  'statistics role has no insert, update, or delete privileges'
);
select extensions.is(
  has_schema_privilege('memorylang_stats_readonly', 'public', 'CREATE'),
  false,
  'statistics role cannot create objects in public'
);

-- These temporary grants let the local pg_prove connection assume the runtime
-- role and keep calling pgTAP. Both are rolled back with this test transaction.
grant memorylang_stats_readonly to postgres;
grant usage on schema extensions to memorylang_stats_readonly;
set local role memorylang_stats_readonly;
select set_config('request.jwt.claim.sub', '', true);

select extensions.is((select count(*) from public.user_terms), 0::bigint, 'no JWT hides user terms');
select extensions.is((select count(*) from public.decks), 0::bigint, 'no JWT hides decks');
select extensions.is((select count(*) from public.deck_terms), 0::bigint, 'no JWT hides deck terms');
select extensions.is((select count(*) from public.study_sessions), 0::bigint, 'no JWT hides study sessions');
select extensions.is((select count(*) from public.quiz_results), 0::bigint, 'no JWT hides quiz results');

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000001',
  true
);

select extensions.is((select count(*) from public.user_terms), 1::bigint, 'user A sees only own user terms');
select extensions.is((select count(*) from public.decks), 1::bigint, 'user A sees only own decks');
select extensions.is((select count(*) from public.deck_terms), 1::bigint, 'user A sees only terms in own decks');
select extensions.is((select count(*) from public.study_sessions), 1::bigint, 'user A sees only own study sessions');
select extensions.is((select count(*) from public.quiz_results), 1::bigint, 'user A sees only own quiz results');
select extensions.is(
  (
    select count(*)
    from public.decks
    where id = '50000000-0000-0000-0000-000000000002'
  ),
  0::bigint,
  'user B public deck stays hidden from statistics role'
);
select extensions.is(
  (
    select count(*)
    from public.deck_terms
    where deck_id = '50000000-0000-0000-0000-000000000002'
  ),
  0::bigint,
  'user B public deck term stays hidden from statistics role'
);
select extensions.is(
  (
    select count(*)
    from public.global_terms
    where id = '30000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'statistics role can read the active global term fixture'
);
select extensions.is(
  (
    select count(*)
    from public.global_terms
    where id = '30000000-0000-0000-0000-000000000002'
  ),
  0::bigint,
  'statistics role cannot read soft-deleted global terms'
);
select extensions.throws_ok(
  $$
    insert into public.user_terms (user_id, global_term_id)
    values (
      '10000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000002'
    )
  $$,
  '42501',
  'permission denied for table user_terms',
  'statistics role cannot insert user terms'
);
select extensions.throws_ok(
  'select count(*) from public.profiles',
  '42501',
  'permission denied for table profiles',
  'statistics role cannot read tables outside the allowlist'
);
select extensions.throws_ok(
  'create table public.stats_api_forbidden (id integer)',
  '42501',
  'permission denied for schema public',
  'statistics role cannot create tables'
);
select extensions.is(
  pg_has_role('memorylang_stats_readonly', 'postgres', 'MEMBER'),
  false,
  'statistics role is not authorized to assume postgres'
);

reset role;
select extensions.finish();
rollback;
