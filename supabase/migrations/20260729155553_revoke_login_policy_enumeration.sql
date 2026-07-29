-- Never let unauthenticated callers infer whether an email belongs to an
-- administrator or which sign-in policy is assigned to that account.
revoke all on function public.can_login_with_password(text) from public, anon, authenticated;
revoke all on function public.is_admin_email(text) from public, anon, authenticated;
