# RBAC Confirmation Responsive Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the RBAC confirmation modal immediately after submission while safely refreshing the authorization view in the background.

**Architecture:** `AdminRolesPage` will separate pending confirmation state from a non-blocking synchronization state. It will clear the confirmation state before awaiting Edge Function mutations, retain the existing data until `loadOverview` succeeds, and preserve current error recovery behavior.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Supabase Edge Functions.

## Global Constraints

- Do not apply role or permission changes optimistically to the visible overview.
- Keep MFA, admin-session, and server-side authorization unchanged.
- Use existing `ConfirmModal`, `Button`, and page error/status patterns.
- Run focused tests and `pnpm tsc -b` before committing.

---

### Task 1: Close confirmation before background synchronization

**Files:**
- Modify: `src/pages/admin/AdminRolesPage.tsx: confirmMutation state and handler`
- Modify: `src/pages/admin/AdminRolesPage.test.tsx: RBAC confirmation tests`

**Interfaces:**
- Consumes: `pendingMutations`, `loadOverview(query)`, `supabase.functions.invoke`.
- Produces: a visible non-blocking synchronization status while mutations and refresh execute.

- [x] **Step 1: Write the failing test**

Add a deferred `manage-rbac` mock and assert that after the confirmation button is pressed, the confirmation dialog is absent and the synchronization status is present before the deferred request resolves.

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/pages/admin/AdminRolesPage.test.tsx`

Expected: FAIL because the existing handler retains `pendingMutations` until the server request completes.

- [x] **Step 3: Write minimal implementation**

Clear `pendingMutations` and the selected user before awaiting the protected mutations, add `syncing` state, show a compact status while `syncing` is true, and set `syncing` false in `finally`.

- [x] **Step 4: Run focused verification**

Run: `pnpm vitest run src/pages/admin/AdminRolesPage.test.tsx`

Expected: PASS with the dialog closing before the deferred request resolves.

- [x] **Step 5: Run type-check and commit**

Run: `pnpm tsc -b`

Commit files: `src/pages/admin/AdminRolesPage.tsx`, `src/pages/admin/AdminRolesPage.test.tsx`.
