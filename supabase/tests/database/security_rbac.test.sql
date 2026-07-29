begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(9);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('91000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rbac-security@example.test', crypt('local-test-password', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('91000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rbac-exam@example.test', crypt('local-test-password', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now());

select extensions.has_schema('security', 'security schema exists');
select extensions.has_table('security', 'roles', 'roles table exists');
select extensions.has_table('security', 'permissions', 'permissions table exists');
select extensions.has_table('security', 'user_roles', 'user role grants table exists');

select extensions.results_eq(
  $$ select code from security.roles order by code $$,
  $$ values ('exam_admin'::text), ('security_admin'::text), ('super_admin'::text), ('support_admin'::text), ('user'::text) $$,
  'the five initial roles are seeded'
);

insert into security.user_roles (user_id, role_id, granted_by, reason)
select '91000000-0000-0000-0000-000000000001', id, '91000000-0000-0000-0000-000000000001', 'test grant'
from security.roles where code = 'security_admin';

insert into security.user_roles (user_id, role_id, granted_by, reason)
select '91000000-0000-0000-0000-000000000002', id, '91000000-0000-0000-0000-000000000001', 'test grant'
from security.roles where code = 'exam_admin';

set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000001', true);
select extensions.ok(security.has_permission('role.assign'), 'security admin can assign roles');
select extensions.ok(not security.has_permission('exam.update'), 'security admin does not inherit exam editing');

select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000002', true);
select extensions.ok(security.has_permission('exam.update'), 'exam admin can edit exams');
select extensions.ok(not security.has_permission('role.assign'), 'exam admin cannot assign roles');

reset role;
select extensions.finish();
rollback;
