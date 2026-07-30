-- The helper is evaluated by authenticated RLS policies only; it is not a public API.
revoke all on function public.is_admin() from public, anon, service_role;
grant execute on function public.is_admin() to authenticated;
