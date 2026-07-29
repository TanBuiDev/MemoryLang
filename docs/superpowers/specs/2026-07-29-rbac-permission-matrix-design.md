# RBAC Permission Matrix Design

## Goal

Provide a visual administrator interface to assign roles to users and edit the permission matrix for each role without exposing raw SQL or configuration.

## Roles and authority

- `super_admin` can assign or revoke every administrative role and edit the permission matrix.
- `security_admin` can assign or revoke `security_admin`, `exam_admin`, and `support_admin`, but cannot manage `super_admin` or edit the permission matrix.
- Accounts cannot change their own role assignments or permissions.
- `super_admin` retains every permission and its matrix cells are read-only to preserve an emergency recovery path.

## User experience

`/app/admin/roles` contains two tabs:

1. **Phân quyền người dùng** — a searchable user list with current role badges and a visual modal to grant or revoke individual roles. Every mutation requires a human-readable reason and confirmation.
2. **Ma trận quyền** — a role-by-permission grid. A super administrator can toggle a cell after entering a reason and confirming the action. The grid shows permission descriptions in plain Vietnamese.

The existing `/app/admin/users` page remains a user/subscription management surface and no longer represents the source of truth for roles.

## Security and data flow

The database owns authorization. A `SECURITY DEFINER` RPC returns only the role-management overview to callers with `role.read`. A separate privileged mutation RPC verifies the actor's active role and writes append-only audit records. An Edge Function validates the caller's JWT, AAL2 MFA claim, and active admin session before it invokes that mutation RPC with the service role.

Each permission or role mutation increments a lightweight per-user authorization version. Authenticated clients poll that version while the app is active and refresh their permission summary when it changes. Database RPCs, RLS policies, and Edge Functions continue to evaluate the latest database permissions on every request, so enforcement is immediate even before the UI refreshes.

## Scope

The matrix governs permissions already modeled in `security.permissions`. Legacy features still guarded solely by `profiles.is_admin` are not represented as matrix cells until their database policies and routes are converted to `security.has_permission`; the UI labels this distinction rather than implying unsupported controls are dynamic.

## Verification

- SQL contract tests prove unauthorised callers cannot list or mutate the matrix.
- Unit tests prove role-matrix toggles require a reason and use the protected Edge Function.
- Integration verification confirms a permission removal denies the next protected request and refreshes the affected user interface.
