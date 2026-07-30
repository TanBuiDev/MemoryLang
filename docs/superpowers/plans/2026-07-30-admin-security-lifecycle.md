# Admin Security Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce and operate the approved Google OAuth + TOTP lifecycle for administrative accounts.

**Architecture:** Database migrations add pending/active grants, privileged-session and private security-event data with guarded RPCs. Edge Functions enforce server-side assurance, emit events and dispatch Resend transactional mail. The React app shows setup state and controlled recovery actions.

**Tech Stack:** React 19, TypeScript, Vitest, Supabase PostgreSQL/Auth/Edge Functions, Resend.

## Global Constraints

- Preserve existing learner password login; deny only effective administrative access to password-only sessions.
- Do not store secrets, raw IP addresses, MFA material, or API keys in Git or client code.
- All administrative writes require AAL2 and guarded server-side authorization.
- Security notices use `RESEND_API_KEY` and `RESEND_SENDER_EMAIL`, and do not include unsubscribe headers.
- Use migrations created through the Supabase CLI and verify against the linked production project before deployment.

---

### Task 1: Model pending administrative grants and private security events

**Files:**
- Create: `supabase/migrations/<generated>_add_admin_security_lifecycle.sql`
- Test: `src/features/auth/adminSecurityLifecycleMigrationContract.test.ts`

- [ ] Write failing contract tests for required tables, active-grant-only permission behavior, existing-account validation and protected RPC grants.
- [ ] Run the contract test and confirm it fails because the migration does not exist.
- [ ] Create a CLI-generated migration with RLS-enabled private tables, indexes, retention-safe fields, activation RPCs and service-role-only event/outbox writers.
- [ ] Run the contract test and linked SQL verification.
- [ ] Commit the migration and its contract test.

### Task 2: Enforce privileged session creation and MFA recovery in Edge Functions

**Files:**
- Modify: `supabase/functions/manage-rbac/index.ts`
- Modify: `supabase/functions/send-email/index.ts`
- Create: `supabase/functions/admin-security/index.ts`
- Test: `src/features/admin/adminSecurityFunctionContract.test.ts`

- [ ] Write failing contracts for AAL2 enforcement, Google-identity prerequisite, self-reset denial, recipient calculation and security-email headers.
- [ ] Run the contract test and confirm it fails.
- [ ] Implement guarded actions and an outbox dispatcher without exposing privileged endpoints to browsers.
- [ ] Run contract tests and function lint/type checks.
- [ ] Commit the Edge Function implementation and tests.

### Task 3: Require the lifecycle in frontend route and account setup flows

**Files:**
- Modify: `src/app/ProtectedRoute.tsx`
- Modify: `src/hooks/useMfaChallenge.ts`
- Modify: `src/pages/public/LoginPage.tsx`
- Modify: `src/pages/SettingsPage.tsx`
- Create: `src/features/auth/adminSecurityLifecycle.ts`
- Test: `src/features/auth/adminSecurityLifecycle.test.ts`

- [ ] Write failing unit tests for password-only admin denial, prerequisite routing and Google-link setup state.
- [ ] Run tests and confirm failure.
- [ ] Implement minimal shared lifecycle state and route behavior using existing UI components.
- [ ] Run unit tests, route tests and `pnpm tsc -b`.
- [ ] Commit the frontend lifecycle enforcement and tests.

### Task 4: Add role-console statuses and MFA reset UX

**Files:**
- Modify: `src/pages/admin/AdminRolesPage.tsx`
- Modify: `src/services/supabase/admin.service.ts`
- Modify: `src/types/auth.types.ts`
- Test: `src/pages/admin/AdminRolesPage.test.tsx`

- [ ] Write failing tests for existing-user-only selection, pending/active indicators, AAL2 reset visibility and self-reset exclusion.
- [ ] Run tests and confirm failure.
- [ ] Implement accessible controls with `ConfirmModal` and shared `Button`; do not expose reset capability to the subject user.
- [ ] Run targeted tests and `pnpm tsc -b`.
- [ ] Commit the role-console changes and tests.

### Task 5: Deploy and verify production behavior

**Files:**
- Modify: `CLAUDE.md`

- [ ] Run complete test suite, type-check, build, migration dry-run gate and GitNexus changed-symbol analysis.
- [ ] Apply the linked migration and deploy only the changed Edge Functions.
- [ ] Verify production secrets by name, send one test-only security message, and inspect delivery logs without exposing recipient data.
- [ ] Verify pending admin, active AAL2 admin, password-only denial, recipient deduplication and MFA-reset audit paths with the provided staging accounts.
- [ ] Document the deployed operations and commit documentation.
