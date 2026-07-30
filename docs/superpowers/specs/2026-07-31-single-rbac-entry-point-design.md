# Single RBAC Entry Point Design

## Goal

Make the RBAC role-assignment modal the only place where administrators can grant or revoke administrative roles from the account list.

## Current Problem

The account-list action column exposes two different role mutation flows:

- **Phân quyền** opens the complete RBAC role selector and uses the reviewed save-and-confirm flow.
- **Cấp/Gỡ quyền Admin** in the kebab menu uses the legacy `updateUserAdminStatus` service method, which grants or revokes only `exam_admin` while presenting the action as if it changed all administrative access.

This mismatch can mislead an administrator and leave a user with unexpected roles.

## Approved Design

- Keep **Phân quyền** as the only role-management action in the account list.
- Remove **Cấp quyền Admin** and **Gỡ quyền Admin** from the kebab menu.
- Keep the kebab menu for non-RBAC account actions, currently subscription management.
- Remove the unused `updateUserAdminStatus` service method and its legacy contract test.
- Do not change the RBAC modal, confirmation dialog, role safety constraints, Edge Functions, database schema, or RLS policies.

## Data Flow

1. An authorized administrator selects **Phân quyền**.
2. The existing RBAC modal loads the user's current roles.
3. Role checkbox changes remain draft-only.
4. The administrator selects **Lưu**, reviews the confirmation summary, and confirms.
5. The existing `manage-rbac` path applies the complete role change and refreshes the account and RBAC views.

No kebab-menu action may mutate administrative roles.

## Error Handling

The existing RBAC modal remains responsible for loading, validation, mutation errors, and synchronization feedback. Removing the legacy path eliminates a second error surface without adding a replacement.

## Verification

- A source-level regression test confirms that the account kebab menu no longer receives or invokes `onToggleAdmin`.
- Existing RBAC page tests confirm the role modal and save-confirm flow remain available.
- Repository type-check/build must pass.
- GitNexus change detection must report only the expected admin-account action and legacy service scope.

## Out of Scope

- Redesigning the account action column.
- Changing role definitions or permissions.
- Changing subscription management.
- Changing administrator authentication or MFA policies.
