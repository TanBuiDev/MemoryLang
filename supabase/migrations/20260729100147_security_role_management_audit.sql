create table security.audit_logs (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type ~ '^[a-z_]+([.][a-z_]+)+$'),
  role_code text,
  reason text,
  request_id uuid,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb
);

create index security_audit_logs_occurred_at_idx on security.audit_logs (occurred_at desc);
create index security_audit_logs_target_user_idx on security.audit_logs (target_user_id, occurred_at desc);

alter table security.audit_logs enable row level security;

create or replace function security.reject_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Security audit records are append-only.' using errcode = 'P0001';
end;
$$;

create trigger security_audit_logs_reject_update
before update on security.audit_logs
for each row execute function security.reject_audit_mutation();

create trigger security_audit_logs_reject_delete
before delete on security.audit_logs
for each row execute function security.reject_audit_mutation();

create or replace function public.has_permission(p_permission_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select security.has_permission(p_permission_code);
$$;

create or replace function public.has_role(p_role_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select security.has_role(p_role_code);
$$;

revoke all on function public.has_permission(text) from public, anon, service_role;
revoke all on function public.has_role(text) from public, anon, service_role;
grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.has_role(text) to authenticated;

create or replace function public.manage_user_role(
  p_actor_user_id uuid,
  p_action text,
  p_target_user_id uuid,
  p_role_code text,
  p_reason text,
  p_request_id uuid default null,
  p_user_agent text default null,
  p_ip_address inet default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role_id uuid;
  v_changed boolean := false;
  v_event_type text;
  v_has_admin_role boolean;
begin
  if p_action not in ('grant', 'revoke') then
    raise exception 'Unsupported role action.' using errcode = '22023';
  end if;

  if p_actor_user_id is null or p_target_user_id is null or p_actor_user_id = p_target_user_id then
    raise exception 'Role changes must target another user.' using errcode = '22023';
  end if;

  if length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'A reason is required for role changes.' using errcode = '22023';
  end if;

  select id into v_role_id from security.roles where code = p_role_code;
  if v_role_id is null or p_role_code = 'user' then
    raise exception 'Role is unavailable for assignment.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from security.user_roles ur
    join security.role_permissions rp on rp.role_id = ur.role_id
    join security.permissions p on p.id = rp.permission_id
    where ur.user_id = p_actor_user_id
      and p.code = case when p_action = 'grant' then 'role.assign' else 'role.revoke' end
      and ur.revoked_at is null
      and (ur.expires_at is null or ur.expires_at > now())
  ) then
    raise exception 'Actor lacks permission for this role operation.' using errcode = '42501';
  end if;

  if p_role_code = 'super_admin' and not exists (
    select 1
    from security.user_roles ur
    join security.roles r on r.id = ur.role_id
    where ur.user_id = p_actor_user_id
      and r.code = 'super_admin'
      and ur.revoked_at is null
      and (ur.expires_at is null or ur.expires_at > now())
  ) then
    raise exception 'Only a super administrator can manage super administrator roles.' using errcode = '42501';
  end if;

  if p_action = 'grant' then
    if not exists (
      select 1 from security.user_roles
      where user_id = p_target_user_id and role_id = v_role_id and revoked_at is null
        and (expires_at is null or expires_at > now())
    ) then
      insert into security.user_roles (user_id, role_id, granted_by, reason)
      values (p_target_user_id, v_role_id, p_actor_user_id, trim(p_reason));
      v_changed := true;
    end if;
    v_event_type := case when v_changed then 'role.granted' else 'role.grant_unchanged' end;
  else
    update security.user_roles
    set revoked_at = now()
    where user_id = p_target_user_id
      and role_id = v_role_id
      and revoked_at is null
      and (expires_at is null or expires_at > now());
    v_changed := found;
    v_event_type := case when v_changed then 'role.revoked' else 'role.revoke_unchanged' end;
  end if;

  select exists (
    select 1
    from security.user_roles ur
    join security.roles r on r.id = ur.role_id
    where ur.user_id = p_target_user_id
      and r.code <> 'user'
      and ur.revoked_at is null
      and (ur.expires_at is null or ur.expires_at > now())
  ) into v_has_admin_role;

  perform set_config('app.rbac_role_mutation', 'true', true);
  update public.profiles
  set is_admin = v_has_admin_role,
      allow_password_login = case when v_has_admin_role then allow_password_login else false end
  where id = p_target_user_id;

  insert into security.audit_logs (
    actor_user_id, target_user_id, event_type, role_code, reason, request_id, ip_address, user_agent, metadata
  ) values (
    p_actor_user_id, p_target_user_id, v_event_type, p_role_code, trim(p_reason), p_request_id, p_ip_address, p_user_agent,
    jsonb_build_object('changed', v_changed)
  );

  return jsonb_build_object('changed', v_changed, 'action', p_action, 'roleCode', p_role_code, 'isAdmin', v_has_admin_role);
end;
$$;

revoke all on function public.manage_user_role(uuid, text, uuid, text, text, uuid, text, inet) from public, anon, authenticated;
grant execute on function public.manage_user_role(uuid, text, uuid, text, text, uuid, text, inet) to service_role;

create or replace function public.prevent_unauthorized_profile_security_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    new.is_admin is distinct from old.is_admin
    or new.allow_password_login is distinct from old.allow_password_login
  ) then
    if current_setting('app.rbac_role_mutation', true) is distinct from 'true'
      and not public.is_admin() then
      raise exception 'Only an administrator can change administrator login settings.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_unauthorized_profile_security_changes() from public;
