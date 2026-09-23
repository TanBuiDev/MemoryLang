# Mission Learning UX Implementation Plan

> **For agentic workers:** Execute these checkpoints in order. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve Mission audio, answer control, hints, review, and compact icon controls without changing shared curriculum.

**Architecture:** Keep grading in `MissionGamePage`, persist additional attempt metadata in the existing local Mission record, and reuse `speak` plus the existing sound-effects engine. Keep deterministic question generation and Supabase progress schema unchanged.

**Tech Stack:** React, TypeScript, Vitest, Dexie, existing UI components.

---

## Chunk 1: Audio and Matching

### Task 1: Audio lifecycle

**Files:** `src/pages/games/MissionGamePage.tsx`, Mission tests.

- [x] Add a failing test for once-per-term playback and correct-answer reinforcement coordination.
- [x] Implement automatic Learn playback, one correct-answer replay for listening typing, and stop on transition.
- [x] Reuse the existing SFX engine for correct, incorrect, and completion cues; honor its mute setting.
- [x] Run Mission tests and `pnpm build`, review changes, commit.

### Task 2: Matching selections

**Files:** `src/features/games/mission/components/MissionMatchingStage.tsx`, `src/pages/games/MissionGamePage.tsx`, Mission tests.

- [x] Add a failing test for swapping two selected translations before grading.
- [x] Implement swap/clear behavior while preserving immutable post-check grading.
- [x] Run Mission tests and `pnpm build`, review changes, commit.

## Chunk 2: Hints and review

### Task 3: Progressive hints

**Files:** `src/features/games/mission/components/MissionQuestionStage.tsx`, `src/pages/games/MissionGamePage.tsx`, `src/features/games/mission/mission.types.ts`, Mission tests.

- [x] Add behavior tests for on-demand hint scoring, resume, and context translation availability.
- [x] Implement labelled hint and translation actions, persist hint state, and cap assisted scores.
- [x] Run Mission tests and `pnpm build`, review changes, commit.

### Task 4: Review answers

**Files:** Mission types, page, result view, new review view, Mission tests.

- [x] Add behavior tests that actual submissions and Matching choices survive grading and can be mapped to questions.
- [x] Show a read-only review from the result screen, including corrections and audio replay.
- [x] Keep review available in the active result view without changing remote progress schema. Cross-device or later-history review remains a separate feature.
- [x] Run Mission tests and `pnpm build`, review changes, commit.

### Task 5: Icon and final verification

**Files:** Mission presentation components and tests.

- [x] Use icon-only only for unambiguous audio/back controls with accessible names and touch targets; keep labels for grading, hints, review, and progression.
- [x] Verify Mission component behavior, build, lint, status and scope.
- [ ] Verify the authenticated Mission flow visually at desktop and mobile sizes when a local test login is available.
