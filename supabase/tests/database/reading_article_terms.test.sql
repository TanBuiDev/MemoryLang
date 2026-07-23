begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(5);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '81000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'reading-admin@example.test',
    crypt('local-test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '81000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'reading-user@example.test',
    crypt('local-test-password', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  );

update public.profiles
set is_admin = true
where id = '81000000-0000-0000-0000-000000000001';

insert into public.global_terms (
  id, source_text, normalized_text, source_language, native_language,
  item_type, ipa, translation
)
values
  (
    '82000000-0000-0000-0000-000000000001',
    'Grace', 'grace', 'en', 'vi', 'word', '/ɡreɪs/', 'duyên dáng'
  ),
  (
    '82000000-0000-0000-0000-000000000002',
    'work', 'work', 'en', 'vi', 'word', '/wɜːk/', 'làm việc'
  ),
  (
    '82000000-0000-0000-0000-000000000003',
    'Graceful', 'graceful', 'en', 'vi', 'word', null, 'duyên dáng'
  );

insert into public.reading_articles (
  id, title, content_html, plain_text, is_published, access_tier, created_by
)
values (
  '83000000-0000-0000-0000-000000000001',
  'Reading vocabulary fixture',
  '<p>Grace works with grace at work.</p>',
  'Grace works with grace at work.',
  true,
  'free',
  '81000000-0000-0000-0000-000000000001'
);

select extensions.has_table(
  'public',
  'reading_article_terms',
  'reading article term mapping table exists'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '81000000-0000-0000-0000-000000000001',
  true
);

select extensions.is(
  public.scan_reading_article_terms('83000000-0000-0000-0000-000000000001'),
  2,
  'admin scan stores the two exact whole-word matches'
);

select extensions.results_eq(
  $$
    select normalized_text
    from public.get_reading_article_terms('83000000-0000-0000-0000-000000000001')
    order by normalized_text
  $$,
  $$ values ('grace'::text), ('work'::text) $$,
  'reader RPC returns persisted global term details'
);

select set_config(
  'request.jwt.claim.sub',
  '81000000-0000-0000-0000-000000000002',
  true
);

select extensions.throws_ok(
  $$ select public.scan_reading_article_terms('83000000-0000-0000-0000-000000000001') $$,
  '42501',
  'Admin access required',
  'non-admin cannot scan an article'
);

select extensions.is(
  (
    select count(*)
    from public.get_reading_article_terms('83000000-0000-0000-0000-000000000001')
  ),
  2::bigint,
  'authenticated reader can load terms for an accessible article'
);

reset role;
select extensions.finish();
rollback;
