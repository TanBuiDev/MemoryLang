create or replace function public.get_pending_admin_role_grants()
returns table (user_id uuid, role_code text, activation_state text)
language plpgsql security definer set search_path = '' as $$
begin
  if not security.has_permission('role.read') then
    raise exception 'Forbidden.' using errcode = '42501';
  end if;
  return query
  select grants.user_id, roles.code, grants.activation_state
  from security.admin_role_grants grants
  join security.roles roles on roles.id = grants.role_id
  where grants.activation_state = 'pending';
end;
$$;
revoke all on function public.get_pending_admin_role_grants() from public, anon, service_role;
grant execute on function public.get_pending_admin_role_grants() to authenticated;
