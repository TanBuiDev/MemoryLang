-- Administrative RLS access is valid only for the current Google OAuth + AAL2 session.
-- This keeps direct PostgREST calls subject to the same policy as the admin UI.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and security.is_google_oauth_session()
    and security.is_mfa_verified()
    and security.is_admin_session_active(
      nullif((select auth.jwt() ->> 'session_id'), '')::uuid
    )
    and exists (
      select 1
      from security.user_roles user_roles
      join security.roles roles on roles.id = user_roles.role_id
      where user_roles.user_id = (select auth.uid())
        and roles.code <> 'user'
        and user_roles.revoked_at is null
        and (user_roles.expires_at is null or user_roles.expires_at > now())
    );
$$;

-- Pending administrative grants cannot activate from a password session.
create or replace function public.refresh_admin_role_grant_activation()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_activated integer := 0;
begin
  if (select auth.uid()) is null
    or not security.is_google_oauth_session()
    or not security.is_mfa_verified() then
    raise exception 'Google OAuth and MFA verification are required.' using errcode = '42501';
  end if;

  with activated as (
    update security.admin_role_grants grants
    set activation_state = 'active', activated_at = now()
    where grants.user_id = (select auth.uid())
      and grants.activation_state = 'pending'
    returning grants.role_id, grants.granted_by, grants.reason
  ), inserted as (
    insert into security.user_roles (user_id, role_id, granted_by, reason)
    select (select auth.uid()), role_id, granted_by, reason
    from activated
    on conflict do nothing
    returning role_id
  )
  select count(*) into v_activated from activated;

  if v_activated > 0 then
    perform set_config('app.rbac_role_mutation', 'true', true);
    update public.profiles
    set is_admin = true, allow_password_login = false
    where id = (select auth.uid());
    perform security.bump_authorization_versions(array[(select auth.uid())]);
    insert into security.audit_logs(actor_user_id, target_user_id, event_type, metadata)
    values (
      (select auth.uid()),
      (select auth.uid()),
      'admin_role.activated',
      jsonb_build_object('activatedCount', v_activated)
    );
  end if;

  return v_activated;
end;
$$;
