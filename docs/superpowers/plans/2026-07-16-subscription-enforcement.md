# MVP Subscription Enforcement Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce Free/Pro subscription limits consistently in database RPCs, Supabase service writes, and the client subscription store.

**Architecture:** Database RPCs are the source of truth for quota decisions, using the same Pro-validity rule as the frontend helper. Service methods call those RPCs before any vocabulary/deck creation path so UI bypasses still fail safely. The Zustand store and success flows refresh exact counts so prompts stay aligned with server-side enforcement.

**Tech Stack:** React 19, TypeScript, Zustand, Supabase Postgres/RPC/RLS, supabase-js, Vitest, Vite, pnpm.

---

## Prerequisites

- [ ] Read `CLAUDE.md` and `AGENTS.md`.
- [ ] Confirm package 1, **MVP Payment Hardening**, has been implemented and deployed enough that `subscriptions` rows are trustworthy.
- [ ] Run `git status --short --untracked-files=all` and identify unrelated dirty files before editing.
- [ ] Use GitNexus impact analysis before editing any function, class, or method:
  - `isSubscriptionPro` / helper symbols before adding downstream usage.
  - `computeState` in `src/stores/useSubscriptionStore.ts`.
  - `canAddTerm`, `canAddDeck`, and new `canCreateDecks` in `src/services/supabase/subscription.service.ts`.
  - `create`, `update`, `flagTerm` in `src/services/supabase/vocabulary.service.ts`.
  - `create`, `createLessonBatch` in `src/services/supabase/deck.service.ts`.
- [ ] If GitNexus reports stale index, run `npx gitnexus analyze` before continuing.
- [ ] Before every commit, run GitNexus `detect_changes` and inspect `git diff` for the files being staged.

## File Structure

- Create: `src/utils/subscription.ts`
  - Pure frontend subscription access helpers.
- Create: `src/utils/subscription.test.ts`
  - Unit tests for active, expired, cancelled, missing, and lifetime Pro behavior.
- Create: `src/services/supabase/subscription.errors.ts`
  - `SubscriptionLimitError` and `isSubscriptionLimitError`.
- Create: `src/services/supabase/subscription.errors.test.ts`
  - Unit tests for the typed quota error.
- Modify: `src/stores/useSubscriptionStore.ts`
  - Replace local Pro computation with `isSubscriptionPro()`.
- Create or modify: `src/services/supabase/subscription.service.test.ts`
  - Tests for `canAddTerm`, `canAddDeck`, and `canCreateDecks` RPC params.
- Modify: `src/services/supabase/subscription.service.ts`
  - Add `canCreateDecks(userId, deckCount)`.
- Create: `supabase/migrations/<timestamp>_harden_subscription_quota_enforcement.sql`
  - Add `is_user_pro`, harden existing RPCs, and add batch deck RPC.
- Modify: `src/services/supabase/vocabulary.service.test.ts`
  - Tests for quota blocking in `create`, `update`, and `flagTerm`.
- Modify: `src/services/supabase/vocabulary.service.ts`
  - Call quota RPC before any new `user_terms` insert.
- Modify: `src/services/supabase/deck.service.test.ts`
  - Tests for quota blocking in single and batch deck creation.
- Modify: `src/services/supabase/deck.service.ts`
  - Call quota RPC before deck inserts and batch creation.
- Modify only if needed after code search: vocabulary/deck UI success flows such as `src/components/layout/AddVocabularyModal.tsx`, `src/pages/decks/DeckListPage.tsx`, or lesson-generation callers.
  - Refresh `useSubscriptionStore.getState().loadSubscription()` after successful creates/deletes so counts stay accurate.
- Modify: `CLAUDE.md`
  - Add a short note only if implementation confirms new subscription-enforcement behavior not already documented.

## Chunk 1: Shared Subscription Access Helpers

**Files:**
- Create: `src/utils/subscription.ts`
- Create: `src/utils/subscription.test.ts`
- Modify: `src/stores/useSubscriptionStore.ts`

- [ ] **Step 1: Run impact analysis**

Run GitNexus impact analysis for `computeState` in `src/stores/useSubscriptionStore.ts`.

Expected: Report direct users of subscription store state. If risk is HIGH or CRITICAL, stop and warn the user before editing.

- [ ] **Step 2: Write failing helper tests**

Create `src/utils/subscription.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { getSubscriptionAccess, isSubscriptionPro } from './subscription'
import type { Subscription } from '@/types/subscription.types'

const now = new Date('2026-07-16T00:00:00.000Z')

function subscription(overrides: Partial<Subscription>): Subscription {
  return {
    id: 'sub-1',
    user_id: 'user-1',
    plan_type: 'pro',
    status: 'active',
    billing_cycle: 'monthly',
    payos_order_code: null,
    current_period_start: '2026-07-01T00:00:00.000Z',
    current_period_end: '2026-08-01T00:00:00.000Z',
    cancel_at_period_end: false,
    canceled_at: null,
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('subscription access helpers', () => {
  it('treats active pro with a future period as pro', () => {
    expect(isSubscriptionPro(subscription({}), now)).toBe(true)
    expect(getSubscriptionAccess(subscription({}), now)).toBe('pro')
  })

  it('treats active pro with an expired period as free', () => {
    expect(isSubscriptionPro(subscription({ current_period_end: '2026-07-01T00:00:00.000Z' }), now)).toBe(false)
  })

  it('accepts active pro with a null period as lifetime/manual pro for the MVP', () => {
    expect(isSubscriptionPro(subscription({ current_period_end: null }), now)).toBe(true)
  })

  it('treats cancelled or free subscriptions as free', () => {
    expect(isSubscriptionPro(subscription({ status: 'cancelled' }), now)).toBe(false)
    expect(isSubscriptionPro(subscription({ plan_type: 'free' }), now)).toBe(false)
  })

  it('treats a missing subscription as free', () => {
    expect(isSubscriptionPro(null, now)).toBe(false)
    expect(getSubscriptionAccess(null, now)).toBe('free')
  })
})
```

- [ ] **Step 3: Verify the helper test fails**

Run: `pnpm vitest run src/utils/subscription.test.ts`

Expected: FAIL because `src/utils/subscription.ts` does not exist.

- [ ] **Step 4: Implement the helper**

Create `src/utils/subscription.ts`:

```ts
import type { Subscription } from '@/types/subscription.types'

const PRO_STATUSES = new Set(['active', 'trialing'])

export function isSubscriptionPro(
  subscription: Subscription | null,
  now = new Date()
): boolean {
  if (!subscription) return false
  if (subscription.plan_type !== 'pro') return false
  if (!PRO_STATUSES.has(subscription.status)) return false
  if (!subscription.current_period_end) return true

  return new Date(subscription.current_period_end).getTime() > now.getTime()
}

export function getSubscriptionAccess(
  subscription: Subscription | null,
  now = new Date()
): 'free' | 'pro' {
  return isSubscriptionPro(subscription, now) ? 'pro' : 'free'
}
```

- [ ] **Step 5: Update the store computation**

Modify `src/stores/useSubscriptionStore.ts`:

```ts
import { isSubscriptionPro } from '@/utils/subscription'
```

Then replace the local Pro expression inside `computeState`:

```ts
const isPro = isSubscriptionPro(sub)
```

- [ ] **Step 6: Verify the chunk**

Run:

```powershell
pnpm vitest run src/utils/subscription.test.ts
pnpm tsc -b
```

Expected: helper tests PASS and TypeScript build PASS.

- [ ] **Step 7: Commit chunk 1**

Run:

```powershell
git status --short --untracked-files=all
git diff -- src/utils/subscription.ts src/utils/subscription.test.ts src/stores/useSubscriptionStore.ts
```

Run GitNexus `detect_changes`.

Then stage only these files:

```powershell
git add -- src/utils/subscription.ts src/utils/subscription.test.ts src/stores/useSubscriptionStore.ts
git commit -m "feat: add subscription access helpers"
```

Expected: One atomic commit containing only the helper, tests, and store usage.

## Chunk 2: Database Quota RPC Hardening

**Files:**
- Create: `supabase/migrations/<timestamp>_harden_subscription_quota_enforcement.sql`

- [ ] **Step 1: Create a migration file**

Run:

```powershell
npx supabase migration new harden_subscription_quota_enforcement
```

Expected: A new timestamped migration file under `supabase/migrations/`.

- [ ] **Step 2: Add the SQL migration**

Use the generated migration path and add:

```sql
create or replace function public.is_user_pro(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.subscriptions s
    where s.user_id = p_user_id
      and s.plan_type = 'pro'
      and s.status in ('active', 'trialing')
      and (
        s.current_period_end is null
        or s.current_period_end > now()
      )
  );
end;
$$;

revoke all on function public.is_user_pro(uuid) from public;

create or replace function public.can_user_add_term(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_term_count integer;
begin
  if auth.uid() is distinct from p_user_id and not public.is_admin() then
    raise exception 'Permission denied';
  end if;

  if public.is_user_pro(p_user_id) then
    return true;
  end if;

  select count(*)
  into v_term_count
  from public.user_terms
  where user_id = p_user_id
    and deleted_at is null;

  return v_term_count < 100;
end;
$$;

create or replace function public.can_user_add_deck(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deck_count integer;
begin
  if auth.uid() is distinct from p_user_id and not public.is_admin() then
    raise exception 'Permission denied';
  end if;

  if public.is_user_pro(p_user_id) then
    return true;
  end if;

  select count(*)
  into v_deck_count
  from public.decks
  where user_id = p_user_id;

  return v_deck_count < 5;
end;
$$;

create or replace function public.can_user_create_decks(
  p_user_id uuid,
  p_new_deck_count integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deck_count integer;
begin
  if auth.uid() is distinct from p_user_id and not public.is_admin() then
    raise exception 'Permission denied';
  end if;

  if p_new_deck_count <= 0 then
    return true;
  end if;

  if public.is_user_pro(p_user_id) then
    return true;
  end if;

  select count(*)
  into v_deck_count
  from public.decks
  where user_id = p_user_id;

  return v_deck_count + p_new_deck_count <= 5;
end;
$$;

revoke all on function public.can_user_add_term(uuid) from public;
revoke all on function public.can_user_add_deck(uuid) from public;
revoke all on function public.can_user_create_decks(uuid, integer) from public;

grant execute on function public.can_user_add_term(uuid) to authenticated;
grant execute on function public.can_user_add_deck(uuid) to authenticated;
grant execute on function public.can_user_create_decks(uuid, integer) to authenticated;
```

- [ ] **Step 3: Verify migration syntax locally if Supabase is available**

Run:

```powershell
npx supabase migration list
```

Expected: Command lists migrations without parse/config errors.

If local Docker Supabase is running, also run:

```powershell
npx supabase db reset
```

Expected: All migrations apply successfully. If Docker is not available, record that this could not be run.

- [ ] **Step 4: Add local SQL verification script**

Create a temporary SQL scratch file outside the repo or in an untracked temp path, for example `tmp/subscription-quota-rpc-smoke.sql`, and do not commit it. Use it to verify frontend and database rules agree after `db reset`.

The script should include cases for:

- active Pro with future `current_period_end` returns true from `public.is_user_pro`.
- active Pro with expired `current_period_end` returns false.
- active Pro with null `current_period_end` returns true.
- cancelled Pro returns false.
- missing subscription returns false.
- Free user at 99 terms can add a term.
- Free user at 100 terms cannot add a term.
- Free user with 4 decks can create 1 deck but cannot batch-create 2 decks.
- user A cannot call quota RPCs for user B.
- unauthenticated/null `auth.uid()` cannot call quota RPCs for a user.
- admin can call quota RPCs for another user if the existing `public.is_admin()` function says true.

Use transaction-local JWT claims to simulate auth context in local Postgres. Adapt the exact claims to the repo's existing `is_admin()` implementation after reading it:

```sql
begin;

-- Example pattern only. Confirm this matches public.is_admin() before using it.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select public.is_user_pro('00000000-0000-0000-0000-000000000001'::uuid) as active_pro_is_valid;
select public.can_user_add_term('00000000-0000-0000-0000-000000000001'::uuid) as owner_can_add_term;

rollback;
```

Expected: The SQL assertions or inspected result rows match the TypeScript helper tests. If local DB verification cannot run, record the blocker and require remote SQL-editor verification before production deployment.

- [ ] **Step 5: Verify `SECURITY DEFINER` behavior**

Read the current `public.is_admin()` definition in migrations before relying on the admin path.

Confirm these behaviors locally or in a reviewed SQL editor session:

- `public.is_user_pro(uuid)` is not directly executable by `anon` or normal `authenticated` roles unless explicitly granted later.
- `public.can_user_add_term(uuid)`, `public.can_user_add_deck(uuid)`, and `public.can_user_create_decks(uuid, integer)` are executable by `authenticated`.
- Owner calls pass.
- Cross-user non-admin calls raise `Permission denied`.
- Admin cross-user calls pass.
- `SECURITY DEFINER SET search_path = public` does not break calls to `auth.uid()` or `public.is_admin()`.

- [ ] **Step 6: Document remote deployment order**

Add a short note to the implementation handoff or final response:

```text
Apply this migration to the remote Supabase project before deploying code that calls can_user_create_decks.
```

- [ ] **Step 7: Commit chunk 2**

Run:

```powershell
git status --short --untracked-files=all
git diff -- supabase/migrations/<timestamp>_harden_subscription_quota_enforcement.sql
```

Run GitNexus `detect_changes`.

Then stage only the migration:

```powershell
git add -- supabase/migrations/<timestamp>_harden_subscription_quota_enforcement.sql
git commit -m "fix: harden subscription quota RPCs"
```

Expected: One atomic migration commit.

## Chunk 3: Subscription Service RPC Wrappers And Domain Error

**Files:**
- Create: `src/services/supabase/subscription.errors.ts`
- Create: `src/services/supabase/subscription.errors.test.ts`
- Create or modify: `src/services/supabase/subscription.service.test.ts`
- Modify: `src/services/supabase/subscription.service.ts`

- [ ] **Step 1: Run impact analysis**

Run GitNexus impact analysis for `canAddTerm` and `canAddDeck`.

Expected: Low or moderate risk, with callers in subscription UI/service flows. Warn the user before editing if risk is HIGH or CRITICAL.

- [ ] **Step 2: Write failing error tests**

Create `src/services/supabase/subscription.errors.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { isSubscriptionLimitError, SubscriptionLimitError } from './subscription.errors'

describe('SubscriptionLimitError', () => {
  it('preserves feature and limit details', () => {
    const error = new SubscriptionLimitError('terms', 100)

    expect(error.message).toContain('terms')
    expect(error.feature).toBe('terms')
    expect(error.limit).toBe(100)
    expect(isSubscriptionLimitError(error)).toBe(true)
  })

  it('does not match generic errors', () => {
    expect(isSubscriptionLimitError(new Error('nope'))).toBe(false)
  })
})
```

- [ ] **Step 3: Write failing service wrapper tests**

Create or extend `src/services/supabase/subscription.service.test.ts` with Supabase RPC mocks:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { subscriptionService } from '@/services/supabase/subscription.service'
import { supabase } from '@/services/supabase/client'

vi.mock('@/services/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    auth: { getSession: vi.fn() },
    from: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}))

const rpc = vi.mocked(supabase.rpc)

describe('subscriptionService quota RPCs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls can_user_add_term with p_user_id', async () => {
    rpc.mockResolvedValueOnce({ data: true, error: null })

    await expect(subscriptionService.canAddTerm('user-1')).resolves.toBe(true)

    expect(rpc).toHaveBeenCalledWith('can_user_add_term', { p_user_id: 'user-1' })
  })

  it('calls can_user_add_deck with p_user_id', async () => {
    rpc.mockResolvedValueOnce({ data: false, error: null })

    await expect(subscriptionService.canAddDeck('user-1')).resolves.toBe(false)

    expect(rpc).toHaveBeenCalledWith('can_user_add_deck', { p_user_id: 'user-1' })
  })

  it('calls can_user_create_decks with p_new_deck_count', async () => {
    rpc.mockResolvedValueOnce({ data: true, error: null })

    await expect(subscriptionService.canCreateDecks('user-1', 3)).resolves.toBe(true)

    expect(rpc).toHaveBeenCalledWith('can_user_create_decks', {
      p_user_id: 'user-1',
      p_new_deck_count: 3,
    })
  })
})
```

- [ ] **Step 4: Verify tests fail**

Run:

```powershell
pnpm vitest run src/services/supabase/subscription.errors.test.ts src/services/supabase/subscription.service.test.ts
```

Expected: FAIL because `subscription.errors.ts` and `canCreateDecks()` do not exist yet.

- [ ] **Step 5: Implement the typed error**

Create `src/services/supabase/subscription.errors.ts`:

```ts
export type SubscriptionLimitedFeature = 'terms' | 'decks'

export class SubscriptionLimitError extends Error {
  constructor(
    public readonly feature: SubscriptionLimitedFeature,
    public readonly limit: number
  ) {
    super(`Free plan ${feature} limit reached (${limit})`)
    this.name = 'SubscriptionLimitError'
  }
}

export function isSubscriptionLimitError(error: unknown): error is SubscriptionLimitError {
  return error instanceof SubscriptionLimitError
}
```

- [ ] **Step 6: Implement `canCreateDecks`**

Modify `src/services/supabase/subscription.service.ts`:

```ts
  /**
   * Kiểm tra user có quyền tạo nhiều deck trong một batch không (gọi RPC).
   */
  async canCreateDecks(userId: string, deckCount: number): Promise<boolean> {
    const { data, error } = await supabase.rpc('can_user_create_decks', {
      p_user_id: userId,
      p_new_deck_count: deckCount,
    })

    if (error) throw error
    return data as boolean
  },
```

- [ ] **Step 7: Verify the chunk**

Run:

```powershell
pnpm vitest run src/services/supabase/subscription.errors.test.ts src/services/supabase/subscription.service.test.ts
pnpm tsc -b
```

Expected: targeted tests PASS and TypeScript build PASS.

- [ ] **Step 8: Commit chunk 3**

Run:

```powershell
git status --short --untracked-files=all
git diff -- src/services/supabase/subscription.errors.ts src/services/supabase/subscription.errors.test.ts src/services/supabase/subscription.service.ts src/services/supabase/subscription.service.test.ts
```

Run GitNexus `detect_changes`.

Then stage only these files:

```powershell
git add -- src/services/supabase/subscription.errors.ts src/services/supabase/subscription.errors.test.ts src/services/supabase/subscription.service.ts src/services/supabase/subscription.service.test.ts
git commit -m "feat: add subscription quota service helpers"
```

Expected: One atomic service/helper commit.

## Chunk 4: Vocabulary Service Quota Enforcement

**Files:**
- Modify: `src/services/supabase/vocabulary.service.test.ts`
- Modify: `src/services/supabase/vocabulary.service.ts`

- [ ] **Step 1: Run impact analysis**

Run GitNexus impact analysis for `create`, `update`, and `flagTerm` in `src/services/supabase/vocabulary.service.ts`.

Expected: Direct callers include add/edit/flag vocabulary flows. Warn the user before editing if risk is HIGH or CRITICAL.

- [ ] **Step 2: Extend test mocks**

In `src/services/supabase/vocabulary.service.test.ts`, mock `subscriptionService`:

```ts
vi.mock('@/services/supabase/subscription.service', () => ({
  subscriptionService: {
    canAddTerm: vi.fn().mockResolvedValue(true),
  },
}))
```

Import the mocked service and error:

```ts
import { subscriptionService } from '@/services/supabase/subscription.service'
import { SubscriptionLimitError, isSubscriptionLimitError } from '@/services/supabase/subscription.errors'
```

- [ ] **Step 3: Write failing quota tests**

Add tests that prove quota checks happen before inserts. Adapt chain mocks to the actual `vocabularyService.create/update/flagTerm` query shape before implementing:

```ts
it('blocks create before touching global_terms when term quota is exhausted', async () => {
  vi.mocked(subscriptionService.canAddTerm).mockResolvedValueOnce(false)
  const from = vi.fn()
  const client = await import('@/services/supabase/client')
  vi.mocked(client.supabase as any).from = from

  let thrown: unknown
  try {
    await vocabularyService.create('user-1', {
      source_text: 'hello',
      source_language: 'en',
      native_language: 'vi',
      item_type: 'word',
      meanings: [],
    } as any)
  } catch (error) {
    thrown = error
  }

  expect(thrown).toBeInstanceOf(SubscriptionLimitError)
  expect(isSubscriptionLimitError(thrown)).toBe(true)

  expect(subscriptionService.canAddTerm).toHaveBeenCalledWith('user-1')
  expect(from).not.toHaveBeenCalledWith('global_terms')
})
```

Also add tests for:

- `update()` allows updates to an existing user term without calling `canAddTerm`.
- `update()` blocks when it would create a new `user_terms` row.
- `flagTerm()` blocks when it would create a new `user_terms` row.

- [ ] **Step 4: Verify vocabulary tests fail**

Run:

```powershell
pnpm vitest run src/services/supabase/vocabulary.service.test.ts
```

Expected: FAIL because quota checks are not implemented.

- [ ] **Step 5: Add a local quota assertion helper**

Modify `src/services/supabase/vocabulary.service.ts`:

```ts
import { subscriptionService } from '@/services/supabase/subscription.service'
import { SubscriptionLimitError } from '@/services/supabase/subscription.errors'
import { FREE_LIMITS } from '@/types/subscription.types'

async function assertCanAddTerm(userId: string) {
  const canAdd = await subscriptionService.canAddTerm(userId)
  if (!canAdd) {
    throw new SubscriptionLimitError('terms', FREE_LIMITS.maxTerms)
  }
}
```

- [ ] **Step 6: Enforce quota in `create()`**

At the top of `vocabularyService.create(userId, values)`, before `global_terms` lookup/insert:

```ts
await assertCanAddTerm(userId)
```

Expected: blocked Free users do not create unused `global_terms` rows.

- [ ] **Step 7: Enforce quota in `update()` only for new user terms**

In the branch where `isNewUserTerm === true` and before inserting `user_terms`, add:

```ts
await assertCanAddTerm(existing.user_id)
```

Do not call the quota check for normal updates to existing `user_terms`.

- [ ] **Step 8: Enforce quota in `flagTerm()` only for inserted rows**

In the branch where `flagTerm()` creates a new `user_terms` row, add:

```ts
await assertCanAddTerm(userId)
```

Do not call the quota check when flagging an existing user term.

- [ ] **Step 9: Verify the chunk**

Run:

```powershell
pnpm vitest run src/services/supabase/vocabulary.service.test.ts src/services/supabase/subscription.errors.test.ts
pnpm tsc -b
```

Expected: targeted tests PASS and TypeScript build PASS.

- [ ] **Step 10: Commit chunk 4**

Run:

```powershell
git status --short --untracked-files=all
git diff -- src/services/supabase/vocabulary.service.ts src/services/supabase/vocabulary.service.test.ts
```

Run GitNexus `detect_changes`.

Then stage only these files:

```powershell
git add -- src/services/supabase/vocabulary.service.ts src/services/supabase/vocabulary.service.test.ts
git commit -m "fix: enforce vocabulary subscription limits"
```

Expected: One atomic vocabulary enforcement commit.

## Chunk 5: Deck Service Quota Enforcement

**Files:**
- Modify: `src/services/supabase/deck.service.test.ts`
- Modify: `src/services/supabase/deck.service.ts`

- [ ] **Step 1: Run impact analysis**

Run GitNexus impact analysis for `create` and `createLessonBatch` in `src/services/supabase/deck.service.ts`.

Expected: Direct callers include deck creation UI and lesson generation. Warn the user before editing if risk is HIGH or CRITICAL.

- [ ] **Step 2: Extend test mocks**

In `src/services/supabase/deck.service.test.ts`, mock `subscriptionService`:

```ts
vi.mock('@/services/supabase/subscription.service', () => ({
  subscriptionService: {
    canAddDeck: vi.fn().mockResolvedValue(true),
    canCreateDecks: vi.fn().mockResolvedValue(true),
  },
}))
```

Also update the existing `beforeEach` to restore spy implementations before resetting Supabase mocks:

```ts
beforeEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
  // existing mock setup follows...
})
```

Import:

```ts
import { subscriptionService } from '@/services/supabase/subscription.service'
import { SubscriptionLimitError, isSubscriptionLimitError } from '@/services/supabase/subscription.errors'
```

- [ ] **Step 3: Write failing deck quota tests**

Add tests:

```ts
it('blocks create when deck quota is exhausted', async () => {
  vi.mocked(subscriptionService.canAddDeck).mockResolvedValueOnce(false)

  await expect(deckService.create({
    user_id: 'user-1',
    name: 'Blocked deck',
    source_language: 'en',
    native_language: 'vi',
  })).rejects.toBeInstanceOf(SubscriptionLimitError)

  expect(subscriptionService.canAddDeck).toHaveBeenCalledWith('user-1')
})

it('blocks createLessonBatch before creating any deck when batch quota is exhausted', async () => {
  vi.mocked(subscriptionService.canCreateDecks).mockResolvedValueOnce(false)
  const create = vi.spyOn(deckService, 'create')

  const result = await deckService.createLessonBatch({
    base: { user_id: 'user-1', source_language: 'en', native_language: 'vi' },
    lessons: [
      { name: 'Bai hoc 01', termIds: ['term-1'] },
      { name: 'Bai hoc 02', termIds: ['term-2'] },
    ],
  })

  expect(subscriptionService.canCreateDecks).toHaveBeenCalledWith('user-1', 2)
  expect(create).not.toHaveBeenCalled()
  expect(result.createdDecks).toEqual([])
  expect(isSubscriptionLimitError(result.error)).toBe(true)
})
```

- [ ] **Step 4: Verify deck tests fail**

Run:

```powershell
pnpm vitest run src/services/supabase/deck.service.test.ts
```

Expected: FAIL because quota checks are not implemented.

- [ ] **Step 5: Add local deck quota helpers**

Modify `src/services/supabase/deck.service.ts`:

```ts
import { subscriptionService } from '@/services/supabase/subscription.service'
import { SubscriptionLimitError } from '@/services/supabase/subscription.errors'
import { FREE_LIMITS } from '@/types/subscription.types'

async function assertCanAddDeck(userId: string) {
  const canAdd = await subscriptionService.canAddDeck(userId)
  if (!canAdd) {
    throw new SubscriptionLimitError('decks', FREE_LIMITS.maxDecks)
  }
}

async function assertCanCreateDecks(userId: string, deckCount: number) {
  const canCreate = await subscriptionService.canCreateDecks(userId, deckCount)
  if (!canCreate) {
    throw new SubscriptionLimitError('decks', FREE_LIMITS.maxDecks)
  }
}
```

- [ ] **Step 6: Enforce quota in `create()`**

At the top of `deckService.create(input)`, before insert:

```ts
await assertCanAddDeck(input.user_id)
```

- [ ] **Step 7: Enforce quota in `createLessonBatch()`**

Before resolving term IDs and before calling `deckService.create`, add:

```ts
try {
  await assertCanCreateDecks(base.user_id, lessons.length)
} catch (error) {
  return { createdDecks, error: error as Error }
}
```

Keep the existing partial-success cleanup behavior for failures that happen after at least one deck is created.

- [ ] **Step 8: Verify the chunk**

Run:

```powershell
pnpm vitest run src/services/supabase/deck.service.test.ts src/services/supabase/subscription.errors.test.ts
pnpm tsc -b
```

Expected: targeted tests PASS and TypeScript build PASS.

- [ ] **Step 9: Commit chunk 5**

Run:

```powershell
git status --short --untracked-files=all
git diff -- src/services/supabase/deck.service.ts src/services/supabase/deck.service.test.ts
```

Run GitNexus `detect_changes`.

Then stage only these files:

```powershell
git add -- src/services/supabase/deck.service.ts src/services/supabase/deck.service.test.ts
git commit -m "fix: enforce deck subscription limits"
```

Expected: One atomic deck enforcement commit.

## Chunk 6: Count Refresh And User-Facing Error Handling

**Files:**
- Modify only after code search confirms exact callers:
  - `src/components/layout/AddVocabularyModal.tsx`
  - `src/pages/decks/DeckListPage.tsx`
  - lesson generation page/component that calls `deckService.createLessonBatch`
  - vocabulary delete/create/import flows that update `user_terms`

- [ ] **Step 1: Find create/delete success flows**

Run:

```powershell
rg "vocabularyService\\.(create|remove|delete|flagTerm|update)|deckService\\.(create|remove|createLessonBatch)" src
rg "loadSubscription|useSubscriptionStore" src
rg "shouldUseRemoteData|demo-user|offlineTitle|isSupabaseConfigured" src
```

Expected: A list of UI/service callers that need count refresh or quota error handling.

For demo/offline mode, record the confirmed boundary before editing:

- page-level demo flows use `shouldUseRemoteData` or demo fixtures and should not call remote write services;
- `AddVocabularyModal` currently uses `user?.id || 'demo-user'`, so confirm whether it is reachable in demo/offline mode before adding quota handling;
- service-level quota checks are for remote Supabase writes only and should not introduce new remote calls in page-level demo flows.

- [ ] **Step 2: Run impact analysis for edited UI handlers**

For each function handler you will edit, run GitNexus impact analysis first.

Expected: Mostly UI-local risk. Warn the user before editing if any handler has HIGH or CRITICAL risk.

- [ ] **Step 3: Add count refresh after successful creates/deletes**

In each confirmed success flow, call:

```ts
void useSubscriptionStore.getState().loadSubscription()
```

Do this after the write succeeds and after any existing query invalidation or local state update. Do not block success UI on the refresh unless the existing flow already awaits subscription reload.

- [ ] **Step 4: Handle `SubscriptionLimitError` without generic success**

Where add/create forms catch errors, add:

```ts
if (isSubscriptionLimitError(error)) {
  // Use the existing upgrade prompt/modal if this component already has one.
  // Otherwise show the existing toast/custom error UI with a clear upgrade message.
  return
}
```

Do not add `window.alert`, `window.confirm`, native `<select>`, or new browser dialogs.

- [ ] **Step 5: Verify UI compile behavior**

Run:

```powershell
pnpm tsc -b
```

Expected: TypeScript build PASS.

If there are existing UI tests for the touched flows, run the targeted tests. If there are no tests, record the manual verification path.

- [ ] **Step 6: Commit chunk 6**

Run:

```powershell
git status --short --untracked-files=all
git diff -- <each touched UI file>
```

Run GitNexus `detect_changes`.

Then stage only the touched UI files:

```powershell
git add -- <each touched UI file>
git commit -m "fix: refresh subscription counts after quota writes"
```

Expected: One atomic UI sync/error-handling commit.

## Chunk 7: Final Verification And Continuation

**Files:**
- Modify: `CLAUDE.md` only if needed.

- [ ] **Step 1: Run targeted tests**

Run:

```powershell
pnpm vitest run src/utils/subscription.test.ts src/services/supabase/subscription.errors.test.ts src/services/supabase/subscription.service.test.ts src/services/supabase/vocabulary.service.test.ts src/services/supabase/deck.service.test.ts
```

Expected: All targeted tests PASS.

- [ ] **Step 2: Run full type check**

Run:

```powershell
pnpm tsc -b
```

Expected: PASS.

- [ ] **Step 3: Run broader tests if practical**

Run:

```powershell
pnpm test
```

Expected: PASS. If the suite is too slow, flaky, or not configured, record the exact failure/blocker.

- [ ] **Step 4: Verify migration deployment status**

Run:

```powershell
npx supabase migration list
```

Expected: Local migration exists. Remote deployment may still require `npx supabase db push --project-ref brwvbpkgimhamivmaflu` after review.

Do not push DB migrations without explicit user approval.

- [ ] **Step 5: Manual verification**

Use an Admin/Test account after migration is applied:

- Free user with 99 terms can add one term; then cannot add another.
- Free user with 100 terms cannot add a term through UI or direct service path.
- Free user with 4 decks can create one deck; batch create of 2 decks is blocked before any deck is created.
- Expired Pro row with `status = 'active'` and past `current_period_end` behaves as Free.
- Active Pro row with future or null `current_period_end` can create beyond Free limits.
- Delete a term/deck and confirm counts refresh so the add button/prompt updates.

- [ ] **Step 6: Update project memory if new behavior is confirmed**

If the final implementation establishes new subscription-enforcement behavior not already covered, update `CLAUDE.md` with a short bullet.

- [ ] **Step 7: Final commit if documentation changed**

Run:

```powershell
git status --short --untracked-files=all
git diff -- CLAUDE.md
```

Run GitNexus `detect_changes`.

Then:

```powershell
git add -- CLAUDE.md
git commit -m "docs: document subscription enforcement"
```

Expected: Documentation-only commit, only if `CLAUDE.md` changed.

- [ ] **Step 8: Continue to package 3**

After package 2 is implemented, verified, and committed:

1. Create a separate design spec for **MVP Content Gating Completion**.
2. Include direct route guards for grammar/listening, teaser behavior, and Free-user URL bypass prevention.
3. Do not include Admin/UI Compliance in spec 3.
4. Review and commit spec 3.
5. Create an implementation plan for spec 3.
6. Implement, verify, and commit package 3.
7. Then repeat the same spec -> plan -> implementation -> verification -> commit flow for **Admin/UI Compliance**.
8. After packages 1-4 are complete, run a cross-package audit covering payment, subscription enforcement, content gating, and admin UI compliance.

## Notes For Implementers

- Do not apply remote Supabase migrations automatically unless the user explicitly approves it.
- Do not use `git add -A` or `git add .`.
- Do not stage unrelated current dirty files such as existing `.gitignore` changes or unrelated files under `docs/`.
- Do not redesign subscription UI in this package.
- Do not implement package 3 route gating or package 4 Admin UI compliance in this package.
- Keep demo/offline mode intact. If a flow currently bypasses Supabase because it is demo/offline, preserve that behavior and document it in the relevant tests or notes.
