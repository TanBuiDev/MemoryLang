create table security.admin_role_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references security.roles(id) on delete restrict,
  granted_by uuid references auth.users(id) on delete set null,
  reason text not null check (length(trim(reason)) > 0),
  activation_state text not null default 'pending' check (activation_state in ('pending', 'active', 'revoked')),
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  revoked_at timestamptz,
  check ((activation_state = 'active') = (activated_at is not null)),
  check ((activation_state = 'revoked') = (revoked_at is not null))
);

create unique index security_admin_role_grants_open_idx
  on security.admin_role_grants (user_id, role_id)
  where activation_state in ('pending', 'active');
create index security_admin_role_grants_user_idx
  on security.admin_role_grants (user_id, activation_state, created_at desc);

create table security.admin_security_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  subject_user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('admin_session.new_device', 'admin_mfa.reset', 'admin_role.pending', 'admin_role.activated')),
  auth_session_id uuid,
  ip_hash text,
  device_label text,
  metadata jsonb not null default '{}'::jsonb
);

create index security_admin_security_events_subject_idx
  on security.admin_security_events (subject_user_id, occurred_at desc);

create table security.security_email_outbox (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references security.admin_security_events(id) on delete cascade,
  recipient_user_id uuid references auth.users(id) on delete set null,
  recipient_email text not null,
  template text not null check (template = 'security_alert'),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text
);

create unique index security_security_email_outbox_recipient_idx
  on security.security_email_outbox (event_id, recipient_email);

alter table security.admin_role_grants enable row level security;
alter table security.admin_security_events enable row level security;
alter table security.security_email_outbox enable row level security;
revoke all on table security.admin_role_grants, security.admin_security_events, security.security_email_outbox from public, anon, authenticated;

create or replace function security.has_google_identity(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.identities identities
    where identities.user_id = p_user_id and identities.provider = 'google'
  );
$$;

create or replace function public.get_admin_security_status()
returns table (is_admin boolean, has_google_identity boolean, mfa_verified boolean, pending_role_count integer)
language sql stable security definer set search_path = '' as $$
  select
    exists (select 1 from security.user_roles ur join security.roles r on r.id = ur.role_id where ur.user_id = (select auth.uid()) and r.code <> 'user' and ur.revoked_at is null and (ur.expires_at is null or ur.expires_at > now())),
    security.has_google_identity((select auth.uid())),
    security.is_mfa_verified(),
    (select count(*)::integer from security.admin_role_grants grants where grants.user_id = (select auth.uid()) and grants.activation_state = 'pending');
$$;

create or replace function public.refresh_admin_role_grant_activation()
returns integer language plpgsql security definer set search_path = '' as $$
declare v_activated integer := 0;
begin
  if (select auth.uid()) is null or not security.has_google_identity((select auth.uid())) or not security.is_mfa_verified() then
    raise exception 'Google sign-in and MFA verification are required.' using errcode = '42501';
  end if;

  with activated as (
    update security.admin_role_grants grants
    set activation_state = 'active', activated_at = now()
    where grants.user_id = (select auth.uid()) and grants.activation_state = 'pending'
    returning grants.role_id, grants.granted_by, grants.reason
  ), inserted as (
    insert into security.user_roles (user_id, role_id, granted_by, reason)
    select (select auth.uid()), role_id, granted_by, reason from activated
    on conflict do nothing
    returning role_id
  ) select count(*) into v_activated from activated;

  if v_activated > 0 then
    perform set_config('app.rbac_role_mutation', 'true', true);
    update public.profiles set is_admin = true, allow_password_login = false where id = (select auth.uid());
    perform security.bump_authorization_versions(array[(select auth.uid())]);
    insert into security.audit_logs(actor_user_id, target_user_id, event_type, metadata)
    values ((select auth.uid()), (select auth.uid()), 'admin_role.activated', jsonb_build_object('activatedCount', v_activated));
  end if;
  return v_activated;
end;
$$;

create or replace function security.enqueue_security_email(
  p_event_id uuid, p_recipient_user_id uuid, p_recipient_email text, p_payload jsonb
) returns void language sql security definer set search_path = '' as $$
  insert into security.security_email_outbox(event_id, recipient_user_id, recipient_email, template, payload)
  values (p_event_id, p_recipient_user_id, lower(btrim(p_recipient_email)), 'security_alert', coalesce(p_payload, '{}'::jsonb))
  on conflict (event_id, recipient_email) do nothing;
$$;

create or replace function public.manage_user_role(
  p_actor_user_id uuid, p_action text, p_target_user_id uuid, p_role_code text, p_reason text,
  p_request_id uuid default null, p_user_agent text default null, p_ip_address inet default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_role_id uuid; v_changed boolean := false; v_is_admin boolean;
begin
  if p_action not in ('grant', 'revoke') or p_actor_user_id is null or p_target_user_id is null then raise exception 'Invalid role change.' using errcode = '22023'; end if;
  if not exists (select 1 from public.profiles where id = p_target_user_id) then raise exception 'Target account does not exist.' using errcode = '22023'; end if;
  if p_actor_user_id = p_target_user_id and p_role_code = 'super_admin' and p_action = 'revoke' then raise exception 'A super administrator cannot remove their own recovery role.' using errcode = '42501'; end if;
  select id into v_role_id from security.roles where code = p_role_code;
  if v_role_id is null or p_role_code = 'user' then raise exception 'Role is unavailable for assignment.' using errcode = '22023'; end if;
  if not exists (select 1 from security.user_roles ur join security.role_permissions rp on rp.role_id = ur.role_id join security.permissions p on p.id = rp.permission_id where ur.user_id = p_actor_user_id and p.code = case when p_action = 'grant' then 'role.assign' else 'role.revoke' end and ur.revoked_at is null and (ur.expires_at is null or ur.expires_at > now())) then raise exception 'Actor lacks permission.' using errcode = '42501'; end if;
  if p_role_code = 'super_admin' and not exists (select 1 from security.user_roles ur join security.roles r on r.id = ur.role_id where ur.user_id = p_actor_user_id and r.code = 'super_admin' and ur.revoked_at is null and (ur.expires_at is null or ur.expires_at > now())) then raise exception 'Forbidden.' using errcode = '42501'; end if;

  if p_action = 'grant' then
    insert into security.admin_role_grants(user_id, role_id, granted_by, reason)
    select p_target_user_id, v_role_id, p_actor_user_id, coalesce(nullif(trim(p_reason), ''), 'Administrative role assignment')
    where not exists (select 1 from security.admin_role_grants where user_id = p_target_user_id and role_id = v_role_id and activation_state in ('pending', 'active'));
    v_changed := found;
    if v_changed then
      insert into security.audit_logs(actor_user_id, target_user_id, event_type, role_code, reason, request_id, ip_address, user_agent, metadata)
      values (p_actor_user_id, p_target_user_id, 'admin_role.pending', p_role_code, coalesce(nullif(trim(p_reason), ''), 'Administrative role assignment'), p_request_id, p_ip_address, p_user_agent, jsonb_build_object('activationState', 'pending'));
    end if;
  else
    if p_role_code = 'super_admin' and not exists (select 1 from security.user_roles ur where ur.role_id = v_role_id and ur.user_id <> p_target_user_id and ur.revoked_at is null and (ur.expires_at is null or ur.expires_at > now())) then raise exception 'At least one super administrator must remain active.' using errcode = '42501'; end if;
    update security.admin_role_grants set activation_state = 'revoked', revoked_at = now() where user_id = p_target_user_id and role_id = v_role_id and activation_state in ('pending', 'active');
    update security.user_roles set revoked_at = now() where user_id = p_target_user_id and role_id = v_role_id and revoked_at is null and (expires_at is null or expires_at > now());
    v_changed := found;
  end if;

  select exists (select 1 from security.user_roles ur join security.roles r on r.id = ur.role_id where ur.user_id = p_target_user_id and r.code <> 'user' and ur.revoked_at is null and (ur.expires_at is null or ur.expires_at > now())) into v_is_admin;
  perform set_config('app.rbac_role_mutation', 'true', true);
  update public.profiles set is_admin = v_is_admin, allow_password_login = false where id = p_target_user_id;
  if v_changed then perform security.bump_authorization_versions(array[p_target_user_id]); end if;
  return jsonb_build_object('changed', v_changed, 'action', p_action, 'roleCode', p_role_code, 'isAdmin', v_is_admin, 'activationState', case when p_action = 'grant' then 'pending' else 'revoked' end);
end;
$$;

create or replace function public.start_admin_session(
  p_auth_session_id uuid, p_ip_address inet default null, p_user_agent text default null
) returns security.admin_sessions language plpgsql security definer set search_path = '' as $$
declare v_session security.admin_sessions;
begin
  if (select auth.uid()) is null or p_auth_session_id is null or p_auth_session_id::text is distinct from (select auth.jwt() ->> 'session_id') then raise exception 'Invalid authentication session.' using errcode = '42501'; end if;
  if not security.has_google_identity((select auth.uid())) or not security.is_mfa_verified() then raise exception 'Google sign-in and MFA verification are required for an admin session.' using errcode = '42501'; end if;
  perform public.refresh_admin_role_grant_activation();
  if not exists (select 1 from security.user_roles ur join security.roles r on r.id = ur.role_id where ur.user_id = (select auth.uid()) and r.code <> 'user' and ur.revoked_at is null and (ur.expires_at is null or ur.expires_at > now())) then raise exception 'An active administrative role is required.' using errcode = '42501'; end if;
  update security.admin_sessions set revoked_at = now(), revoked_by = (select auth.uid()) where user_id = (select auth.uid()) and auth_session_id = p_auth_session_id and revoked_at is null;
  insert into security.admin_sessions(user_id, auth_session_id, ip_address, user_agent) values ((select auth.uid()), p_auth_session_id, p_ip_address, p_user_agent) returning * into v_session;
  insert into security.audit_logs(actor_user_id, target_user_id, event_type, ip_address, user_agent) values ((select auth.uid()), (select auth.uid()), 'admin_session.started', p_ip_address, p_user_agent);
  return v_session;
end;
$$;

revoke all on function security.has_google_identity(uuid) from public, anon, authenticated, service_role;
revoke all on function public.get_admin_security_status() from public, anon, service_role;
revoke all on function public.refresh_admin_role_grant_activation() from public, anon, service_role;
revoke all on function security.enqueue_security_email(uuid, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.get_admin_security_status() to authenticated;
grant execute on function public.refresh_admin_role_grant_activation() to authenticated;
grant execute on function security.enqueue_security_email(uuid, uuid, text, jsonb) to service_role;
