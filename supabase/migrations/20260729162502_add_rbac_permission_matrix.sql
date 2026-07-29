create table if not exists security.authorization_versions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  version bigint not null default 1 check (version > 0),
  updated_at timestamptz not null default now()
);

alter table security.authorization_versions enable row level security;
revoke all on table security.authorization_versions from public, anon, authenticated;

create or replace function security.bump_authorization_versions(p_user_ids uuid[])
returns void
language sql
security definer
set search_path = ''
as $$
  insert into security.authorization_versions (user_id, version, updated_at)
  select distinct user_id, 2, now()
  from unnest(coalesce(p_user_ids, '{}'::uuid[])) as ids(user_id)
  where user_id is not null
  on conflict (user_id) do update
  set version = security.authorization_versions.version + 1,
      updated_at = excluded.updated_at;
$$;

revoke all on function security.bump_authorization_versions(uuid[]) from public, anon, authenticated, service_role;

create or replace function public.get_my_authorization_version()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version bigint;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  insert into security.authorization_versions (user_id)
  values ((select auth.uid()))
  on conflict (user_id) do nothing;

  select version into v_version
  from security.authorization_versions
  where user_id = (select auth.uid());

  return v_version;
end;
$$;

revoke all on function public.get_my_authorization_version() from public, anon, service_role;
grant execute on function public.get_my_authorization_version() to authenticated;

create or replace function public.get_role_management_overview(
  p_query text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 100), 100));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
  v_total integer;
begin
  if not security.has_permission('role.read') then
    raise exception 'Forbidden.' using errcode = '42501';
  end if;

  with filtered_profiles as (
    select p.id, p.email, p.display_name
    from public.profiles p
    where nullif(trim(p_query), '') is null
      or lower(coalesce(p.email, '') || ' ' || coalesce(p.display_name, '')) like '%' || lower(trim(p_query)) || '%'
  )
  select count(*) into v_total from filtered_profiles;

  return jsonb_build_object(
    'total', v_total,
    'roles', coalesce((
      select jsonb_agg(jsonb_build_object('code', r.code, 'name', r.name, 'description', r.description) order by r.code)
      from security.roles r
      where r.code <> 'user'
    ), '[]'::jsonb),
    'permissions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', p.code,
        'description', p.description,
        'roleCodes', coalesce((
          select jsonb_agg(r.code order by r.code)
          from security.role_permissions rp
          join security.roles r on r.id = rp.role_id
          where rp.permission_id = p.id
        ), '[]'::jsonb)
      ) order by p.code)
      from security.permissions p
    ), '[]'::jsonb),
    'users', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', fp.id,
        'email', fp.email,
        'displayName', fp.display_name,
        'roleCodes', coalesce((
          select jsonb_agg(r.code order by r.code)
          from security.user_roles ur
          join security.roles r on r.id = ur.role_id
          where ur.user_id = fp.id
            and r.code <> 'user'
            and ur.revoked_at is null
            and (ur.expires_at is null or ur.expires_at > now())
        ), '[]'::jsonb)
      ) order by coalesce(fp.display_name, fp.email, fp.id::text))
      from (
        select * from public.profiles p
        where nullif(trim(p_query), '') is null
          or lower(coalesce(p.email, '') || ' ' || coalesce(p.display_name, '')) like '%' || lower(trim(p_query)) || '%'
        order by coalesce(p.display_name, p.email, p.id::text)
        limit v_limit offset v_offset
      ) fp
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_role_management_overview(text, integer, integer) from public, anon, service_role;
grant execute on function public.get_role_management_overview(text, integer, integer) to authenticated;

create or replace function public.manage_role_permission(
  p_actor_user_id uuid,
  p_action text,
  p_role_code text,
  p_permission_code text,
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
  v_permission_id uuid;
  v_changed boolean := false;
  v_affected_users uuid[];
begin
  if p_action not in ('grant', 'revoke') or length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'Invalid permission change.' using errcode = '22023';
  end if;
  if p_role_code in ('user', 'super_admin') then
    raise exception 'This role matrix is immutable.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from security.user_roles ur
    join security.roles r on r.id = ur.role_id
    where ur.user_id = p_actor_user_id and r.code = 'super_admin'
      and ur.revoked_at is null and (ur.expires_at is null or ur.expires_at > now())
  ) then
    raise exception 'Forbidden.' using errcode = '42501';
  end if;

  select id into v_role_id from security.roles where code = p_role_code;
  select id into v_permission_id from security.permissions where code = p_permission_code;
  if v_role_id is null or v_permission_id is null then
    raise exception 'Unknown role or permission.' using errcode = '22023';
  end if;

  if p_action = 'grant' then
    insert into security.role_permissions (role_id, permission_id)
    values (v_role_id, v_permission_id)
    on conflict do nothing;
    v_changed := found;
  else
    delete from security.role_permissions where role_id = v_role_id and permission_id = v_permission_id;
    v_changed := found;
  end if;

  if v_changed then
    select coalesce(array_agg(distinct ur.user_id), '{}'::uuid[]) into v_affected_users
    from security.user_roles ur
    where ur.role_id = v_role_id and ur.revoked_at is null
      and (ur.expires_at is null or ur.expires_at > now());
    perform security.bump_authorization_versions(v_affected_users);
  end if;

  insert into security.audit_logs (actor_user_id, event_type, role_code, reason, request_id, ip_address, user_agent, metadata)
  values (p_actor_user_id, 'role.permission_changed', p_role_code, trim(p_reason), p_request_id, p_ip_address, p_user_agent,
    jsonb_build_object('permissionCode', p_permission_code, 'action', p_action, 'changed', v_changed));

  return jsonb_build_object('changed', v_changed, 'action', p_action, 'roleCode', p_role_code, 'permissionCode', p_permission_code);
end;
$$;

revoke all on function public.manage_role_permission(uuid, text, text, text, text, uuid, text, inet) from public, anon, authenticated;
grant execute on function public.manage_role_permission(uuid, text, text, text, text, uuid, text, inet) to service_role;

create or replace function public.manage_user_role(
  p_actor_user_id uuid, p_action text, p_target_user_id uuid, p_role_code text, p_reason text,
  p_request_id uuid default null, p_user_agent text default null, p_ip_address inet default null
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_role_id uuid; v_changed boolean := false; v_event_type text; v_has_admin_role boolean;
begin
  if p_action not in ('grant', 'revoke') then raise exception 'Unsupported role action.' using errcode = '22023'; end if;
  if p_actor_user_id is null or p_target_user_id is null or p_actor_user_id = p_target_user_id then raise exception 'Role changes must target another user.' using errcode = '22023'; end if;
  if length(trim(coalesce(p_reason, ''))) = 0 then raise exception 'A reason is required for role changes.' using errcode = '22023'; end if;
  select id into v_role_id from security.roles where code = p_role_code;
  if v_role_id is null or p_role_code = 'user' then raise exception 'Role is unavailable for assignment.' using errcode = '22023'; end if;
  if not exists (select 1 from security.user_roles ur join security.role_permissions rp on rp.role_id = ur.role_id join security.permissions p on p.id = rp.permission_id where ur.user_id = p_actor_user_id and p.code = case when p_action = 'grant' then 'role.assign' else 'role.revoke' end and ur.revoked_at is null and (ur.expires_at is null or ur.expires_at > now())) then raise exception 'Actor lacks permission for this role operation.' using errcode = '42501'; end if;
  if p_role_code = 'super_admin' and not exists (select 1 from security.user_roles ur join security.roles r on r.id = ur.role_id where ur.user_id = p_actor_user_id and r.code = 'super_admin' and ur.revoked_at is null and (ur.expires_at is null or ur.expires_at > now())) then raise exception 'Only a super administrator can manage super administrator roles.' using errcode = '42501'; end if;
  if p_action = 'grant' then
    if not exists (select 1 from security.user_roles where user_id = p_target_user_id and role_id = v_role_id and revoked_at is null and (expires_at is null or expires_at > now())) then insert into security.user_roles (user_id, role_id, granted_by, reason) values (p_target_user_id, v_role_id, p_actor_user_id, trim(p_reason)); v_changed := true; end if;
    v_event_type := case when v_changed then 'role.granted' else 'role.grant_unchanged' end;
  else
    update security.user_roles set revoked_at = now() where user_id = p_target_user_id and role_id = v_role_id and revoked_at is null and (expires_at is null or expires_at > now()); v_changed := found;
    v_event_type := case when v_changed then 'role.revoked' else 'role.revoke_unchanged' end;
  end if;
  select exists (select 1 from security.user_roles ur join security.roles r on r.id = ur.role_id where ur.user_id = p_target_user_id and r.code <> 'user' and ur.revoked_at is null and (ur.expires_at is null or ur.expires_at > now())) into v_has_admin_role;
  perform set_config('app.rbac_role_mutation', 'true', true);
  update public.profiles set is_admin = v_has_admin_role, allow_password_login = case when v_has_admin_role then allow_password_login else false end where id = p_target_user_id;
  if v_changed then perform security.bump_authorization_versions(array[p_target_user_id]); end if;
  insert into security.audit_logs (actor_user_id, target_user_id, event_type, role_code, reason, request_id, ip_address, user_agent, metadata) values (p_actor_user_id, p_target_user_id, v_event_type, p_role_code, trim(p_reason), p_request_id, p_ip_address, p_user_agent, jsonb_build_object('changed', v_changed));
  return jsonb_build_object('changed', v_changed, 'action', p_action, 'roleCode', p_role_code, 'isAdmin', v_has_admin_role);
end;
$$;

revoke all on function public.manage_user_role(uuid, text, uuid, text, text, uuid, text, inet) from public, anon, authenticated;
grant execute on function public.manage_user_role(uuid, text, uuid, text, text, uuid, text, inet) to service_role;
