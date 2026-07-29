# RBAC Permission Matrix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a visual, audited role-assignment and permission-matrix console at `/app/admin/roles` whose server-side authorization changes take effect immediately.

**Architecture:** PostgreSQL remains the authorization authority. A read-only security-definer overview RPC evaluates `role.read`; a service-role-only mutation RPC evaluates the supplied actor and appends audit events. A single Edge Function validates the caller session, AAL2 MFA, and active admin session before calling either protected mutation. The React page uses only visual controls and refreshes the active user’s permission set when their authorization version changes.

**Tech Stack:** React 19, TypeScript, Vitest/Testing Library, Supabase PostgreSQL, Supabase Edge Functions, Zod, React Router.

## Global Constraints

- No raw SQL/JSON/code input in the administrator UI; use Input, Button, Badge, and ConfirmModal.
- A reason is mandatory for every role or matrix change; users cannot change their own assignment.
- `super_admin` assignments and all permission-matrix edits require a super administrator; `super_admin` matrix cells are immutable.
- All mutations require valid JWT, AAL2 MFA, and an active admin session; database checks remain authoritative.
- Preserve existing `profiles.is_admin` compatibility flag after a role change.
- Add only explicitly scoped files to each atomic commit; run `pnpm tsc -b` and GitNexus change detection before every commit.

---

### Task 1: Secure RBAC overview, mutation, and authorization-version database contract

**Files:**
- Create: `supabase/migrations/<generated>_add_rbac_permission_matrix.sql`
- Modify: `src/services/supabase/permissions.service.ts`
- Test: `src/services/supabase/rbac.service.test.ts`

**Interfaces:**
- Produces `public.get_role_management_overview(p_query text default null, p_limit integer default 100, p_offset integer default 0) returns jsonb` for callers with `role.read`.
- Produces service-role-only `public.manage_role_permission(p_actor_user_id uuid, p_action text, p_role_code text, p_permission_code text, p_reason text, ...) returns jsonb`.
- Produces authenticated `public.get_my_authorization_version() returns bigint`; role and permission changes increment each affected account’s version.

- [ ] **Step 1: Write failing service tests**

```ts
it('loads an RBAC overview through its protected RPC', async () => {
  await rbacService.getOverview('tony')
  expect(mockRpc).toHaveBeenCalledWith('get_role_management_overview', expect.objectContaining({ p_query: 'tony' }))
})
```

- [ ] **Step 2: Run the test and verify it fails because `rbacService` does not exist.**

Run: `pnpm vitest run src/services/supabase/rbac.service.test.ts`

- [ ] **Step 3: Generate the migration using `npx supabase migration new add_rbac_permission_matrix`, then implement the database contract.**

Create `security.authorization_versions` with an enabled-RLS private table and a `security.bump_authorization_versions(uuid[])` helper. Replace `public.manage_user_role` to increment the target version after a real mutation. Create overview and matrix mutation functions with fixed empty `search_path`, revoking PUBLIC/anon/authenticated execution from privileged functions and granting the narrow public reader only to authenticated. The overview must return role definitions, permissions, and paged profile assignments without disclosing audit records.

- [ ] **Step 4: Implement `rbacService` and its typed DTOs.**

```ts
export interface RoleManagementOverview { roles: RbacRole[]; permissions: RbacPermission[]; users: RbacUser[]; total: number }
export const rbacService = { getOverview: async (query?: string) => { /* RPC + shape validation */ } }
```

- [ ] **Step 5: Re-run the focused service test and `pnpm tsc -b`.**

- [ ] **Step 6: Validate migration SQL through local Supabase and the linked dry run; commit the database contract.**

### Task 2: MFA-gated RBAC mutation Edge Function

**Files:**
- Create: `supabase/functions/manage-rbac/index.ts`
- Test: `src/features/admin/manageRbacSecurityContract.test.ts`

**Interfaces:**
- Consumes either `{ kind: 'role', action: 'grant' | 'revoke', targetUserId, roleCode, reason }` or `{ kind: 'permission', action: 'grant' | 'revoke', roleCode, permissionCode, reason }`.
- Produces `{ data: { changed: boolean } }`, `400` for invalid data, `403` without AAL2/active session/authority.

- [ ] **Step 1: Write the failing static security contract test.**

```ts
expect(source).toContain("rpc('is_mfa_verified')")
expect(source).toContain("rpc('is_admin_session_active'")
expect(source).toContain("rpc('manage_role_permission'")
```

- [ ] **Step 2: Run the test and verify it fails because the function is absent.**

Run: `pnpm vitest run src/features/admin/manageRbacSecurityContract.test.ts`

- [ ] **Step 3: Implement the Edge Function with a discriminated Zod schema.**

Validate the user from the bearer token, decode `session_id`, require AAL2 and active session for every mutation, require role assign/revoke for role operations, require `super_admin` for matrix operations, reject self-role changes, and invoke service-role-only RPCs. Return generic errors without role-enumeration detail.

- [ ] **Step 4: Re-run the focused test and deploy only `manage-rbac` after the migration is applied.**

- [ ] **Step 5: Commit the Edge Function and its contract test.**

### Task 3: Visual role assignment and permission matrix page

**Files:**
- Create: `src/pages/admin/AdminRolesPage.tsx`
- Create: `src/pages/admin/AdminRolesPage.test.tsx`
- Create: `src/services/supabase/rbac.service.ts`
- Modify: `src/app/routes.tsx`
- Modify: `src/components/admin/AdminSidebar.tsx`
- Modify: `src/components/admin/AdminLayout.tsx`

**Interfaces:**
- Consumes `rbacService.getOverview(query)` and `supabase.functions.invoke('manage-rbac', { body })`.
- Produces `/app/admin/roles` with user-role and permission-matrix tabs.

- [ ] **Step 1: Write failing page tests.**

```tsx
it('shows role badges from the overview and opens a visual assignment modal', async () => {
  render(<AdminRolesPage />)
  expect(await screen.findByText('Security administrator')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: /quản lý vai trò/i }))
  expect(screen.getByLabelText(/exam administrator/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the test and verify it fails because the page is absent.**

Run: `pnpm vitest run src/pages/admin/AdminRolesPage.test.tsx`

- [ ] **Step 3: Implement accessible visual controls.**

Render searchable users with translated role badges; use checkbox controls in a modal for assignment and a reason Input. Render permissions as rows and administrative roles as columns. Open ConfirmModal before calling the mutation. Disable own assignment, all matrix cells for `super_admin`, and matrix edits for non-super admins. Use Button for every visible action.

- [ ] **Step 4: Add protected lazy route, sidebar entry, and page title.**

Use `lazyWithChunkRecovery`; access remains through existing `AdminRoute`, while page actions enforce their own permissions.

- [ ] **Step 5: Re-run page tests, related sidebar tests, and `pnpm tsc -b`.**

- [ ] **Step 6: Commit the visual console.**

### Task 4: Immediate client permission refresh and production verification

**Files:**
- Modify: `src/hooks/usePermissions.ts`
- Create: `src/hooks/usePermissions.test.tsx`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes `permissionsService.getMyAuthorizationVersion(): Promise<number>`.
- Produces a permission hook which refreshes while the document is visible when the user authorization version changes.

- [ ] **Step 1: Write a failing hook test for a changed authorization version.**

```ts
it('reloads permissions when the authorization version changes', async () => {
  renderHook(() => usePermissions())
  await waitFor(() => expect(getMyPermissions).toHaveBeenCalledTimes(1))
  version.mockResolvedValueOnce(2)
  await advanceTimersByTimeAsync(5000)
  expect(getMyPermissions).toHaveBeenCalledTimes(2)
})
```

- [ ] **Step 2: Run it and verify it fails.**

Run: `pnpm vitest run src/hooks/usePermissions.test.tsx`

- [ ] **Step 3: Implement visible-tab polling at five seconds, with cleanup on logout/unmount.**

Only refetch permissions when the version differs; backend enforcement remains immediate on every protected request.

- [ ] **Step 4: Run focused tests, full type-check/build, lint, and available test suite.**

- [ ] **Step 5: Apply the migration to production, deploy `manage-rbac`, deploy the frontend, and execute authenticated role/matrix smoke checks with the approved admin account.**

- [ ] **Step 6: Update `CLAUDE.md`, run GitNexus change detection, and commit the refresh behavior/documentation.**

## Self-review

- Spec coverage: Tasks 1–2 implement database authority, MFA/admin-session enforcement, immutable super-admin matrix, audit and immediate server enforcement. Task 3 implements both visual tabs, confirmation/reason UI, and visual checkboxes. Task 4 implements active-client refresh and release verification.
- Placeholder scan: No TBD/TODO/similar-task placeholders remain.
- Type consistency: `RoleManagementOverview`, `rbacService`, `manage-rbac`, and authorization-version RPC names are defined before their consumers.
