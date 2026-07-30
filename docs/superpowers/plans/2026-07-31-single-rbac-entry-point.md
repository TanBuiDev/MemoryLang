# Single RBAC Entry Point Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the misleading legacy Admin toggle so the reviewed RBAC modal is the only administrative role-mutation entry point in the account list.

**Architecture:** `AdminRolesPage` retains its existing RBAC modal and save-confirm flow while the account kebab becomes a non-RBAC navigation menu. The unused `adminService.updateUserAdminStatus` method and tests that preserve it are deleted, preventing a second client path from silently mapping generic “Admin” access to `exam_admin`.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Supabase client, GitNexus.

## Global Constraints

- Keep **Phân quyền** as the only role-management action in the account list.
- Keep subscription management in the kebab menu.
- Do not change the RBAC modal, Edge Functions, database schema, RLS policies, administrator authentication, or MFA.
- Use the project `Button` component for visible controls.
- Run `pnpm build` successfully before committing.
- Run GitNexus impact analysis before symbol edits and `detect_changes` before committing.

---

### Task 1: Lock the single-entry-point behavior with regression tests

**Files:**
- Modify: `src/pages/admin/AdminRolesPage.test.tsx`
- Modify: `src/features/admin/manageUserRoleSecurityContract.test.ts`

**Interfaces:**
- Consumes: rendered `AdminRolesPage` account table and source text from `src/services/supabase/admin.service.ts`
- Produces: a UI contract that exposes **Phân quyền** but no **Cấp/Gỡ quyền Admin**, and a service contract that forbids `updateUserAdminStatus`

- [ ] **Step 1: Add a failing account-action test**

Add this test to `AdminRolesPage.test.tsx`:

```tsx
it('uses the RBAC dialog as the only administrator role action in the account list', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <AdminRolesPage />
    </MemoryRouter>,
  )

  expect(await screen.findByRole('button', { name: /phân quyền target user/i })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /thao tác tài khoản target user/i }))
  expect(screen.queryByRole('button', { name: /cấp quyền admin/i })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /gỡ quyền admin/i })).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: /quản lý gói/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: Replace the legacy service test with a failing absence contract**

Replace the third test in `manageUserRoleSecurityContract.test.ts` with:

```ts
it('does not expose a legacy generic administrator toggle', () => {
  const source = readFileSync(adminServicePath, 'utf8')
  expect(source).not.toContain('updateUserAdminStatus')
})
```

- [ ] **Step 3: Run tests and verify RED**

Run:

```bash
pnpm vitest run src/pages/admin/AdminRolesPage.test.tsx src/features/admin/manageUserRoleSecurityContract.test.ts
```

Expected: both new assertions fail because the kebab still renders the generic Admin action and the service method still exists.

### Task 2: Remove the legacy UI and service path

**Files:**
- Modify: `src/pages/admin/AdminRolesPage.tsx`
- Modify: `src/services/supabase/admin.service.ts`
- Modify: `src/services/supabase/admin.service.test.ts`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: existing `openUserDialog(target)` RBAC entry point and subscription route `/app/admin/subscriptions?user=:id`
- Produces: `UserActionKebabMenu({ user }: { user: AdminUserProfile })` with no role-mutation callback

- [ ] **Step 1: Simplify `UserActionKebabMenu`**

Change its props to:

```tsx
function UserActionKebabMenu({ user }: { user: AdminUserProfile }) {
```

Remove `actionLoading`, `onToggleAdmin`, the `disabled={actionLoading}` binding, the generic Admin menu button, and the now-unused `UserX` import. Retain the subscription `Link`.

- [ ] **Step 2: Remove page-level legacy state and handler**

Delete:

```tsx
const [accountActionLoading, setAccountActionLoading] = useState<string | null>(null)
const [accountConfirmModal, setAccountConfirmModal] = useState<...>(null)
```

Delete `handleToggleAdmin`, the account-specific `ConfirmModal`, and the two legacy props passed to `UserActionKebabMenu`. Reduce the `accountColumns` dependency list to:

```tsx
[canAssignRoles, overview.users]
```

- [ ] **Step 3: Remove the unused service method and its unit test**

Delete `adminService.updateUserAdminStatus` from `admin.service.ts`. Delete the `describe('adminService role management', ...)` block that calls that method from `admin.service.test.ts`.

- [ ] **Step 4: Document the single RBAC mutation path**

Update the RBAC architecture paragraph in `CLAUDE.md` to state that account-list role changes must go through the RBAC modal and `manage-rbac`, and that the kebab contains only non-RBAC account actions.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```bash
pnpm vitest run src/pages/admin/AdminRolesPage.test.tsx src/features/admin/manageUserRoleSecurityContract.test.ts src/services/supabase/admin.service.test.ts
```

Expected: all tests pass.

### Task 3: Verify scope and commit the implementation

**Files:**
- Verify: `src/pages/admin/AdminRolesPage.tsx`
- Verify: `src/pages/admin/AdminRolesPage.test.tsx`
- Verify: `src/services/supabase/admin.service.ts`
- Verify: `src/services/supabase/admin.service.test.ts`
- Verify: `src/features/admin/manageUserRoleSecurityContract.test.ts`
- Verify: `CLAUDE.md`

**Interfaces:**
- Consumes: completed implementation and tests from Tasks 1–2
- Produces: one atomic implementation commit with no production secret or unrelated user file

- [ ] **Step 1: Confirm no legacy references remain**

Run:

```bash
rg -n "updateUserAdminStatus|onToggleAdmin|Cấp quyền Admin|Gỡ quyền Admin|accountActionLoading|accountConfirmModal" src
```

Expected: no matches.

- [ ] **Step 2: Run the required production build**

Run:

```bash
pnpm build
```

Expected: exit code 0.

- [ ] **Step 3: Inspect repository state and each relevant diff**

Run:

```bash
git status --short
git diff -- src/pages/admin/AdminRolesPage.tsx
git diff -- src/pages/admin/AdminRolesPage.test.tsx
git diff -- src/services/supabase/admin.service.ts
git diff -- src/services/supabase/admin.service.test.ts
git diff -- src/features/admin/manageUserRoleSecurityContract.test.ts
git diff -- CLAUDE.md
```

Expected: only the approved single-entry-point implementation appears; existing untracked data files remain untouched.

- [ ] **Step 4: Run GitNexus change detection**

Run `gitnexus_detect_changes({ scope: "all" })`.

Expected: low risk limited to the Admin roles page and removed legacy service path.

- [ ] **Step 5: Commit only the implementation files**

Run:

```bash
git add -- CLAUDE.md src/pages/admin/AdminRolesPage.tsx src/pages/admin/AdminRolesPage.test.tsx src/services/supabase/admin.service.ts src/services/supabase/admin.service.test.ts src/features/admin/manageUserRoleSecurityContract.test.ts
git commit -m "fix: unify administrator role assignment"
```

Expected: one atomic conventional commit; no push.
