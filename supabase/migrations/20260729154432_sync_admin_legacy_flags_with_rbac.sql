-- Keep legacy UI/RLS checks consistent with the authoritative RBAC assignments.
-- The setting is consumed only by the protected profile trigger during this
-- migration; normal clients cannot modify administrator flags directly.
select set_config('app.rbac_role_mutation', 'true', true);

update public.profiles as profile
set is_admin = exists (
  select 1
  from security.user_roles as user_role
  join security.roles as role on role.id = user_role.role_id
  where user_role.user_id = profile.id
    and role.code <> 'user'
    and user_role.revoked_at is null
    and (user_role.expires_at is null or user_role.expires_at > now())
)
where profile.is_admin is distinct from exists (
  select 1
  from security.user_roles as user_role
  join security.roles as role on role.id = user_role.role_id
  where user_role.user_id = profile.id
    and role.code <> 'user'
    and user_role.revoked_at is null
    and (user_role.expires_at is null or user_role.expires_at > now())
);
