# Study Remember Confirmation Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional timed `Đã nhớ` overlay that records `know` on click and defaults to `dont_know` on timeout before a study card advances.

**Architecture:** Store the overlay preference locally in the study store, freeze it plus provisional per-term ratings in each persisted session snapshot, and route forward/auto-play transitions through a single confirmation gate in `FlashcardStudyPage`. Populate and flush the existing local-first SRS batch queue only when a fully traversed session is explicitly completed; discarding an incomplete session clears its provisional snapshot without SRS writes.

**Tech Stack:** React 19, TypeScript, Zustand, sessionStorage/localStorage, Vitest and Testing Library, Tailwind CSS.

---

### Task 1: Persist Confirmation Preferences

**Files:**
- Modify: `src/stores/useStudyStore.ts`
- Test: `src/stores/useStudyStore.test.ts`
- Modify: `src/pages/study/StudySetupPage.tsx`
- Modify: `src/pages/study/StudySetupPage.test.tsx`
- Modify: `src/i18n/index.ts`

- [ ] **Step 1: Write failing store and setup tests**

Add tests that expect `requireRememberConfirmation` and `rememberConfirmationSeconds` to be configurable, saved to browser storage, and rendered as a checkbox plus seconds selector in the setup form.

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm exec vitest run src/stores/useStudyStore.test.ts src/pages/study/StudySetupPage.test.tsx`

Expected: FAIL because the preference fields and setup controls do not exist.

- [ ] **Step 3: Implement preference storage and setup controls**

Extend `useStudyStore` with:

```ts
type RememberConfirmationSeconds = 1 | 2 | 3 | 5
requireRememberConfirmation: boolean
rememberConfirmationSeconds: RememberConfirmationSeconds
setRequireRememberConfirmation: (enabled: boolean) => void
setRememberConfirmationSeconds: (seconds: RememberConfirmationSeconds) => void
```

Persist only these preference values in `localStorage`, add the setup checkbox/select, and add Vietnamese/English labels.

- [ ] **Step 4: Run tests to verify pass**

Run: `pnpm exec vitest run src/stores/useStudyStore.test.ts src/pages/study/StudySetupPage.test.tsx`

Expected: PASS.

### Task 2: Persist Session Confirmation State

**Files:**
- Modify: `src/features/study/sessionPersistence.ts`
- Test: `src/features/study/sessionPersistence.test.ts`
- Modify: `src/pages/study/FlashcardStudyPage.tsx`

- [ ] **Step 1: Write failing persistence tests**

Add tests that read legacy stored sessions with confirmation disabled defaults and round-trip new fields:

```ts
requireRememberConfirmation: true
rememberConfirmationSeconds: 2
ratingsByTermId: { produce: 'know' }
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm exec vitest run src/features/study/sessionPersistence.test.ts`

Expected: FAIL because stored sessions do not expose confirmation or rating fields.

- [ ] **Step 3: Implement backward-compatible snapshot fields**

Extend `StoredStudySession` with confirmation settings and `ratingsByTermId`, default absent legacy values safely, and include the new fields whenever `FlashcardStudyPage` creates or rewrites its session snapshot.

- [ ] **Step 4: Run test to verify pass**

Run: `pnpm exec vitest run src/features/study/sessionPersistence.test.ts`

Expected: PASS.

### Task 3: Gate Study Advances With The Overlay

**Files:**
- Modify: `src/pages/study/FlashcardStudyPage.tsx`
- Modify: `src/pages/study/FlashcardStudyPage.test.tsx`
- Modify: `src/index.css`
- Modify: `src/i18n/index.ts`

- [ ] **Step 1: Write failing overlay behavior tests**

Add tests that enable confirmation mode and assert:

```ts
// Clicking Next holds on the current card and opens "Đã nhớ".
// Clicking "Đã nhớ" queues action "know" and advances.
// Letting the confirmation countdown expire queues "dont_know" and advances.
// Returning to an already rated card does not open the overlay again.
// Existing remember/forgot toolbar buttons are absent in confirmation mode.
// Auto-play enters confirmation instead of immediately advancing.
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm exec vitest run src/pages/study/FlashcardStudyPage.test.tsx`

Expected: FAIL because no overlay or confirmation gate is implemented.

- [ ] **Step 3: Implement overlay and a single transition gate**

Introduce confirmation phase state and route both the next button and auto-advance through it. Render an accessible centered button with countdown, resolve outcomes through the existing `record()` action path, save rating state in the session snapshot, and hide rating toolbar buttons while confirmation mode is active.

- [ ] **Step 4: Run tests to verify pass**

Run: `pnpm exec vitest run src/pages/study/FlashcardStudyPage.test.tsx`

Expected: PASS.

### Task 4: Verification And Documentation

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update project context**

Document the optional confirmation overlay, persisted preference, session-frozen rating state, and no-extra-RPC design in `CLAUDE.md`.

- [ ] **Step 2: Run complete verification**

Run:

```bash
pnpm test
pnpm lint
pnpm build
```

Expected: all commands exit successfully; any existing non-blocking Vite bundle warning is reported accurately.

### Task 5: Defer SRS Commits Until Session Completion

**Files:**
- Modify: `src/features/study/sessionPersistence.ts`
- Modify: `src/features/study/sessionPersistence.test.ts`
- Modify: `src/pages/study/FlashcardStudyPage.tsx`
- Modify: `src/pages/study/FlashcardStudyPage.test.tsx`
- Modify: `src/i18n/index.ts`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Write failing persistence and page behavior tests**

Add assertions for snapshot round trips of:

```ts
hasReachedLastCard: true
reviewActionsByTermId: {
  produce: {
    termId: 'produce',
    action: 'know',
    reviewedAt: expect.any(String),
    result: expect.any(Object),
  },
}
```

Add page tests proving:

```ts
// Rating before completion does not call studyLocalDb.addPendingReviewAction().
// Confirming an early exit does not flush actions/views/summary and shows the discard warning.
// Reaching the last card changes completion controls and completion confirm enqueues and flushes provisional actions.
// Returning to an earlier card after reaching the last card keeps the top action as completion.
// Auto-play opens completion confirmation rather than silently finishing.
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm exec vitest run src/features/study/sessionPersistence.test.ts src/pages/study/FlashcardStudyPage.test.tsx`

Expected: FAIL because SRS actions are currently enqueued during rating and session completion state is not persisted.

- [ ] **Step 3: Persist provisional actions and completion eligibility**

Extend `StoredStudySession` with backward-compatible defaults for:

```ts
hasReachedLastCard: boolean
reviewActionsByTermId: Record<string, StoredReviewAction>
```

Store ratings and serialized review actions in the active snapshot while studying. Mark `hasReachedLastCard` when the last card is displayed and persist it through reloads.

- [ ] **Step 4: Implement completion-only commit flow and modal states**

Update `FlashcardStudyPage` so `record()` mutates only the active snapshot. Add:

```ts
discardIncompleteSession()
completeSession()
openCompletionOrDiscardModal()
```

`completeSession()` must enqueue provisional actions and viewed IDs before flushing the existing batch flow. `discardIncompleteSession()` must clear the active snapshot without adding actions, views, or summary. Change the top card action and last-card right action to `Hoàn thành` after completion eligibility; auto-play must stop and open completion confirmation.

Render an accessible encouraging sad-state block inside the discard modal, using text plus a decorative visual marker; do not rely on color alone.

- [ ] **Step 5: Run targeted tests to verify pass**

Run: `pnpm exec vitest run src/features/study/sessionPersistence.test.ts src/pages/study/FlashcardStudyPage.test.tsx`

Expected: PASS.

- [ ] **Step 6: Document and verify**

Update `CLAUDE.md` with completion-only SRS commit semantics, then run:

```bash
pnpm test
pnpm lint
pnpm build
```

Expected: all commands exit successfully; report the existing Vite bundle-size warning if it remains.
