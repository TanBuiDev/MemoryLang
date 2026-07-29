begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(7);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('92000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rbac-manager@example.test', crypt('local-test-password', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('92000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rbac-target@example.test', crypt('local-test-password', gen_salt('bf')), now(), '{}'::jsonb, '{}'::jsonb, now(), now());

select extensions.has_table('security', 'audit_logs', 'security audit log is stored in the private schema');
select extensions.ok(
  not has_function_privilege('authenticated', 'public.manage_user_role(uuid,text,uuid,text,text,uuid,text,inet)', 'EXECUTE'),
  'authenticated callers cannot invoke the privileged role mutation RPC directly'
);

insert into security.user_roles (user_id, role_id, granted_by, reason)
select '92000000-0000-0000-0000-000000000001', id, '92000000-0000-0000-0000-000000000001', 'test security administrator'
from security.roles where code = 'security_admin';

select extensions.ok(
  (select public.manage_user_role(
    '92000000-0000-0000-0000-000000000001',
    'grant',
    '92000000-0000-0000-0000-000000000002',
    'exam_admin',
    'approved test grant',
    null,
    'pgtap'
  ) ->> 'changed')::boolean,
  'privileged RPC grants an allowed role'
);

select extensions.ok(
  exists (
    select 1 from security.user_roles ur join security.roles r on r.id = ur.role_id
    where ur.user_id = '92000000-0000-0000-0000-000000000002' and r.code = 'exam_admin' and ur.revoked_at is null
  ),
  'granted role is active'
);

select extensions.ok(
  exists (
    select 1 from security.audit_logs
    where actor_user_id = '92000000-0000-0000-0000-000000000001'
      and target_user_id = '92000000-0000-0000-0000-000000000002'
      and event_type = 'role.granted'
  ),
  'role grant is written to the append-only security audit log'
);

select extensions.throws_ok(
  $$ update security.audit_logs set event_type = 'tampered' $$,
  'P0001',
  'Security audit records are append-only.',
  'audit records cannot be mutated'
);

select extensions.ok(
  (select public.manage_user_role(
    '92000000-0000-0000-0000-000000000001',
    'revoke',
    '92000000-0000-0000-0000-000000000002',
    'exam_admin',
    'approved test revoke',
    null,
    'pgtap'
  ) ->> 'changed')::boolean,
  'privileged RPC revokes an active role'
);

select extensions.finish();
rollback;
