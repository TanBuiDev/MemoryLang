# Study Hotkey Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persisted, user-configurable keyboard shortcuts for every flashcard study action through a Settings form.

**Architecture:** Keep canonical shortcut parsing and defaults in a focused study hotkey module. Store the selected mapping in the existing local study preferences store, render a capture-and-validation form in Settings, and route matching key events through the existing FlashcardStudyPage action handlers so SRS behavior is unchanged.

**Tech Stack:** React 19, TypeScript, Zustand, Testing Library, Vitest, Tailwind CSS

---

### Task 1: Hotkey Model And Persistence

**Files:**
- Create: `src/features/study/studyHotkeys.ts`
- Modify: `src/stores/useStudyStore.ts`
- Test: `src/stores/useStudyStore.test.ts`

- [ ] **Step 1: Write failing tests for defaults and persisted mappings**

Assert that the study store exposes the default mapping and persists a custom `confirmRemember: 'R'` value alongside confirmation preferences.

- [ ] **Step 2: Run the store test to verify failure**

Run: `pnpm exec vitest run src/stores/useStudyStore.test.ts`

Expected: FAIL because `hotkeys` and `setHotkeys` are not available.

- [ ] **Step 3: Add canonical hotkey helpers and store integration**

Create typed action/default mapping plus event canonicalization/display/conflict helpers. Extend stored study preferences and its setter to preserve valid hotkeys and fall back to defaults for legacy data.

- [ ] **Step 4: Run the store test to verify green**

Run: `pnpm exec vitest run src/stores/useStudyStore.test.ts`

Expected: PASS.

### Task 2: Settings Capture Form

**Files:**
- Create: `src/pages/settings/SettingsPage.test.tsx`
- Modify: `src/pages/settings/SettingsPage.tsx`
- Modify: `src/i18n/index.ts`

- [ ] **Step 1: Write failing UI tests**

Render Settings, capture a shortcut on the `Confirm remembered` row, create a duplicate assignment, verify the duplicate warning disables save, then clear/reset the assignments.

- [ ] **Step 2: Run the Settings test to verify failure**

Run: `pnpm exec vitest run src/pages/settings/SettingsPage.test.tsx`

Expected: FAIL because the hotkey card does not exist.

- [ ] **Step 3: Implement the settings card**

Add localized labels, draft hotkey state, capture buttons using `onKeyDown`, inline duplicate validation, clear controls, reset defaults, and persist through the existing save action.

- [ ] **Step 4: Run the Settings test to verify green**

Run: `pnpm exec vitest run src/pages/settings/SettingsPage.test.tsx`

Expected: PASS.

### Task 3: Flashcard Keyboard Execution

**Files:**
- Modify: `src/pages/study/FlashcardStudyPage.tsx`
- Modify: `src/pages/study/FlashcardStudyPage.test.tsx`

- [ ] **Step 1: Write failing interaction tests**

Test that a configured shortcut confirms `Đã nhớ`, rating/navigation shortcuts invoke existing flows, and key events in editable fields or while the completion modal is open are ignored.

- [ ] **Step 2: Run the flashcard tests to verify failure**

Run: `pnpm exec vitest run src/pages/study/FlashcardStudyPage.test.tsx`

Expected: FAIL because no global hotkey handling or shortcut hint exists.

- [ ] **Step 3: Implement keyboard dispatch**

Read `hotkeys` from the store, install a guarded `keydown` listener, dispatch only currently valid actions through existing page functions, and render the configured shortcut hint inside the remember-confirmation overlay.

- [ ] **Step 4: Run flashcard tests to verify green**

Run: `pnpm exec vitest run src/pages/study/FlashcardStudyPage.test.tsx`

Expected: PASS.

### Task 4: Documentation And Verification

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update project context**

Document that study hotkeys are local user preferences configured from Settings and executed only in eligible flashcard interactions.

- [ ] **Step 2: Run full verification**

Run: `pnpm test`, `pnpm lint`, `pnpm build`, and `git diff --check`.

Expected: tests, lint, and build pass; whitespace check reports no errors.

