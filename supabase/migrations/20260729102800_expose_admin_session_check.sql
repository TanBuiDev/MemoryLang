create or replace function public.is_admin_session_active(p_auth_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select security.is_admin_session_active(p_auth_session_id);
$$;

revoke all on function public.is_admin_session_active(uuid) from public, anon, service_role;
grant execute on function public.is_admin_session_active(uuid) to authenticated;
