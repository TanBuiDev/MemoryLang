begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(7);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('93000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-session@example.test', crypt('local-test-password', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into security.user_roles (user_id, role_id, granted_by, reason)
select '93000000-0000-0000-0000-000000000001', id, '93000000-0000-0000-0000-000000000001', 'test exam administrator'
from security.roles where code = 'exam_admin';

select extensions.has_table('security', 'admin_sessions', 'admin sessions are kept in the private security schema');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"93000000-0000-0000-0000-000000000001","session_id":"93000000-0000-0000-0000-000000000099","aal":"aal1"}', true);
select extensions.ok(not security.is_mfa_verified(), 'aal1 is not accepted as MFA verified');
select extensions.throws_ok(
  $$ select public.start_admin_session('93000000-0000-0000-0000-000000000099'::uuid, null, 'pgtap') $$,
  '42501', 'MFA verification is required for an admin session.', 'aal1 cannot start an admin session'
);

select set_config('request.jwt.claims', '{"sub":"93000000-0000-0000-0000-000000000001","session_id":"93000000-0000-0000-0000-000000000099","aal":"aal2"}', true);
select extensions.ok(security.is_mfa_verified(), 'aal2 is accepted as MFA verified');
select extensions.ok(
  (public.start_admin_session('93000000-0000-0000-0000-000000000099'::uuid, null, 'pgtap')).id is not null,
  'aal2 administrator can start an admin session'
);
select extensions.ok(security.is_admin_session_active('93000000-0000-0000-0000-000000000099'::uuid), 'active session is bound to the current auth session');
select extensions.ok(public.revoke_own_admin_session('93000000-0000-0000-0000-000000000099'::uuid), 'administrator can revoke their current admin session');

reset role;
select extensions.finish();
rollback;
