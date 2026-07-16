# MVP Subscription Enforcement Design

## Overview

This spec covers package 2 of the subscription rollout: enforce Free/Pro subscription limits consistently across database RPCs, Supabase services, and the client subscription store. The goal is to make subscription access a real authorization boundary for vocabulary and deck creation, not only a UI prompt.

Package 2 depends on package 1, **MVP Payment Hardening**, because payment webhooks must reliably create or update `subscriptions` before the app can trust subscription state.

## Problem Statement

MemoryLang already has subscription tables, a `useSubscriptionStore`, pricing types, and Free-tier UI prompts. However, enforcement is incomplete:

- `useSubscriptionStore` treats a Pro subscription as active based on `plan_type` and `status`, but it does not check `current_period_end`.
- Existing RPCs `can_user_add_term` and `can_user_add_deck` treat any active/trialing Pro row as unlimited, even if the paid period has expired.
- `vocabularyService.create()` and `deckService.create()` can still be called directly by app code without checking quota first.
- Some flows create multiple decks in a batch, so a single boolean `canAddDeck` check is not enough for lesson generation.
- Client UI gates are helpful for UX but cannot be the only enforcement layer.

## Goals

- Define one shared subscription validity rule for the MVP:
  - Pro is valid only when `plan_type = 'pro'`, `status IN ('active', 'trialing')`, and `current_period_end IS NULL OR current_period_end > now()`.
  - Free is the fallback for missing, expired, cancelled, or invalid subscriptions.
- Enforce Free limits before writes:
  - Max `100` non-deleted `user_terms`.
  - Max `5` decks owned by the user.
- Protect all vocabulary/deck creation paths used by the app:
  - `vocabularyService.create()`
  - implicit `user_terms` creation in `vocabularyService.update()` when editing a global term not yet learned
  - `vocabularyService.flagTerm()` when it inserts a new `user_terms` row
  - `deckService.create()`
  - `deckService.createLessonBatch()`
- Keep UI prompts in sync with server-side rules by refreshing subscription/count state after successful create/delete/payment updates.
- Preserve demo/offline mode behavior.
- Use Supabase count queries with `{ count: 'exact', head: true }` for totals instead of fetching large lists.

## Non-Goals

- Do not implement package 3 content gating for grammar/listening routes.
- Do not refactor Admin UI away from `alert`, `window.confirm`, or native `<select>`; that belongs to package 4.
- Do not change pricing, plan names, PayOS payment creation, webhook processing, or email notifications.
- Do not delete or hide existing over-limit data for downgraded users. Users keep existing vocabulary/decks, but cannot create more until below Free limits or Pro is restored.
- Do not implement Team plan, trials, promo codes, or analytics.

## Current Code Context

Relevant files:

- `supabase/migrations/20260715000000_add_subscriptions.sql`
  - Defines `subscriptions`, `payment_logs`, `can_user_add_term`, and `can_user_add_deck`.
- `src/types/subscription.types.ts`
  - Defines `Subscription`, pricing, and `FREE_LIMITS`.
- `src/stores/useSubscriptionStore.ts`
  - Loads subscription, exact term/deck counts, and computes `isPro`, `canAddTerm`, `canAddDeck`.
- `src/services/supabase/subscription.service.ts`
  - Reads subscription and exposes `canAddTerm()` / `canAddDeck()` RPC calls.
- `src/services/supabase/vocabulary.service.ts`
  - Creates `global_terms` and `user_terms`; also inserts user term rows from update/flag flows.
- `src/services/supabase/deck.service.ts`
  - Creates decks and randomized lesson deck batches.
- `src/components/layout/AddVocabularyModal.tsx`, `src/components/common/ProFeatureGate.tsx`, `src/pages/decks/DeckListPage.tsx`
  - Existing UI-level gates.

## Detailed Design

### Subscription Validity

Create one TypeScript helper and one Postgres helper for subscription validity.

Frontend helper:

- File: `src/utils/subscription.ts`
- Exports:
  - `isSubscriptionPro(subscription: Subscription | null, now = new Date()): boolean`
  - `getSubscriptionAccess(subscription: Subscription | null, now = new Date()): 'free' | 'pro'`

Rules:

- `plan_type` must be `pro`.
- `status` must be `active` or `trialing`.
- If `current_period_end` is present, it must be in the future.
- `current_period_end = null` is accepted for manually granted/lifetime Pro in the MVP.

Postgres helper:

- Function: `public.is_user_pro(p_user_id uuid)`
- Same rule as frontend:
  - `plan_type = 'pro'`
  - `status IN ('active', 'trialing')`
  - `(current_period_end IS NULL OR current_period_end > now())`

The implementation plan should include tests that prove the frontend and DB rules agree for active, expired, cancelled, missing, and lifetime Pro cases.

### Database Enforcement RPCs

Update or replace the existing RPCs:

- `public.can_user_add_term(p_user_id uuid)`
- `public.can_user_add_deck(p_user_id uuid)`

Required behavior:

- If `public.is_user_pro(p_user_id)` returns true, return true.
- For Free users:
  - term limit uses `count(*)` on `user_terms` where `user_id = p_user_id` and `deleted_at IS NULL`.
  - deck limit uses `count(*)` on `decks` where `user_id = p_user_id`.
- Use `SECURITY DEFINER SET search_path = public`.
- Do not rely on `auth.role()`.
- Restrict function execution so normal app calls can use the RPCs but table writes remain governed by existing policies.

Add a batch-specific RPC:

- `public.can_user_create_decks(p_user_id uuid, p_new_deck_count integer)`

Required behavior:

- Pro users return true.
- Free users return true only when `current_deck_count + p_new_deck_count <= 5`.
- `p_new_deck_count <= 0` should return true.

This prevents `createLessonBatch()` from creating several decks after a single `canAddDeck` boolean has passed.

### Service Enforcement

Add service-level checks before write operations.

`subscriptionService`:

- Add `canCreateDecks(userId: string, deckCount: number): Promise<boolean>`.
- Add `refreshMyAccess()` only if needed by the implementation plan; otherwise keep store refresh in `useSubscriptionStore`.

`vocabularyService`:

- Before inserting into `user_terms`, call `subscriptionService.canAddTerm(userId)`.
- Throw a typed/domain error when blocked, for example:
  - `new SubscriptionLimitError('terms', FREE_LIMITS.maxTerms)`
- Apply the check in:
  - `create()`
  - `update()` only when `isNewUserTerm === true`
  - `flagTerm()` only when it inserts a new `user_terms` row
- Do not block updates to existing user terms.
- Do not block deletes.

`deckService`:

- Before `create()`, call `subscriptionService.canAddDeck(input.user_id)`.
- Before `createLessonBatch()`, call `subscriptionService.canCreateDecks(base.user_id, lessons.length)`.
- Throw `SubscriptionLimitError('decks', FREE_LIMITS.maxDecks)` when blocked.
- Do not block updates/deletes.

The service checks are not a replacement for DB/RLS enforcement, but they protect all normal app service calls and keep errors consistent.

### Error Contract

Create a small reusable domain error:

- File: `src/services/supabase/subscription.errors.ts`
- Exports:
  - `class SubscriptionLimitError extends Error`
  - properties: `feature: 'terms' | 'decks'`, `limit: number`
  - helper: `isSubscriptionLimitError(error: unknown): error is SubscriptionLimitError`

UI code can later use this helper to show `UpgradePromptModal` instead of a generic error. Package 2 only needs to ensure existing add/create flows do not crash or show misleading success states.

### Store And Count Refresh

Update `useSubscriptionStore` to compute access through `isSubscriptionPro()`.

Refresh rules:

- `loadSubscription()` keeps using exact count queries with `head: true`.
- After successful vocabulary create/delete, the calling flow should refresh or update term counts.
- After successful deck create/delete/batch creation, the calling flow should refresh or update deck counts.
- After payment success, `PaymentQRModal` already calls `loadSubscription()`; package 2 should verify this still refreshes counts and Pro status.

Do not fetch full `user_terms` or `decks` lists only to count records. This project explicitly avoids PostgREST 1000-row truncation for counts.

### UX Behavior

UI gates remain as first-line UX:

- `ProFeatureGate` continues to intercept over-limit deck creation.
- `AddVocabularyModal` continues to show an upgrade prompt when `canAddTerm` is false.

Package 2 adds a second line of defense:

- If a write attempt bypasses the UI gate, service-level checks reject it with `SubscriptionLimitError`.
- Existing forms should catch that error and show the existing upgrade path or a clear error message.

The implementation plan should not redesign subscription UI. It should only add enough error handling to prevent confusing generic failures.

## Security Considerations

- UI state is not authorization.
- Service checks are necessary for app consistency, but database/RPC checks are the source of truth for quota decisions.
- Do not use `user_metadata` for plan state.
- Do not expose service-role keys to the client.
- `SECURITY DEFINER` functions must set `search_path = public` and avoid dynamic SQL.
- Do not broaden RLS policies to make quota implementation easier.
- Expired subscriptions must not keep Pro privileges only because `status = 'active'`.

## Edge Cases

- Missing subscription row: treat as Free.
- Existing user has more than 100 terms or more than 5 decks: keep data, block additional creation.
- Expired Pro with `status = 'active'`: treat as Free.
- Pro with `current_period_end = null`: treat as valid Pro for MVP manual/lifetime grants.
- Batch lesson creation with 4 current decks and 2 new lessons: block before creating anything.
- Vocabulary update for an already learned term: allow.
- Editing a global term that creates a new `user_terms` row: enforce term quota.
- Flagging a global term that creates a new `user_terms` row: enforce term quota.
- Demo/offline mode: do not enforce remote subscription RPCs.

## Testing Strategy

Automated tests should cover:

- `isSubscriptionPro()`:
  - active Pro with future period.
  - active Pro with expired period.
  - active Pro with null period.
  - cancelled Pro.
  - Free/missing subscription.
- `SubscriptionLimitError`:
  - type guard works.
  - feature and limit are preserved.
- `subscriptionService` RPC wrappers:
  - `canAddTerm()`, `canAddDeck()`, `canCreateDecks()` pass correct RPC names and params.
- `vocabularyService`:
  - blocks `create()` when term quota is false.
  - does not create `global_terms` before quota passes if a new user term would be blocked.
  - allows update of existing user term.
  - blocks update/flag paths that would insert a new `user_terms` row.
- `deckService`:
  - blocks `create()` when deck quota is false.
  - blocks `createLessonBatch()` when requested lessons exceed remaining Free quota before creating any deck.
  - allows Pro path.
- Store behavior:
  - computes `isPro` from `current_period_end`.
  - exact count queries use `count: 'exact', head: true`.

Verification commands:

- `pnpm vitest run <targeted tests>`
- `pnpm tsc -b`
- `pnpm test` when practical
- GitNexus `detect_changes` before commits

## Rollout Plan

1. Implement package 1 Payment Hardening first.
2. Add package 2 migration for subscription validity/quota RPCs.
3. Apply migration to remote DB before deploying frontend code that depends on new RPCs.
4. Implement frontend helpers, error types, service checks, and store updates.
5. Add targeted tests.
6. Run type-check and tests.
7. Commit in atomic commits.
8. Update `CLAUDE.md` if implementation adds confirmed subscription enforcement behavior not already documented.

## Rollback Plan

- If the frontend/service changes cause regressions, revert those commits while keeping DB migration if it is backward compatible.
- If the DB migration causes issues, restore previous RPC definitions for `can_user_add_term` and `can_user_add_deck`.
- Do not remove subscription/payment rows during rollback.

## Open Questions

- Should manually granted Pro subscriptions always use `current_period_end = null`, or should admin tools set a far-future period? MVP accepts null as valid Pro.
- Should public/shared decks count toward a user's Free deck limit? Current code counts only `decks.user_id = userId`; this spec keeps that behavior.

## Continuation Plan After Spec 2

After package 2 is implemented, verified, and committed, continue the rollout as follows:

1. Create and commit a separate design spec for **package 3: MVP Content Gating Completion**.
   - Focus: direct-route guards for grammar/listening, teaser behavior, and preventing Free users from bypassing Pro content locks by URL.
   - Do not include Admin UI compliance in spec 3.
2. After spec 3 is reviewed and approved, create its implementation plan, implement it, verify it, and commit it.
3. After package 3 is complete, create and commit a separate design spec for **package 4: Admin/UI Compliance**.
   - Focus: remove `alert`, `window.confirm`, and native `<select>/<option>` from admin pages; use `ConfirmModal`, project `Select`, toast/custom error UI, and UI verification.
4. After spec 4 is reviewed and approved, create its implementation plan, implement it, verify it, and commit it.
5. When packages 1-4 are complete, do a final cross-package audit covering payment, subscription enforcement, content gating, and admin UI compliance before production deployment.

