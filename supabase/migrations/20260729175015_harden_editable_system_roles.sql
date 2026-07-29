create or replace function public.manage_role_permission(
  p_actor_user_id uuid, p_action text, p_role_code text, p_permission_code text, p_reason text,
  p_request_id uuid default null, p_user_agent text default null, p_ip_address inet default null
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_role_id uuid; v_permission_id uuid; v_changed boolean := false; v_affected_users uuid[]; v_base_permission_count integer;
begin
  if p_action not in ('grant', 'revoke') or length(trim(coalesce(p_reason, ''))) = 0 then raise exception 'Invalid permission change.' using errcode = '22023'; end if;
  if not exists (select 1 from security.user_roles ur join security.roles r on r.id = ur.role_id where ur.user_id = p_actor_user_id and r.code = 'super_admin' and ur.revoked_at is null and (ur.expires_at is null or ur.expires_at > now())) then raise exception 'Forbidden.' using errcode = '42501'; end if;
  select id into v_role_id from security.roles where code = p_role_code;
  select id into v_permission_id from security.permissions where code = p_permission_code;
  if v_role_id is null or v_permission_id is null then raise exception 'Unknown role or permission.' using errcode = '22023'; end if;
  if p_action = 'revoke' and p_role_code = 'super_admin' and p_permission_code in ('role.read', 'role.assign', 'role.revoke', 'audit.read.security') then raise exception 'Core recovery permissions cannot be removed from super administrators.' using errcode = '42501'; end if;
  if p_action = 'revoke' and p_role_code = 'user' and p_permission_code in ('profile.read.own', 'profile.update.own') then
    select count(*) into v_base_permission_count from security.role_permissions rp join security.permissions p on p.id = rp.permission_id where rp.role_id = v_role_id and p.code in ('profile.read.own', 'profile.update.own');
    if v_base_permission_count <= 1 then raise exception 'The user role must retain one basic profile permission.' using errcode = '42501'; end if;
  end if;
  if p_action = 'grant' then insert into security.role_permissions (role_id, permission_id) values (v_role_id, v_permission_id) on conflict do nothing; v_changed := found;
  else delete from security.role_permissions where role_id = v_role_id and permission_id = v_permission_id; v_changed := found; end if;
  if v_changed then
    select coalesce(array_agg(distinct ur.user_id), '{}'::uuid[]) into v_affected_users from security.user_roles ur where ur.role_id = v_role_id and ur.revoked_at is null and (ur.expires_at is null or ur.expires_at > now());
    perform security.bump_authorization_versions(v_affected_users);
  end if;
  insert into security.audit_logs (actor_user_id, event_type, role_code, reason, request_id, ip_address, user_agent, metadata) values (p_actor_user_id, 'role.permission_changed', p_role_code, trim(p_reason), p_request_id, p_ip_address, p_user_agent, jsonb_build_object('permissionCode', p_permission_code, 'action', p_action, 'changed', v_changed));
  return jsonb_build_object('changed', v_changed, 'action', p_action, 'roleCode', p_role_code, 'permissionCode', p_permission_code);
end;
$$;

create or replace function public.manage_user_role(
  p_actor_user_id uuid, p_action text, p_target_user_id uuid, p_role_code text, p_reason text,
  p_request_id uuid default null, p_user_agent text default null, p_ip_address inet default null
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_role_id uuid; v_changed boolean := false; v_has_admin_role boolean;
begin
  if p_action not in ('grant','revoke') or p_actor_user_id is null or p_target_user_id is null or length(trim(coalesce(p_reason,''))) = 0 then raise exception 'Invalid role change.' using errcode='22023'; end if;
  if p_actor_user_id = p_target_user_id and p_role_code = 'super_admin' and p_action = 'revoke' then raise exception 'A super administrator cannot remove their own recovery role.' using errcode='42501'; end if;
  select id into v_role_id from security.roles where code=p_role_code;
  if v_role_id is null or p_role_code='user' then raise exception 'Role is unavailable for assignment.' using errcode='22023'; end if;
  if not exists (select 1 from security.user_roles ur join security.role_permissions rp on rp.role_id=ur.role_id join security.permissions p on p.id=rp.permission_id where ur.user_id=p_actor_user_id and p.code=case when p_action='grant' then 'role.assign' else 'role.revoke' end and ur.revoked_at is null and (ur.expires_at is null or ur.expires_at>now())) then raise exception 'Actor lacks permission.' using errcode='42501'; end if;
  if p_role_code='super_admin' and not exists (select 1 from security.user_roles ur join security.roles r on r.id=ur.role_id where ur.user_id=p_actor_user_id and r.code='super_admin' and ur.revoked_at is null and (ur.expires_at is null or ur.expires_at>now())) then raise exception 'Forbidden.' using errcode='42501'; end if;
  if p_action='revoke' and p_role_code='super_admin' and not exists (select 1 from security.user_roles ur where ur.role_id=v_role_id and ur.user_id<>p_target_user_id and ur.revoked_at is null and (ur.expires_at is null or ur.expires_at>now())) then raise exception 'At least one super administrator must remain active.' using errcode='42501'; end if;
  if p_action='grant' then insert into security.user_roles(user_id,role_id,granted_by,reason) select p_target_user_id,v_role_id,p_actor_user_id,trim(p_reason) where not exists(select 1 from security.user_roles where user_id=p_target_user_id and role_id=v_role_id and revoked_at is null and (expires_at is null or expires_at>now())); v_changed:=found;
  else update security.user_roles set revoked_at=now() where user_id=p_target_user_id and role_id=v_role_id and revoked_at is null and (expires_at is null or expires_at>now()); v_changed:=found; end if;
  select exists(select 1 from security.user_roles ur join security.roles r on r.id=ur.role_id where ur.user_id=p_target_user_id and r.code<>'user' and ur.revoked_at is null and (ur.expires_at is null or ur.expires_at>now())) into v_has_admin_role;
  perform set_config('app.rbac_role_mutation','true',true); update public.profiles set is_admin=v_has_admin_role,allow_password_login=case when v_has_admin_role then allow_password_login else false end where id=p_target_user_id;
  if v_changed then perform security.bump_authorization_versions(array[p_target_user_id]); end if;
  insert into security.audit_logs(actor_user_id,target_user_id,event_type,role_code,reason,request_id,ip_address,user_agent,metadata) values(p_actor_user_id,p_target_user_id,case when p_action='grant' then 'role.granted' else 'role.revoked' end,p_role_code,trim(p_reason),p_request_id,p_ip_address,p_user_agent,jsonb_build_object('changed',v_changed));
  return jsonb_build_object('changed',v_changed,'action',p_action,'roleCode',p_role_code,'isAdmin',v_has_admin_role);
end; $$;
