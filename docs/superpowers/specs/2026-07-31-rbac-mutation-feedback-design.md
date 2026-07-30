# RBAC Mutation Feedback and Pending-State Design

## Goal

Make every administrator role change visibly traceable from submission through activation, so an administrator can distinguish a failed request, a saved pending grant, and an active role.

## Confirmed Problem

The account-list tab renders administrator state from `profiles.is_admin`. A newly granted role is intentionally stored in `security.admin_role_grants` with `activation_state = 'pending'` until the target account signs in with Google OAuth and completes MFA. During that interval, `profiles.is_admin` remains false, so the account row still looks like an ordinary user.

The mutation flow also displays Edge Function failures in an error banner that automatically disappears after three seconds. `FunctionsHttpError` response details are not extracted, and a successful invocation is not validated for the expected mutation result. A rejected or malformed request can therefore look like a successful no-op.

Production inspection for the reported account confirmed that no new active or pending grant and no new role audit event were created. The UI must expose that failure rather than implying that synchronization completed.

## Approved Design

### Account role state

The account-list tab will combine profile data with the authoritative RBAC overview:

- Active role codes come from `RbacUser.roleCodes`.
- Pending role codes come from `RbacUser.pendingRoleCodes`.
- `profiles.is_admin` remains a compatibility/security flag, not the sole role-state source for this UI.
- An account with active administrative roles displays its active role badges.
- An account with no active role but at least one pending role displays a visible **Chờ kích hoạt** state and the pending role badges.
- **User** is displayed only when there are no active or pending administrative roles.

The pending state explains that the target must sign in through Google OAuth and complete MFA before administrative access becomes active.

### Mutation result handling

Each `manage-rbac` invocation must return an object containing the expected mutation data. The client will treat missing or malformed data as a failure rather than silently continuing.

For a role grant, the returned `activationState` controls the success message:

- `pending`: the grant was saved and awaits target-account activation.
- `active`: the role is already active.
- Any absent or unsupported state: show a persistent error and refresh authoritative data.

Multiple mutations remain sequential because each mutation is individually authorized and audited. The UI tracks how many mutations completed. If a later mutation fails, the message states the completed count and refreshes both the RBAC overview and account profiles, avoiding an incorrect all-or-nothing claim.

### Durable feedback

Replace the auto-dismissing error-only state with explicit feedback:

- Success feedback remains visible until the administrator closes it or starts another mutation.
- Error feedback remains visible until closed.
- Edge Function response JSON is read from `FunctionsHttpError.context` when available.
- Only safe server messages defined by MemoryLang are shown; unknown responses use a generic Vietnamese fallback.
- Synchronization feedback remains non-blocking and the confirmation modal still closes immediately after submission.

## Data Flow

1. The administrator selects role checkboxes, reviews the summary, and confirms.
2. The confirmation modal closes and synchronization feedback appears.
3. The client invokes `manage-rbac` sequentially and validates every response.
4. The client reloads `get_role_management_overview` and account profiles.
5. The account row renders active and pending states from the refreshed overview.
6. A persistent result message explains whether the roles are active, pending activation, partially applied, or rejected.
7. When the target later signs in with Google OAuth and MFA, the existing activation RPC promotes pending grants and subsequent refreshes show active roles.

## Error Handling

- Network failure: state that the Edge Function could not be reached.
- HTTP rejection: extract a safe server response when possible and retain the message.
- Malformed success response: report that the server did not confirm the role change.
- Partial batch: report the completed mutation count and the failed mutation; always refresh both data sources.
- Refresh failure after a confirmed mutation: retain a success-with-refresh-warning message so the administrator knows the write succeeded but the display could not be synchronized.

## Testing

- Account-list test: an active role renders as active.
- Account-list test: a pending role renders **Chờ kích hoạt** even when `profiles.is_admin` is false.
- Mutation test: a valid pending grant produces persistent success feedback and refreshes both data sources.
- Mutation test: a malformed success response is treated as an error.
- Mutation test: an Edge Function HTTP error remains visible and exposes only a safe message.
- Existing confirmation-close, role safety, authentication, and RBAC contract tests remain green.
- Full `pnpm test` and `pnpm build` must pass before commit.

## Security and Scope

- Do not activate a role from the client.
- Do not weaken the Google OAuth, MFA, active-session, RLS, or permission checks.
- Do not expose service-role credentials or raw internal error details.
- Do not change the database schema, migrations, Edge Function authorization, or role definitions.
- Do not reintroduce the legacy generic Admin toggle.
