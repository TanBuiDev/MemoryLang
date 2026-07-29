create schema if not exists security;
revoke all on schema security from public;
grant usage on schema security to authenticated;

create table security.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = lower(code) and code ~ '^[a-z_]+$'),
  name text not null,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);

create table security.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z_]+\.[a-z_]+(?:\.[a-z_]+)?$'),
  resource text not null,
  action text not null,
  description text,
  created_at timestamptz not null default now()
);

create table security.role_permissions (
  role_id uuid not null references security.roles(id) on delete cascade,
  permission_id uuid not null references security.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table security.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references security.roles(id) on delete restrict,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  reason text not null check (length(trim(reason)) > 0),
  primary key (user_id, role_id, granted_at),
  check (expires_at is null or expires_at > granted_at)
);

create index security_user_roles_active_lookup_idx
  on security.user_roles (user_id, role_id)
  where revoked_at is null;
create index security_role_permissions_permission_idx
  on security.role_permissions (permission_id, role_id);

alter table security.roles enable row level security;
alter table security.permissions enable row level security;
alter table security.role_permissions enable row level security;
alter table security.user_roles enable row level security;

insert into security.roles (code, name, description) values
  ('user', 'User', 'Learner account'),
  ('support_admin', 'Support administrator', 'Account support only'),
  ('exam_admin', 'Exam administrator', 'Exam and question-bank management'),
  ('security_admin', 'Security administrator', 'Role, permission, and audit management'),
  ('super_admin', 'Super administrator', 'Emergency recovery account')
on conflict (code) do nothing;

insert into security.permissions (code, resource, action, description) values
  ('profile.read.own', 'profile', 'read.own', 'Read own profile'),
  ('profile.update.own', 'profile', 'update.own', 'Update own profile'),
  ('exam.read', 'exam', 'read', 'Read all exam drafts'),
  ('exam.create', 'exam', 'create', 'Create exams'),
  ('exam.update', 'exam', 'update', 'Update exams'),
  ('exam.delete', 'exam', 'delete', 'Delete exams'),
  ('exam.publish', 'exam', 'publish', 'Publish exams'),
  ('exam_import.run', 'exam_import', 'run', 'Run AI exam imports'),
  ('exam_question.create', 'exam_question', 'create', 'Create exam questions'),
  ('exam_question.update', 'exam_question', 'update', 'Update exam questions'),
  ('exam_question.delete', 'exam_question', 'delete', 'Delete exam questions'),
  ('user.read.basic', 'user', 'read.basic', 'Read basic user details'),
  ('user.suspend', 'user', 'suspend', 'Suspend users'),
  ('user.restore', 'user', 'restore', 'Restore users'),
  ('user.session.revoke', 'user', 'session.revoke', 'Revoke user sessions'),
  ('role.read', 'role', 'read', 'Read role assignments'),
  ('role.assign', 'role', 'assign', 'Assign roles'),
  ('role.revoke', 'role', 'revoke', 'Revoke roles'),
  ('permission.read', 'permission', 'read', 'Read permissions'),
  ('audit.read.security', 'audit', 'read.security', 'Read security audit events')
on conflict (code) do nothing;

insert into security.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from security.roles roles
join security.permissions permissions on (
  (roles.code = 'user' and permissions.code in ('profile.read.own', 'profile.update.own'))
  or (roles.code = 'support_admin' and permissions.code in ('user.read.basic', 'user.suspend', 'user.restore', 'user.session.revoke'))
  or (roles.code = 'exam_admin' and permissions.code like 'exam.%')
  or (roles.code = 'exam_admin' and permissions.code like 'exam_import.%')
  or (roles.code = 'exam_admin' and permissions.code like 'exam_question.%')
  or (roles.code = 'security_admin' and permissions.code in ('role.read', 'role.assign', 'role.revoke', 'permission.read', 'audit.read.security'))
  or roles.code = 'super_admin'
)
on conflict do nothing;

create or replace function security.has_role(p_role_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from security.user_roles user_roles
    join security.roles roles on roles.id = user_roles.role_id
    where user_roles.user_id = (select auth.uid())
      and roles.code = p_role_code
      and user_roles.revoked_at is null
      and (user_roles.expires_at is null or user_roles.expires_at > now())
  );
$$;

create or replace function security.has_permission(p_permission_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from security.user_roles user_roles
    join security.role_permissions role_permissions on role_permissions.role_id = user_roles.role_id
    join security.permissions permissions on permissions.id = role_permissions.permission_id
    where user_roles.user_id = (select auth.uid())
      and permissions.code = p_permission_code
      and user_roles.revoked_at is null
      and (user_roles.expires_at is null or user_roles.expires_at > now())
  );
$$;

revoke all on function security.has_role(text) from public, anon, service_role;
revoke all on function security.has_permission(text) from public, anon, service_role;
grant execute on function security.has_role(text) to authenticated;
grant execute on function security.has_permission(text) to authenticated;
