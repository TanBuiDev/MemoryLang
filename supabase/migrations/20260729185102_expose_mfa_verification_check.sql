create or replace function public.is_mfa_verified()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select security.is_mfa_verified();
$$;

revoke all on function public.is_mfa_verified() from public, anon, service_role;
grant execute on function public.is_mfa_verified() to authenticated;
