# RBAC Mutation Feedback and Pending-State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show active and pending administrator roles in the account list and make every RBAC mutation produce durable, validated success or error feedback.

**Architecture:** `AdminRolesPage` will merge `accountUsers` profiles with `overview.users` RBAC state instead of treating `profiles.is_admin` as the complete display model. A focused helper module will validate `manage-rbac` responses and convert Edge Function errors into safe Vietnamese messages, while the page retains its existing confirmation and synchronization flow.

**Tech Stack:** React 19, TypeScript, Supabase Functions client, Vitest, Testing Library, GitNexus.

## Global Constraints

- Do not activate a role from the client.
- Do not weaken Google OAuth, MFA, active-session, RLS, or permission checks.
- Do not expose raw internal errors, service credentials, or unsupported server messages.
- Do not change database migrations, Edge Function authorization, or role definitions.
- Do not reintroduce the legacy generic Admin toggle.
- Use project `Button`, badges, and Neobrutalist utility classes.
- Run `pnpm test` and `pnpm build` before the implementation commit.

---

### Task 1: Define and test safe mutation-result handling

**Files:**
- Create: `src/features/admin/rbacMutationFeedback.ts`
- Create: `src/features/admin/rbacMutationFeedback.test.ts`

**Interfaces:**
- Produces: `validateRbacMutationResult(payload, mutation): RbacMutationResult`
- Produces: `getRbacMutationErrorMessage(error): Promise<string>`
- Consumes: mutation objects with `kind`, `action`, and role/permission identifiers

- [ ] **Step 1: Write failing helper tests**

Test that:

```ts
expect(() => validateRbacMutationResult(
  { data: { changed: true, action: 'grant', roleCode: 'exam_admin', activationState: 'pending' } },
  { kind: 'role', action: 'grant', targetUserId: userId, roleCode: 'exam_admin', reason: 'confirmed' },
)).not.toThrow()
```

Also assert that `{ data: {} }` throws `Máy chủ không xác nhận thay đổi phân quyền.`, and that a `Response` containing `{ error: 'Forbidden.' }` maps to a safe session/permission message without exposing arbitrary response text.

- [ ] **Step 2: Run RED**

```bash
pnpm vitest run src/features/admin/rbacMutationFeedback.test.ts
```

Expected: fail because the helper module does not exist.

- [ ] **Step 3: Implement minimal validation**

Define:

```ts
export interface RbacMutationResult {
  changed: boolean
  action: 'grant' | 'revoke'
  roleCode?: string
  permissionCode?: string
  activationState?: 'pending' | 'active' | 'revoked'
}
```

Validate the nested Edge Function payload (`payload.data`), matching action and identifier. A granted role must return `pending` or `active`; a revoked role must return `revoked`. Map only known server errors (`Unauthorized.`, `Forbidden.`, `Invalid request.`, `Unable to update access configuration.`); all other values return a generic Vietnamese message.

- [ ] **Step 4: Run GREEN**

```bash
pnpm vitest run src/features/admin/rbacMutationFeedback.test.ts
```

Expected: pass.

### Task 2: Render authoritative account role state

**Files:**
- Modify: `src/pages/admin/AdminRolesPage.tsx`
- Modify: `src/pages/admin/AdminRolesPage.test.tsx`

**Interfaces:**
- Consumes: `overview.users[].roleCodes` and `pendingRoleCodes`
- Produces: active role badges, pending role badges, and the default User badge only when neither state exists

- [ ] **Step 1: Add a failing pending-role UI test**

Mock the target as:

```ts
{
  id: 'target',
  email: 'target@example.com',
  displayName: 'Target User',
  roleCodes: [],
  pendingRoleCodes: ['exam_admin'],
}
```

Render the account-list tab and assert that the target row contains `Exam administrator` and `Chờ kích hoạt`, while it does not present the account as an ordinary User-only row.

- [ ] **Step 2: Run RED**

```bash
pnpm vitest run src/pages/admin/AdminRolesPage.test.tsx
```

Expected: fail because the account column only reads `row.is_admin`.

- [ ] **Step 3: Merge account and RBAC state**

Create an `rbacUserById` memo from `overview.users`. For each account row:

```ts
const rbacUser = rbacUserById.get(row.id)
const activeRoleCodes = rbacUser?.roleCodes ?? []
const pendingRoleCodes = rbacUser?.pendingRoleCodes ?? []
const isActiveAdmin = row.is_admin || activeRoleCodes.length > 0
```

Use those values for metrics, account grouping, avatar styling, security/role badges, and the role-dialog target. Pending accounts belong in the Admin/Staff group but remain visually distinct from active administrators.

- [ ] **Step 4: Run GREEN**

```bash
pnpm vitest run src/pages/admin/AdminRolesPage.test.tsx
```

Expected: pass.

### Task 3: Add durable validated mutation feedback

**Files:**
- Modify: `src/pages/admin/AdminRolesPage.tsx`
- Modify: `src/pages/admin/AdminRolesPage.test.tsx`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: `validateRbacMutationResult` and `getRbacMutationErrorMessage`
- Produces: persistent success/error feedback and accurate partial-batch counts

- [ ] **Step 1: Add failing mutation feedback tests**

Add tests proving:

```tsx
expect(await screen.findByRole('status')).toHaveTextContent(/đã lưu.*chờ kích hoạt/i)
```

for a valid pending response, and:

```tsx
expect(await screen.findByRole('alert')).toHaveTextContent(/máy chủ không xác nhận/i)
```

for `{ data: { data: {} }, error: null }`. Rerender/wait beyond three seconds and verify errors remain until the close button is selected.

- [ ] **Step 2: Run RED**

```bash
pnpm vitest run src/pages/admin/AdminRolesPage.test.tsx src/features/admin/rbacMutationFeedback.test.ts
```

Expected: fail because responses are not validated and feedback auto-dismisses.

- [ ] **Step 3: Implement durable feedback**

Remove the error auto-dismiss effect. Add `successMessage` state. At mutation start, clear old success/error feedback. Validate every response and count completed mutations. After authoritative reload:

- show pending success when any granted role returns `activationState: 'pending'`;
- show standard success for active/revoked/permission changes;
- on failure, use the safe helper and include `Đã áp dụng N/M thay đổi` when partial;
- keep both success and error banners until explicitly closed.

Keep the existing immediate confirmation close and non-blocking synchronization banner.

- [ ] **Step 4: Update project context**

Document in `CLAUDE.md` that the account list merges active/pending RBAC state and retains validated mutation feedback.

- [ ] **Step 5: Run focused verification**

```bash
pnpm vitest run src/pages/admin/AdminRolesPage.test.tsx src/features/admin/rbacMutationFeedback.test.ts src/features/admin/manageRbacSecurityContract.test.ts
```

Expected: pass.

### Task 4: Verify and commit

**Files:**
- Verify all files from Tasks 1–3.

- [ ] **Step 1: Run full tests and build**

```bash
pnpm test
pnpm build
```

Expected: both exit 0.

- [ ] **Step 2: Inspect state and diffs**

```bash
git status --short
git diff --check
git diff -- CLAUDE.md src/pages/admin/AdminRolesPage.tsx src/pages/admin/AdminRolesPage.test.tsx src/features/admin/rbacMutationFeedback.ts src/features/admin/rbacMutationFeedback.test.ts
```

- [ ] **Step 3: Run GitNexus change detection**

Run `gitnexus_detect_changes({ scope: "all" })` and review every affected process.

- [ ] **Step 4: Commit only implementation files**

```bash
git add -- CLAUDE.md src/pages/admin/AdminRolesPage.tsx src/pages/admin/AdminRolesPage.test.tsx src/features/admin/rbacMutationFeedback.ts src/features/admin/rbacMutationFeedback.test.ts
git commit -m "fix: expose rbac mutation outcomes"
```

Do not push automatically.
