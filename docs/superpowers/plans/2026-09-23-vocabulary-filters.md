# Vocabulary Filters Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make vocabulary filtering clear, deck-first, accessible, and consistent with review eligibility.

**Architecture:** Keep URL-backed filter state in `VocabularyListPage`. Add a vocabulary-specific deck picker rather than changing the shared `Select` used throughout the app. Keep advanced filters in `FilterModal`; show active conditions as individually removable chips and distinguish filtered-out search matches from truly absent terms.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vitest, Testing Library.

---

## Chunk 1: Deck-first controls

### Task 1: Searchable deck picker

**Files:** Create `src/components/vocabulary/DeckFilterPicker.tsx`; create `src/components/vocabulary/DeckFilterPicker.test.tsx`; modify `src/pages/vocabulary/VocabularyListPage.tsx`.

- [x] Write failing integration tests for toolbar deck selection and parent/child filtering, then a failing test for accent-insensitive deck search.
- [x] Run the focused tests and confirm the expected failures.
- [x] Implement a searchable single-choice picker using the shared `Button` and `Input` components. Keep “Tất cả bộ thẻ” as its default.
- [x] Put the picker alongside search/filter/sort and preserve other conditions when the deck changes.
- [x] Rerun focused tests and confirm they pass; cover Escape and “Chưa có bộ thẻ”.

## Chunk 2: Active conditions and review semantics

### Task 2: Visible, removable conditions

**Files:** Modify `src/pages/vocabulary/VocabularyListPage.tsx`; modify `src/pages/vocabulary/VocabularyListPage.test.tsx`.

- [x] Write failing tests for a filter count, individually removable chips, and preservation of unrelated conditions.
- [x] Run the page tests and confirm the expected failures.
- [x] Replace the concatenated text summary with wrapping chips and a clear-all action; show the active count on the filter button.
- [x] Run tests and confirm they pass.

### Task 3: Correct review and empty-result behavior

**Files:** Modify `src/pages/vocabulary/VocabularyListPage.tsx`; modify `src/pages/vocabulary/VocabularyListPage.test.tsx`.

- [x] Write failing tests for due-date-based quick review, search matches hidden by filters, and recovery actions.
- [x] Run the page tests and confirm the expected failures.
- [x] Align quick review with `next_review_at`, preserve the existing status option as an advanced status, and distinguish “filtered out” from “not in vocabulary”.
- [x] Run tests and confirm they pass.

## Chunk 3: Advanced filter polish and verification

### Task 4: Compact advanced filters

**Files:** Modify `src/components/vocabulary/FilterModal.tsx`; modify `src/components/vocabulary/FilterModal.test.tsx`; update `src/i18n/index.ts` as needed.

- [x] Write failing tests for the revised labels, reset scope, and live result count.
- [x] Run the modal tests and confirm the expected failures.
- [x] Group learner-facing conditions, keep deck selection in the primary toolbar, and show a live result count when available.
- [x] Run tests and confirm they pass.

### Task 5: Verify and commit

- [x] Run focused tests, relevant lint, and `pnpm build` synchronously to exit code 0 after final edits.
- [x] Inspect `git status` and each changed-file diff; run `gitnexus_detect_changes()`; check for secrets.
- [x] Commit the related filter redesign files with a conventional English message. Do not push.

The full Vitest run recorded 660 passes and 6 failures in reading-content and admin-security tests outside this feature. The 48 Node script tests passed separately.
