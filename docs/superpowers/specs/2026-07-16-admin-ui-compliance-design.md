# Admin/UI Compliance Design

## Overview

This spec covers package 4 of the MVP rollout: bring admin-facing UI into compliance with MemoryLang's UI rules and remove browser-native interruption patterns from admin workflows.

The selected approach is **phased admin compliance**:

- Replace destructive browser confirms with `ConfirmModal`.
- Replace browser alerts with project toast or inline error UI.
- Replace native admin page `<select>/<option>` controls with the packaged `Select` component from `@/components/ui/select`.
- Add automated guard tests so regressions are caught before commit.

## Problem Statement

Admin pages currently mix project UI primitives with browser-native controls. This breaks the Neobrutalist design consistency and creates uneven UX for destructive actions, validation errors, success messages, and form controls.

Current scan results found violations in these areas:

- `window.confirm` in admin pages such as `AdminVocabularyPage`, `AdminStoragePage`, `AdminListeningPage`, and `AdminGrammarPage`.
- `alert` in admin pages such as `AdminTtsPage`, `AdminFeaturesPage`, `AdminListeningPage`, `AdminGrammarPage`, `AdminFunctionsPage`, `AdminStoragePage`, and `AdminVocabularyPage`.
- Direct native `<select>/<option>` in `AdminTtsPage`, `AdminListeningPage`, `AdminGrammarPage`, `AdminGrammarLessonEditPage`, and `AdminI18nPage`.

Project-level UI components already exist:

- `ConfirmModal` in `src/components/ui/confirm-modal.tsx`
- `Select` in `src/components/ui/select.tsx`
- `showToast` and `ToastContainer` in `src/components/ui/toast.tsx`

The work is mostly refactoring existing UI behavior without changing admin business logic.

## Goals

- Remove all direct `window.confirm`, `window.alert`, `alert`, `window.prompt`, and `prompt` usage from `src/pages/admin`.
- Remove all direct page-level native `<select>/<option>` usage from `src/pages/admin`.
- Use `ConfirmModal` for destructive or irreversible admin actions.
- Use `showToast` for non-blocking success/error feedback when no inline recovery UI is needed.
- Use inline error state for form validation or recoverable page-local failures that should remain visible.
- Use project `Select` component with `options: { value: string; label: string }[]`.
- Preserve existing admin behavior and data mutations.
- Add automated compliance checks so future admin pages do not reintroduce browser-native controls.
- Keep changes atomic and reviewable by page or closely related workflow.

## Non-Goals

- Do not redesign the entire admin information architecture.
- Do not change Supabase schemas, Edge Functions, payment logic, or subscription logic.
- Do not convert non-admin app pages in this package unless a shared admin component requires a tiny compatible change.
- Do not replace hidden native `<select>` inside `src/components/ui/select.tsx`; that implementation detail supports accessibility and testing.
- Do not refactor all admin data services or split large admin pages unless required for UI compliance.
- Do not introduce a third-party UI library.
- Do not implement package 1-3 payment/subscription/content work in this package.

## Current Code Context

Relevant UI primitives:

- `src/components/ui/confirm-modal.tsx`
  - Existing modal for confirmation flows.
  - Props include `open`, `title`, `description`, `confirmLabel`, `cancelLabel`, `variant`, `confirmDisabled`, `onConfirm`, and `onCancel`.
- `src/components/ui/select.tsx`
  - Project-styled select wrapper.
  - Consumes `value`, `onChange`, `options`, `placeholder`, `className`, `disabled`, and `id`.
  - Contains a hidden native select internally; this is allowed and should not be counted as a page-level violation.
- `src/components/ui/toast.tsx`
  - `showToast({ type, title, message, duration })` displays global toast feedback.

Primary admin targets:

- `src/pages/admin/AdminGrammarPage.tsx`
- `src/pages/admin/AdminListeningPage.tsx`
- `src/pages/admin/AdminTtsPage.tsx`
- `src/pages/admin/AdminStoragePage.tsx`
- `src/pages/admin/AdminVocabularyPage.tsx`
- `src/pages/admin/AdminFeaturesPage.tsx`
- `src/pages/admin/AdminFunctionsPage.tsx`
- `src/pages/admin/AdminGrammarLessonEditPage.tsx`
- `src/pages/admin/AdminI18nPage.tsx`

Known adjacent files that may appear in scans but are out of page-level scope:

- `src/components/ui/select.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/inline-editable-field.tsx`
- Non-admin pages and forms such as vocabulary add/edit flows.

## Detailed Design

### Confirmation Flows

Every destructive admin action must use `ConfirmModal`.

Examples of destructive actions:

- Delete global vocabulary from the system library.
- Clean orphaned storage files.
- Delete Listening topic/test/part.
- Delete Grammar topic/exercise.
- Disable or overwrite published/admin-managed content when the action cannot be safely undone.

Implementation pattern:

```tsx
const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

<ConfirmModal
  open={pendingDeleteId !== null}
  title="Xóa mục này?"
  description="Thao tác này không thể hoàn tác."
  confirmLabel="Xóa"
  cancelLabel="Hủy"
  variant="danger"
  onConfirm={() => {
    if (!pendingDeleteId) return
    void handleDelete(pendingDeleteId)
  }}
  onCancel={() => setPendingDeleteId(null)}
/>
```

The confirmed action must clear pending state in `finally` or after a successful mutation.

### Feedback And Error UI

Browser `alert` is replaced by one of two patterns:

1. `showToast` for short-lived success/error messages.
2. Inline form/page error state when the user needs to fix input or see persistent context.

Use toast for:

- Successful import/deploy/save operations.
- Storage cleanup result.
- Non-field-specific operation failures.
- Bulk action success/failure.

Use inline error for:

- Required field validation.
- Invalid JSON in expert edit mode.
- Page load failures where retry or correction is useful.
- Form-specific errors that should remain near the form.

Toast examples:

```ts
showToast({
  type: 'success',
  title: 'Đã lưu cấu hình',
  message: 'Cấu hình đã được cập nhật thành công.',
})
```

```ts
showToast({
  type: 'error',
  title: 'Không thể lưu',
  message: err instanceof Error ? err.message : 'Vui lòng thử lại.',
})
```

Validation example:

```tsx
const [formError, setFormError] = useState<string | null>(null)

if (!topicForm.title.trim()) {
  setFormError('Vui lòng nhập tiêu đề.')
  return
}

{formError ? (
  <div className="neo-card border-destructive bg-destructive/10 p-3 text-sm font-bold text-destructive">
    {formError}
  </div>
) : null}
```

### Select Controls

Admin pages must import and use the packaged `Select` component:

```tsx
import { Select } from '@/components/ui/select'

<Select
  value={topicForm.access_tier || 'free'}
  onChange={(value) => setTopicForm((prev) => ({ ...prev, access_tier: value as 'free' | 'pro' }))}
  options={[
    { value: 'free', label: 'Free (Miễn phí)' },
    { value: 'pro', label: 'Pro (Trả phí)' },
  ]}
  placeholder="Chọn quyền truy cập"
/>
```

The project `Select` uses a hidden native select internally for accessibility/testing. That is allowed. The compliance target is direct native markup in admin page files, not the implementation of shared UI primitives.

For numeric form values, convert explicitly:

```tsx
<Select
  value={String(partForm.part_number)}
  onChange={(value) => setPartForm((prev) => ({ ...prev, part_number: Number(value) as 1 | 2 | 3 | 4 }))}
  options={[
    { value: '1', label: 'Part 1' },
    { value: '2', label: 'Part 2' },
    { value: '3', label: 'Part 3' },
    { value: '4', label: 'Part 4' },
  ]}
/>
```

### Page Order

The implementation should proceed in risk order:

1. Shared compliance guard tests.
2. Smaller admin pages with simple dialogs/toasts:
   - `AdminVocabularyPage`
   - `AdminStoragePage`
   - `AdminFunctionsPage`
3. Configuration and TTS pages:
   - `AdminFeaturesPage`
   - `AdminTtsPage`
4. Content management pages:
   - `AdminGrammarPage`
   - `AdminListeningPage`
   - `AdminGrammarLessonEditPage`
5. Low-risk filter page:
   - `AdminI18nPage`

This order gets fast wins first while leaving the largest content-management pages for focused chunks.

### Automated Compliance Checks

Add a focused test file that scans admin page source text and fails on prohibited browser-native patterns.

Suggested file:

- `src/pages/admin/admin-ui-compliance.test.ts`

Checks:

- No `window.confirm(` or bare `confirm(` in `src/pages/admin/**/*.tsx`.
- No `window.alert(` or bare `alert(` in `src/pages/admin/**/*.tsx`.
- No `window.prompt(` or bare `prompt(` in `src/pages/admin/**/*.tsx`.
- No direct `<select` or `<option` markup in `src/pages/admin/**/*.tsx`.

The test must ignore:

- Shared UI primitive implementation files outside `src/pages/admin`.
- Text in comments only if comment stripping is simple and reliable. If comment stripping is not implemented, comments in admin pages should also avoid these banned strings.

This test is intentionally narrow. It is not a full lint replacement.

## UX Behavior

Admin users should experience:

- Confirmation modals that match project styling.
- Clear cancel/confirm labels in Vietnamese.
- No blocking browser-native popups.
- Success/failure feedback through toast or inline UI.
- Styled dropdowns consistent with the app.
- No behavior loss in existing CRUD, import, deploy, cleanup, TTS, grammar, listening, or i18n workflows.

Destructive modal copy should be specific:

- Mention the entity being deleted when possible.
- Explain cascade effects for topic/test deletion.
- Use danger variant for delete/cleanup actions.

Validation copy should be direct:

- `Vui lòng nhập tiêu đề.`
- `Dữ liệu JSON từ loại bị lỗi. Vui lòng kiểm tra lại.`
- `Mã từ loại này đã tồn tại.`

## Security And Safety Considerations

- Do not hide failed admin actions behind success toasts.
- Do not execute destructive actions before modal confirmation.
- Do not use `git add -A`; stage page chunks only.
- Keep existing Supabase service calls unchanged unless required by UI state flow.
- Preserve optimistic updates only where already present.
- If a mutation has optimistic UI, rollback behavior must still run on failure.
- Do not expose secrets or service-role keys.

## Edge Cases

- User cancels a confirmation modal: no mutation runs, pending state clears.
- Mutation fails after confirmation: modal closes or remains based on existing page behavior, but the user receives an error toast or inline error.
- Validation fails: no mutation runs, inline error appears near the relevant form.
- Select value is missing or stale: component shows placeholder or safe default matching current behavior.
- Numeric select values convert to numbers before saving.
- Bulk action with no selected rows: show inline or toast error, no mutation runs.
- Existing admin pages with loading states should keep those states.

## Testing Strategy

Automated tests:

- Add `admin-ui-compliance.test.ts` source scanner.
- Add targeted render/interaction tests only where a page's flow is risky enough to justify them:
  - `AdminStoragePage` cleanup confirmation.
  - `AdminVocabularyPage` delete confirmation.
  - One representative Select conversion test for numeric Listening part selection if practical.
- Keep existing page tests passing.

Verification commands:

```powershell
pnpm vitest run src/pages/admin/admin-ui-compliance.test.ts
pnpm tsc -b
pnpm test
```

Manual verification:

- Delete actions open `ConfirmModal`, cancel works, confirm runs mutation.
- Success/error messages display as toast or inline error.
- All admin dropdowns render project `Select`, not native browser controls.
- Grammar and Listening admin forms still save `access_tier`, `teaser_config`, difficulty, part number, and correct answer values correctly.
- TTS config and batch controls still save/generate correctly.

## Rollout Plan

1. Add compliance scanner test and confirm it fails on current admin code.
2. Refactor small admin pages to `ConfirmModal`/toast and commit.
3. Refactor `AdminFeaturesPage` and `AdminTtsPage` controls/feedback and commit.
4. Refactor `AdminGrammarPage` controls/feedback/destructive actions and commit.
5. Refactor `AdminListeningPage` controls/feedback/destructive actions and commit.
6. Refactor `AdminGrammarLessonEditPage` and `AdminI18nPage` selects and commit.
7. Run compliance scanner, targeted tests, `pnpm tsc -b`, and `pnpm test`.
8. Update `CLAUDE.md` only if a new admin UI convention is learned that is not already documented.
9. After package 4 is implemented and verified, run final cross-package audit for packages 1-4.

## Rollback Plan

- If a page refactor breaks admin workflows, revert that page's atomic commit.
- Keep the compliance test in place only when all admin pages have been migrated; if rollback reintroduces violations, revert the matching test commit too.
- Do not revert unrelated package 1-3 payment/subscription/content commits.

## Continuation Plan After Spec 4

After this spec is reviewed and approved:

1. Create and commit an implementation plan for **Admin/UI Compliance**.
2. Implement the plan task-by-task with tests first.
3. Commit each logical page or workflow chunk separately.
4. Run final cross-package audit for:
   - Payment hardening.
   - Subscription enforcement.
   - Content gating.
   - Admin/UI compliance.
5. Record any production deployment blockers, especially unapplied Supabase migrations.
