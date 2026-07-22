begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(35);

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

select extensions.ok(
  not exists (
    select 1
    from pg_proc functions
    join pg_namespace schemas on schemas.oid = functions.pronamespace
    where schemas.nspname = 'public'
      and has_function_privilege(
        'memorylang_stats_readonly',
        functions.oid,
        'EXECUTE'
      )
  ),
  'statistics role cannot execute any public function through effective privileges'
);
select extensions.ok(
  has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE')
    and has_function_privilege('authenticated', 'public.handle_new_user()', 'EXECUTE')
    and has_function_privilege('service_role', 'public.handle_new_user()', 'EXECUTE'),
  'existing Supabase roles retain execution of formerly PUBLIC functions'
);
select extensions.ok(
  not has_function_privilege('anon', 'public.can_user_add_term(uuid)', 'EXECUTE')
    and has_function_privilege('authenticated', 'public.can_user_add_term(uuid)', 'EXECUTE')
    and not has_function_privilege('service_role', 'public.can_user_add_term(uuid)', 'EXECUTE'),
  'function ACL hardening preserves an existing restricted RPC allowlist'
);

create function public.stats_api_future_acl_fixture()
returns integer
language sql
as $$
  select 1
$$;

select extensions.ok(
  not exists (
    select 1
    from pg_proc functions
    cross join lateral aclexplode(functions.proacl) grants
    where functions.oid = 'public.stats_api_future_acl_fixture()'::regprocedure
      and grants.grantee = 0
      and grants.privilege_type = 'EXECUTE'
  ),
  'future postgres-created public functions do not grant execute to PUBLIC'
);
select extensions.ok(
  not has_function_privilege('anon', 'public.stats_api_future_acl_fixture()', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.stats_api_future_acl_fixture()', 'EXECUTE')
    and not has_function_privilege('service_role', 'public.stats_api_future_acl_fixture()', 'EXECUTE')
    and not has_function_privilege(
      'memorylang_stats_readonly',
      'public.stats_api_future_acl_fixture()',
      'EXECUTE'
    ),
  'future public functions require explicit execution grants'
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
    from information_schema.tables tables
    cross join unnest(array[
      'INSERT',
      'UPDATE',
      'DELETE',
      'TRUNCATE',
      'REFERENCES',
      'TRIGGER'
    ]) as write_privileges(privilege_name)
    where tables.table_schema = 'public'
      and tables.table_type = 'BASE TABLE'
      and has_table_privilege(
        'memorylang_stats_readonly',
        format('%I.%I', tables.table_schema, tables.table_name),
        write_privileges.privilege_name
      )
  ),
  'statistics role has no effective write privileges on any public base table'
);
select extensions.is(
  has_schema_privilege('memorylang_stats_readonly', 'public', 'CREATE'),
  false,
  'statistics role cannot create objects in public'
);

-- These temporary grants let the local pg_prove connection assume the runtime
-- role and keep calling pgTAP. Both are rolled back with this test transaction.
-- SET OPTION is asserted below; direct-login behavior is verified separately
-- because the default local test connection is not a superuser and therefore
-- cannot SET SESSION AUTHORIZATION.
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

select extensions.results_eq(
  $$
    select id, user_id
    from public.user_terms
    order by id
  $$,
  $$
    values (
      '40000000-0000-0000-0000-000000000001'::uuid,
      '10000000-0000-0000-0000-000000000001'::uuid
    )
  $$,
  'user A sees the exact owned user term fixture'
);
select extensions.results_eq(
  $$
    select id, user_id
    from public.decks
    order by id
  $$,
  $$
    values (
      '50000000-0000-0000-0000-000000000001'::uuid,
      '10000000-0000-0000-0000-000000000001'::uuid
    )
  $$,
  'user A sees the exact owned deck fixture'
);
select extensions.results_eq(
  $$
    select deck_id, global_term_id
    from public.deck_terms
    order by deck_id, global_term_id
  $$,
  $$
    values (
      '50000000-0000-0000-0000-000000000001'::uuid,
      '30000000-0000-0000-0000-000000000001'::uuid
    )
  $$,
  'user A sees the exact term fixture in the owned deck'
);
select extensions.results_eq(
  $$
    select id, user_id
    from public.study_sessions
    order by id
  $$,
  $$
    values (
      '60000000-0000-0000-0000-000000000001'::uuid,
      '10000000-0000-0000-0000-000000000001'::uuid
    )
  $$,
  'user A sees the exact owned study session fixture'
);
select extensions.results_eq(
  $$
    select id, user_id
    from public.quiz_results
    order by id
  $$,
  $$
    values (
      '70000000-0000-0000-0000-000000000001'::uuid,
      '10000000-0000-0000-0000-000000000001'::uuid
    )
  $$,
  'user A sees the exact owned quiz result fixture'
);
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
  pg_has_role('memorylang_stats_readonly', 'postgres', 'SET'),
  false,
  'statistics role has no SET OPTION for postgres'
);

reset role;
select extensions.finish();
rollback;
