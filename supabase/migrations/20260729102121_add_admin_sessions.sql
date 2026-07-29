create table security.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  auth_session_id uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '60 minutes'),
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  ip_address inet,
  user_agent text,
  check (expires_at > created_at)
);

create unique index security_admin_sessions_active_auth_session_idx
  on security.admin_sessions (user_id, auth_session_id)
  where revoked_at is null;
create index security_admin_sessions_active_lookup_idx
  on security.admin_sessions (user_id, auth_session_id, expires_at)
  where revoked_at is null;

alter table security.admin_sessions enable row level security;

create or replace function security.is_mfa_verified()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2';
$$;

create or replace function security.is_admin_session_active(p_auth_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from security.admin_sessions admin_sessions
    where admin_sessions.user_id = (select auth.uid())
      and admin_sessions.auth_session_id = p_auth_session_id
      and admin_sessions.revoked_at is null
      and admin_sessions.expires_at > now()
  );
$$;

revoke all on function security.is_mfa_verified() from public, anon, service_role;
revoke all on function security.is_admin_session_active(uuid) from public, anon, service_role;
grant execute on function security.is_mfa_verified() to authenticated;
grant execute on function security.is_admin_session_active(uuid) to authenticated;

create or replace function public.start_admin_session(
  p_auth_session_id uuid,
  p_ip_address inet default null,
  p_user_agent text default null
)
returns security.admin_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session security.admin_sessions;
begin
  if (select auth.uid()) is null or p_auth_session_id is null
    or p_auth_session_id::text is distinct from (select auth.jwt() ->> 'session_id') then
    raise exception 'Invalid authentication session.' using errcode = '42501';
  end if;

  if not security.is_mfa_verified() then
    raise exception 'MFA verification is required for an admin session.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from security.user_roles user_roles
    join security.roles roles on roles.id = user_roles.role_id
    where user_roles.user_id = (select auth.uid())
      and roles.code <> 'user'
      and user_roles.revoked_at is null
      and (user_roles.expires_at is null or user_roles.expires_at > now())
  ) then
    raise exception 'An active administrative role is required.' using errcode = '42501';
  end if;

  update security.admin_sessions
  set revoked_at = now(), revoked_by = (select auth.uid())
  where user_id = (select auth.uid())
    and auth_session_id = p_auth_session_id
    and revoked_at is null;

  insert into security.admin_sessions (user_id, auth_session_id, ip_address, user_agent)
  values ((select auth.uid()), p_auth_session_id, p_ip_address, p_user_agent)
  returning * into v_session;

  insert into security.audit_logs (actor_user_id, target_user_id, event_type, request_id, ip_address, user_agent)
  values ((select auth.uid()), (select auth.uid()), 'admin_session.started', null, p_ip_address, p_user_agent);

  return v_session;
end;
$$;

create or replace function public.revoke_own_admin_session(p_auth_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null
    or p_auth_session_id::text is distinct from (select auth.jwt() ->> 'session_id') then
    raise exception 'Invalid authentication session.' using errcode = '42501';
  end if;

  update security.admin_sessions
  set revoked_at = now(), revoked_by = (select auth.uid())
  where user_id = (select auth.uid())
    and auth_session_id = p_auth_session_id
    and revoked_at is null;

  return found;
end;
$$;

revoke all on function public.start_admin_session(uuid, inet, text) from public, anon, service_role;
revoke all on function public.revoke_own_admin_session(uuid) from public, anon, service_role;
grant execute on function public.start_admin_session(uuid, inet, text) to authenticated;
grant execute on function public.revoke_own_admin_session(uuid) to authenticated;
