create or replace function security.is_google_oauth_session()
returns boolean language sql stable security definer set search_path = '' as $$
  select security.has_google_identity((select auth.uid()))
    and coalesce((select auth.jwt()) -> 'amr', '[]'::jsonb) @> '[{"method":"oauth"}]'::jsonb;
$$;

create or replace function public.start_admin_session(
  p_auth_session_id uuid, p_ip_address inet default null, p_user_agent text default null
) returns security.admin_sessions language plpgsql security definer set search_path = '' as $$
declare v_session security.admin_sessions;
begin
  if (select auth.uid()) is null or p_auth_session_id is null or p_auth_session_id::text is distinct from (select auth.jwt() ->> 'session_id') then raise exception 'Invalid authentication session.' using errcode = '42501'; end if;
  if not security.is_google_oauth_session() or not security.is_mfa_verified() then raise exception 'Google OAuth and MFA verification are required for an admin session.' using errcode = '42501'; end if;
  perform public.refresh_admin_role_grant_activation();
  if not exists (select 1 from security.user_roles ur join security.roles r on r.id = ur.role_id where ur.user_id = (select auth.uid()) and r.code <> 'user' and ur.revoked_at is null and (ur.expires_at is null or ur.expires_at > now())) then raise exception 'An active administrative role is required.' using errcode = '42501'; end if;
  update security.admin_sessions set revoked_at = now(), revoked_by = (select auth.uid()) where user_id = (select auth.uid()) and auth_session_id = p_auth_session_id and revoked_at is null;
  insert into security.admin_sessions(user_id, auth_session_id, ip_address, user_agent) values ((select auth.uid()), p_auth_session_id, p_ip_address, p_user_agent) returning * into v_session;
  insert into security.audit_logs(actor_user_id, target_user_id, event_type, ip_address, user_agent) values ((select auth.uid()), (select auth.uid()), 'admin_session.started', p_ip_address, p_user_agent);
  return v_session;
end;
$$;
revoke all on function security.is_google_oauth_session() from public, anon, authenticated, service_role;
