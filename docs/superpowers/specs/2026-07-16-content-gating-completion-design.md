# MVP Content Gating Completion Design

## Overview

This spec covers package 3 of the subscription rollout: complete Free/Pro content gating for Grammar and Listening so Free users cannot bypass Pro locks by opening deep app URLs directly.

The selected MVP approach is **Hybrid**:

- Topic list pages keep teaser/lock UX for discovery and upsell.
- Direct routes to Pro content are blocked before rendering or fetching full lesson/session payloads.

Package 3 depends on package 2, **MVP Subscription Enforcement**, because route guards should use the same reliable Pro state from `useSubscriptionStore` and the same subscription validity rule.

## Problem Statement

MemoryLang already has `access_tier` and `teaser_config` on `grammar_topics` and `listening_topics`, plus `ContentLockOverlay` and `ContentLockModal`. The current gating is incomplete:

- Grammar and Listening topic list cards show a lock overlay for Pro content, but deep routes are still directly addressable.
- `GrammarLessonPage` fetches topic data, lesson blocks, renders blocks, and increments view count without checking `access_tier`.
- Listening direct routes can move from topic to tests, parts, and sessions by URL even when the parent topic is Pro.
- `ListeningSessionPage` fetches part audio, transcript, and questions by `partId` without first verifying whether the parent topic is Pro.
- Teaser copy exists in the modal, but teaser behavior is not clearly separated from protected content rendering.

The result is that UI-level locks are helpful but not enough to prevent URL bypass.

## Goals

- Keep Pro topic cards visible in Grammar and Listening list pages so Free users can discover locked content.
- Preserve the current lock overlay/modal behavior on list pages.
- Block Free users from accessing Pro content through direct routes:
  - `/app/grammar/:topicId`
  - `/app/listening/:topicId`
  - `/app/listening/:topicId/:testId`
  - `/app/listening/session/:partId/:mode`
- Ensure blocked direct routes render a lock/upgrade screen instead of the real lesson/session content.
- Ensure blocked direct routes do not fetch or render protected payloads:
  - Grammar `lesson_blocks`
  - Listening tests/parts where possible after topic metadata is known
  - Listening part audio/transcript/questions
- Ensure blocked Grammar routes do not increment view count.
- Preserve demo/offline behavior.
- Add targeted tests for route bypass prevention.

## Non-Goals

- Do not implement package 4 Admin/UI Compliance.
- Do not redesign the subscription purchase flow or pricing UI.
- Do not change payment, webhook, subscription period, or quota logic.
- Do not build full teaser playback/content previews inside direct routes for this MVP.
- Do not hide Pro topics entirely from Free users on list pages.
- Do not introduce new plan types, trials, promo codes, or analytics.
- Do not refactor all Grammar/Listening data models beyond what route gating needs.

## Current Code Context

Relevant files:

- `src/components/subscription/ContentLockOverlay.tsx`
  - Wraps list cards and opens lock modal for Free users.
- `src/components/subscription/ContentLockModal.tsx`
  - Shows teaser hint and upgrade CTA.
- `src/pages/grammar/GrammarPage.tsx`
  - Lists grammar topics and already wraps each topic with `ContentLockOverlay`.
- `src/pages/grammar/GrammarLessonPage.tsx`
  - Fetches a grammar topic and `lesson_blocks`; currently does not guard Pro direct routes.
- `src/pages/listening/TopicSelectionPage.tsx`
  - Lists listening topics and already wraps each topic with `ContentLockOverlay`.
- `src/pages/listening/TestSelectionPage.tsx`
  - Fetches tests by `topicId`; currently does not guard Pro topics.
- `src/pages/listening/PartSelectionPage.tsx`
  - Fetches parts by `testId`; currently does not verify the parent topic tier.
- `src/pages/listening/ListeningSessionPage.tsx`
  - Fetches a part and embedded questions by `partId`; currently does not verify the parent topic tier.
- `src/services/supabase/grammar.service.ts`
  - `listTopics()`, `getTopic()`, `getBlocks()`, `incrementViewCount()`.
- `src/services/supabase/listening.service.ts`
  - `listTopics()`, `listTests()`, `listParts()`, `getPartWithQuestions()`.
- `src/stores/useSubscriptionStore.ts`
  - Provides `isPro`; package 2 should make this period-aware.
- `src/types/subscription.types.ts`
  - Defines `AccessTier` and `TeaserConfig`.
- `supabase/migrations/20260715000001_add_content_gating.sql`
  - Adds `access_tier` and `teaser_config` to Grammar/Listening topics.

## Detailed Design

### Shared Access Decision

Create a small shared helper for app-level content access.

Suggested file:

- `src/utils/contentAccess.ts`

Exports:

- `canAccessContent(accessTier: AccessTier | null | undefined, isPro: boolean): boolean`
- `isProContent(accessTier: AccessTier | null | undefined): boolean`

Rules:

- Missing `access_tier` is treated as `free` for backward compatibility.
- `free` content is accessible to everyone who can reach protected app routes.
- `pro` content is accessible only when `useSubscriptionStore().isPro === true`.
- The helper must not read stores directly; callers pass `isPro` in, which keeps it pure and easy to test.

Package 2 should make `isPro` reliable by checking `current_period_end`. If package 2 has not been implemented yet, package 3 should not weaken the design; it should still call the store and rely on package 2 to correct the underlying rule.

### Direct Route Lock Screen

Create or reuse a full-page lock state for blocked routes.

Suggested file:

- `src/components/subscription/ContentLockState.tsx`

Behavior:

- Shows the locked title when available.
- Shows content type-specific copy for Grammar or Listening.
- Shows teaser hint from `teaser_config`, but does not render actual lesson blocks, audio, transcript, questions, tests, or parts.
- Has CTA to `/app/upgrade`.
- Has secondary action back to `/app/grammar` or `/app/listening`.
- Uses project UI components and Neobrutalist styling.
- Does not use `window.alert`, `window.confirm`, or native browser dialogs.

`ContentLockModal` remains for list-card interactions. `ContentLockState` handles full-page direct-route blocks.

### Grammar Gating

`GrammarPage`:

- Keep current list-card overlay behavior.
- Continue showing Pro topics in the list.
- Prefer listing only metadata needed for cards. Do not fetch `explanation`, `examples`, or `lesson_blocks` just to render topic cards.

`GrammarLessonPage`:

1. Fetch topic metadata first.
2. If topic is missing, show the existing not-found behavior.
3. If topic is Pro and user is Free:
   - Render `ContentLockState`.
   - Do not call `grammarService.getBlocks(topicId)`.
   - Do not call `grammarService.incrementViewCount(topic.id)`.
4. If topic is Free or user is Pro:
   - Fetch and render `lesson_blocks`.
   - Increment view count once, as current behavior does.

The implementation should avoid starting the `getBlocks()` React Query before access is known. Use `enabled` with `canAccessContent(topic?.access_tier, isPro)`.

### Listening Gating

Listening access is topic-based. Tests, parts, audio, transcripts, and questions inherit the parent topic's `access_tier`.

Add service helpers that fetch only enough metadata to decide access:

- `listeningService.getTopic(topicId)`
- `listeningService.getTopicByTestId(testId)`
- `listeningService.getTopicByPartId(partId)`

These helpers should return:

- topic id
- title
- access tier
- teaser config
- published status if available

They should not return audio, transcript, or questions.

`TopicSelectionPage`:

- Keep current list-card overlay behavior.
- Continue showing Pro topics in the list.

`TestSelectionPage` for `/app/listening/:topicId`:

1. Fetch topic metadata first.
2. If topic is Pro and user is Free:
   - Render `ContentLockState`.
   - Do not call `listeningService.listTests(topicId)`.
3. If topic is Free or user is Pro:
   - Fetch and render tests as current behavior does.

`PartSelectionPage` for `/app/listening/:topicId/:testId`:

1. Fetch parent topic metadata by `testId`.
2. If parent topic is Pro and user is Free:
   - Render `ContentLockState`.
   - Do not call `listeningService.listParts(testId)`.
3. If parent topic is Free or user is Pro:
   - Fetch and render parts as current behavior does.

`ListeningSessionPage` for `/app/listening/session/:partId/:mode`:

1. Fetch parent topic metadata by `partId`.
2. If parent topic is Pro and user is Free:
   - Render `ContentLockState`.
   - Do not call `listeningService.getPartWithQuestions(partId)`.
   - Do not render `AudioPlayer`, transcript, or questions.
3. If parent topic is Free or user is Pro:
   - Fetch part details and questions as current behavior does.

Demo IDs such as `ets2026`, `ets2026-test1`, or demo part ids should continue using demo data and should not be locked.

### Teaser Behavior

For this MVP, teaser behavior is intentionally modest:

- Teaser configuration affects list/modal copy and lock-state hints.
- Teaser does not grant direct-route access to real Pro lesson/session payloads.
- `title_only` shows only topic title and upgrade CTA.
- `theory_only`, `partial_exercise`, `audio_preview`, and `transcript_preview` can be displayed as labels/hints, but do not render actual protected blocks/audio/transcript/questions in package 3.

This avoids partial leakage and keeps package 3 focused on closing URL bypass.

### Database/RLS Hardening Boundary

The route guard is required for package 3. Database hardening is strongly recommended when implementing this package, especially for protected payload tables:

- `lesson_blocks`
- `listening_tests`
- `listening_parts`

Current RLS policies allow viewing published child rows when the parent topic is published. That is not enough for adversarial direct Supabase API access.

If package 2 has created `public.is_user_pro(p_user_id uuid)`, update child table read policies so:

- Published Free topic children are readable by authenticated users.
- Published Pro topic children are readable only when `public.is_user_pro(auth.uid())` is true.
- Admin manage policies remain unchanged.

Keep topic metadata readable so Free users can still see Pro topic cards and teaser/upgrade prompts.

If package 2's DB helper is not available when package 3 starts, do not block package 3 on database hardening. Ship the app-route guard first, and explicitly record in the final implementation notes that the shipped package blocks app URL bypass but does not fully prevent direct Supabase REST reads by a malicious client. Create the RLS hardening as a follow-up item before production rollout.

## UX Behavior

Free user:

- Can see Free and Pro topic cards.
- Clicking a Pro card opens the lock modal.
- Opening a Pro direct route shows the full-page lock state.
- Cannot see actual Grammar blocks, Listening tests/parts, audio, transcript, or questions through app routes.

Pro user:

- Can see and open all Free and Pro content.
- Does not see lock overlays blocking content.

Demo/offline mode:

- Uses demo data and remains accessible.
- Does not call subscription/content gate RPCs.
- Does not show upgrade blocks for demo content.

Loading states:

- Route pages can show loading while fetching metadata.
- Protected payload fetches should wait until metadata and access decision are known.

Not-found states:

- Missing or unpublished content should show not found or return to list.
- Do not show upgrade prompt for missing content unless metadata confirms it is a Pro topic.

## Security Considerations

- UI locks alone are not a complete authorization boundary.
- App route guards must avoid fetching protected payloads before access is checked.
- If DB/RLS hardening is included, do not broaden existing admin policies.
- Do not expose service-role keys to the client.
- Do not rely on topic IDs or route params as proof of access.
- Pro status must come from package 2's period-aware subscription state.
- Do not increment view counts for blocked Pro content because that would count failed access as learning activity.

## Edge Cases

- Missing `access_tier`: treat as Free.
- Missing `teaser_config`: use safe default hints.
- Expired Pro subscription: treated as Free after package 2.
- Pro topic opened from an old bookmarked URL by Free user: show lock state.
- Free topic opened directly: allow.
- Demo/offline Listening routes: allow demo content.
- Listening session opened with a part ID whose parent test/topic cannot be resolved: show not found, not upgrade.
- Admin user who is not Pro: normal app route access follows subscription gating. Admin editing routes remain under `/app/admin` and are out of package 3 scope.

## Testing Strategy

Automated tests should cover:

- `canAccessContent()`:
  - Free tier is accessible.
  - Missing tier is accessible.
  - Pro tier is blocked for Free users.
  - Pro tier is accessible for Pro users.
- `GrammarLessonPage`:
  - Free user opening Pro topic sees lock state.
  - Free user opening Pro topic does not call `getBlocks()`.
  - Free user opening Pro topic does not call `incrementViewCount()`.
  - Pro user opening Pro topic renders blocks.
  - Free user opening Free topic renders blocks.
- `TestSelectionPage`:
  - Free user opening Pro topic by URL sees lock state and does not call `listTests()`.
  - Pro user opening Pro topic sees tests.
- `PartSelectionPage`:
  - Free user opening a test under a Pro topic sees lock state and does not call `listParts()`.
- `ListeningSessionPage`:
  - Free user opening a part under a Pro topic sees lock state.
  - Free user opening a Pro part does not call `getPartWithQuestions()`.
  - Free user does not render `AudioPlayer` for blocked Pro part.
  - Pro user can render Pro part/session.
- Demo/offline:
  - Demo Listening routes still render demo data without upgrade lock.

Verification commands:

- `pnpm vitest run <targeted tests>`
- `pnpm tsc -b`
- `pnpm test` when practical

Manual verification:

- Mark one Grammar topic as Pro and open `/app/grammar/:topicId` as Free.
- Mark one Listening topic as Pro and open:
  - `/app/listening/:topicId`
  - `/app/listening/:topicId/:testId`
  - `/app/listening/session/:partId/test`
- Confirm all show lock state and no protected content.
- Repeat as Pro and confirm content opens.
- Turn off Supabase env/demo mode and confirm demo content still opens.

## Rollout Plan

1. Complete package 2 first so `isPro` is reliable.
2. Add shared content access helper and tests.
3. Add full-page lock state component.
4. Update Grammar direct route gating.
5. Add Listening metadata helpers and route gating.
6. Add targeted tests for bypass prevention.
7. Add DB/RLS hardening for protected payload tables if package 2's `public.is_user_pro()` helper is available; otherwise record it as a follow-up before production rollout.
8. Run type-check and targeted tests.
9. Commit changes atomically.
10. Update `CLAUDE.md` if implementation confirms new content gating behavior not already documented.

## Rollback Plan

- If UI guard changes regress navigation, revert the route guard/component commits.
- If service metadata helpers regress fetching, revert those service/page commits and keep list-page overlay behavior unchanged.
- If DB/RLS hardening causes access issues, restore previous read policies while keeping app-level route guards if they are working.
- Do not remove `access_tier` or `teaser_config` columns during rollback.

## Continuation Plan After Spec 3

After package 3 is implemented, verified, and committed:

1. Create and commit a separate design spec for **package 4: Admin/UI Compliance**.
   - Focus: remove `alert`, `window.confirm`, and native `<select>/<option>` from admin pages.
   - Use `ConfirmModal`, project `Select`, toast/custom error UI, and UI verification.
2. After spec 4 is reviewed and approved, create its implementation plan.
3. Implement package 4, verify it, and commit it.
4. When packages 1-4 are complete, run a final cross-package audit covering payment, subscription enforcement, content gating, and admin UI compliance before production deployment.
