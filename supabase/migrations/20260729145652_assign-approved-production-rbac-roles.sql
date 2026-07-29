-- Approved by the production owner on 2026-07-29. This is deliberately an
-- explicit mapping; authorization is never inferred from email or JWT claims.
with approved_roles(user_id, role_code) as (
  values
    ('7112930d-527c-47dc-85f6-1f03a49d603c'::uuid, 'super_admin'::text),
    ('7112930d-527c-47dc-85f6-1f03a49d603c'::uuid, 'security_admin'::text),
    ('69cb6e9b-4a4d-4bab-ba57-1d67c6eebd0f'::uuid, 'super_admin'::text),
    ('69cb6e9b-4a4d-4bab-ba57-1d67c6eebd0f'::uuid, 'exam_admin'::text),
    ('69cb6e9b-4a4d-4bab-ba57-1d67c6eebd0f'::uuid, 'support_admin'::text)
)
insert into security.user_roles (user_id, role_id, granted_by, reason)
select approved_roles.user_id, roles.id, null, 'Initial production RBAC role approved by project owner.'
from approved_roles
join auth.users users on users.id = approved_roles.user_id
join security.roles roles on roles.code = approved_roles.role_code
where not exists (
  select 1
  from security.user_roles existing
  where existing.user_id = approved_roles.user_id
    and existing.role_id = roles.id
    and existing.revoked_at is null
    and (existing.expires_at is null or existing.expires_at > now())
);
