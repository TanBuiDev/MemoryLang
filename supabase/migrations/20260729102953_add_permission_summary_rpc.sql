create or replace function public.get_my_permissions()
returns table(code text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct permissions.code
  from security.user_roles user_roles
  join security.role_permissions role_permissions on role_permissions.role_id = user_roles.role_id
  join security.permissions permissions on permissions.id = role_permissions.permission_id
  where user_roles.user_id = (select auth.uid())
    and user_roles.revoked_at is null
    and (user_roles.expires_at is null or user_roles.expires_at > now());
$$;

revoke all on function public.get_my_permissions() from public, anon, service_role;
grant execute on function public.get_my_permissions() to authenticated;
