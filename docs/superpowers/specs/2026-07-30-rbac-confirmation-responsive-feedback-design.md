# RBAC confirmation responsive feedback

## Goal

Make RBAC confirmation feel immediate without representing an unconfirmed server-side change as complete.

## Interaction

After the administrator confirms a role or permission change, the confirmation modal closes immediately. The page shows a compact non-blocking status while the protected Edge Function requests complete. The existing list and matrix remain visible until the refreshed overview is loaded.

On success, the status clears after the refreshed overview replaces the previous data. On failure, the page reloads the overview to discard any stale local presentation and displays an error banner. No mutation is applied optimistically to the visible role or permission data.

## Scope

- Update only `AdminRolesPage` confirmation state and its focused test coverage.
- Keep MFA/admin-session establishment and server-side authorization unchanged.
- Reuse the existing page status/error presentation and no browser-native dialogs.

## Verification

The page test must prove that confirmation closes before the deferred mutation resolves, while the background status is visible. Existing role confirmation ordering must remain covered. Run the focused tests and `pnpm tsc -b`.
