# MVP Content Gating Completion Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent Free users from bypassing Pro Grammar/Listening locks through direct URLs while preserving list-page teaser discovery.

**Architecture:** Add a pure content-access helper and a full-page lock state, then gate direct route pages before protected payload queries run. Listening uses lightweight metadata helpers to resolve a part/test back to its parent topic before fetching tests, parts, audio, transcript, or questions. Database/RLS hardening is implemented when package 2's `public.is_user_pro()` helper is available; otherwise it is recorded as a production-blocking follow-up.

**Tech Stack:** React 19, TypeScript, TanStack React Query, react-router-dom v7, Zustand, Supabase Postgres/RLS, Vitest, Testing Library, pnpm.

---

## Prerequisites

- [ ] Read `CLAUDE.md` and `AGENTS.md`.
- [ ] Read the design spec: `docs/superpowers/specs/2026-07-16-content-gating-completion-design.md`.
- [ ] Confirm package 2, **MVP Subscription Enforcement**, has either been implemented or is queued before this package so `useSubscriptionStore.isPro` becomes period-aware.
- [ ] Run `git status --short --untracked-files=all` and identify unrelated dirty files before editing.
- [ ] Use GitNexus impact analysis before editing functions/components:
  - `ContentLockOverlay`, `ContentLockModal`, new `ContentLockState`.
  - `GrammarLessonPage`.
  - `TestSelectionPage`, `PartSelectionPage`, `ListeningSessionPage`.
  - `listeningService` helpers.
  - RLS migration functions/policies if editing SQL that depends on `is_user_pro`.
- [ ] If GitNexus reports stale index, run `npx gitnexus analyze` before continuing.
- [ ] Before every commit, run GitNexus `detect_changes` and inspect `git diff` for staged files.

## File Structure

- Create: `src/utils/contentAccess.ts`
  - Pure helpers for `access_tier` decisions.
- Create: `src/utils/contentAccess.test.ts`
  - Unit tests for Free/Pro/missing access tier.
- Create: `src/components/subscription/ContentLockState.tsx`
  - Full-page lock state for direct routes.
- Create: `src/components/subscription/ContentLockState.test.tsx`
  - Rendering and CTA tests.
- Modify: `src/pages/grammar/GrammarLessonPage.tsx`
  - Fetch topic first, block Free users from Pro blocks/view count.
- Create: `src/pages/grammar/GrammarLessonPage.test.tsx`
  - Direct-route bypass tests for Grammar.
- Modify: `src/services/supabase/listening.service.ts`
  - Add metadata helpers: `getTopic`, `getTopicByTestId`, `getTopicByPartId`.
- Create: `src/services/supabase/listening.service.test.ts`
  - Supabase query and mapping tests for metadata helpers.
- Modify: `src/pages/listening/TestSelectionPage.tsx`
  - Block Pro topic before listing tests.
- Modify: `src/pages/listening/PartSelectionPage.tsx`
  - Block Pro parent topic before listing parts.
- Modify: `src/pages/listening/ListeningSessionPage.tsx`
  - Block Pro parent topic before loading audio/transcript/questions.
- Create or modify tests:
  - `src/pages/listening/TestSelectionPage.test.tsx`
  - `src/pages/listening/PartSelectionPage.test.tsx`
  - `src/pages/listening/ListeningSessionPage.test.tsx`
- Create conditionally: `supabase/migrations/<timestamp>_harden_content_gating_rls.sql`
  - Only if package 2's `public.is_user_pro(uuid)` helper is present or implemented in the same branch before this chunk.
- Modify: `CLAUDE.md`
  - Only after implementation confirms new route-gating behavior not already documented.

## Chunk 1: Shared Content Access Helper

**Files:**
- Create: `src/utils/contentAccess.ts`
- Create: `src/utils/contentAccess.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/utils/contentAccess.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { canAccessContent, isProContent } from './contentAccess'

describe('content access helpers', () => {
  it('allows free content for Free and Pro users', () => {
    expect(canAccessContent('free', false)).toBe(true)
    expect(canAccessContent('free', true)).toBe(true)
  })

  it('treats missing access tier as free for backward compatibility', () => {
    expect(canAccessContent(undefined, false)).toBe(true)
    expect(canAccessContent(null, false)).toBe(true)
    expect(isProContent(undefined)).toBe(false)
  })

  it('blocks pro content for Free users', () => {
    expect(canAccessContent('pro', false)).toBe(false)
    expect(isProContent('pro')).toBe(true)
  })

  it('allows pro content for Pro users', () => {
    expect(canAccessContent('pro', true)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm vitest run src/utils/contentAccess.test.ts
```

Expected: FAIL because `src/utils/contentAccess.ts` does not exist.

- [ ] **Step 3: Implement the helper**

Create `src/utils/contentAccess.ts`:

```ts
import type { AccessTier } from '@/types/subscription.types'

export function isProContent(accessTier: AccessTier | null | undefined): boolean {
  return accessTier === 'pro'
}

export function canAccessContent(
  accessTier: AccessTier | null | undefined,
  isPro: boolean
): boolean {
  return !isProContent(accessTier) || isPro
}
```

- [ ] **Step 4: Verify the chunk**

Run:

```powershell
pnpm vitest run src/utils/contentAccess.test.ts
pnpm tsc -b
```

Expected: tests PASS and TypeScript build PASS.

- [ ] **Step 5: Commit chunk 1**

Run:

```powershell
git status --short --untracked-files=all
git diff -- src/utils/contentAccess.ts src/utils/contentAccess.test.ts
```

Run GitNexus `detect_changes`.

Then:

```powershell
git add -- src/utils/contentAccess.ts src/utils/contentAccess.test.ts
git commit -m "feat: add content access helper"
```

Expected: One atomic helper commit.

## Chunk 2: Full-Page Content Lock State

**Files:**
- Create: `src/components/subscription/ContentLockState.tsx`
- Create: `src/components/subscription/ContentLockState.test.tsx`

- [ ] **Step 1: Run impact analysis**

Run GitNexus context/impact for `ContentLockModal` and `ContentLockOverlay` to understand existing subscription lock UI.

Expected: low-risk, local subscription UI references.

- [ ] **Step 2: Write failing component tests**

Create `src/components/subscription/ContentLockState.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ContentLockState } from './ContentLockState'

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

function renderLock(contentType: 'grammar' | 'listening' = 'grammar') {
  return render(
    <MemoryRouter initialEntries={['/app/grammar/topic-1']}>
      <Routes>
        <Route
          path="/app/grammar/topic-1"
          element={
            <ContentLockState
              title="Used to + V"
              contentType={contentType}
              teaserConfig={{ enabled: true, type: 'theory_only' }}
              backTo={contentType === 'grammar' ? '/app/grammar' : '/app/listening'}
            />
          }
        />
        <Route path="/app/upgrade" element={<LocationProbe />} />
        <Route path="/app/grammar" element={<LocationProbe />} />
        <Route path="/app/listening" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ContentLockState', () => {
  it('shows locked content title and upgrade CTA', () => {
    renderLock()

    expect(screen.getByText('Used to + V')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /nâng cấp pro/i })).toBeInTheDocument()
    expect(screen.getByText(/xem phần lý thuyết/i)).toBeInTheDocument()
  })

  it('navigates to upgrade', async () => {
    const user = userEvent.setup()
    renderLock()

    await user.click(screen.getByRole('button', { name: /nâng cấp pro/i }))

    expect(screen.getByTestId('location')).toHaveTextContent('/app/upgrade')
  })
})
```

- [ ] **Step 3: Verify the test fails**

Run:

```powershell
pnpm vitest run src/components/subscription/ContentLockState.test.tsx
```

Expected: FAIL because component does not exist.

- [ ] **Step 4: Implement `ContentLockState`**

Create `src/components/subscription/ContentLockState.tsx`.

Implementation requirements:

- Props:

```ts
interface ContentLockStateProps {
  title?: string
  contentType: 'grammar' | 'listening'
  teaserConfig?: TeaserConfig
  backTo: '/app/grammar' | '/app/listening'
}
```

- Use `useNavigate`.
- Use project `Button` and `Card`/`neo-card` classes.
- Use lucide icons such as `Lock`, `Crown`, `ArrowLeft`, `Sparkles`.
- Teaser labels must match or be compatible with `ContentLockModal`:

```ts
const TEASER_LABELS: Record<string, string> = {
  title_only: 'Chỉ hiển thị tiêu đề',
  audio_preview: 'Nghe thử 30 giây đầu',
  transcript_preview: 'Xem transcript đoạn đầu',
  theory_only: 'Xem phần lý thuyết',
  partial_exercise: 'Làm thử 2 câu hỏi đầu tiên',
}
```

- Do not render protected content. This component only explains the lock and navigates.

- [ ] **Step 5: Verify the chunk**

Run:

```powershell
pnpm vitest run src/components/subscription/ContentLockState.test.tsx
pnpm tsc -b
```

Expected: component tests PASS and TypeScript build PASS.

- [ ] **Step 6: Commit chunk 2**

Run:

```powershell
git status --short --untracked-files=all
git diff -- src/components/subscription/ContentLockState.tsx src/components/subscription/ContentLockState.test.tsx
```

Run GitNexus `detect_changes`.

Then:

```powershell
git add -- src/components/subscription/ContentLockState.tsx src/components/subscription/ContentLockState.test.tsx
git commit -m "feat: add content lock state"
```

Expected: One atomic UI component commit.

## Chunk 3: Grammar Direct Route Gating

**Files:**
- Modify: `src/pages/grammar/GrammarLessonPage.tsx`
- Create: `src/pages/grammar/GrammarLessonPage.test.tsx`

- [ ] **Step 1: Run impact analysis**

Run GitNexus impact analysis for `GrammarLessonPage`.

Expected: risk should be low/moderate and limited to Grammar route rendering. Warn the user if HIGH or CRITICAL.

- [ ] **Step 2: Write failing Grammar route tests**

Create `src/pages/grammar/GrammarLessonPage.test.tsx`.

Use this setup pattern:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import GrammarLessonPage from './GrammarLessonPage'
import { grammarService } from '@/services/supabase/grammar.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'

vi.mock('@/services/supabase/client', () => ({ isSupabaseConfigured: true, supabase: {} }))
vi.mock('@/services/supabase/grammar.service', () => ({
  grammarService: {
    getTopic: vi.fn(),
    getBlocks: vi.fn(),
    incrementViewCount: vi.fn(),
  },
}))

function renderPage(path = '/app/grammar/topic-pro') {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/app/grammar/:topicId" element={<GrammarLessonPage />} />
          <Route path="/app/grammar" element={<div>Grammar list reached</div>} />
          <Route path="/app/upgrade" element={<div>Upgrade reached</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}
```

Add tests:

- Free user opening Pro topic sees lock state.
- Free user opening Pro topic does not call `getBlocks`.
- Free user opening Pro topic does not call `incrementViewCount`.
- Pro user opening Pro topic renders a known block.
- Free user opening Free topic renders a known block.

- [ ] **Step 3: Verify Grammar tests fail**

Run:

```powershell
pnpm vitest run src/pages/grammar/GrammarLessonPage.test.tsx
```

Expected: at least the Pro/Free blocking tests FAIL because page still fetches blocks and renders content.

- [ ] **Step 4: Implement gating in `GrammarLessonPage`**

Modify `src/pages/grammar/GrammarLessonPage.tsx`:

- Import:

```ts
import { ContentLockState } from '@/components/subscription/ContentLockState'
import { canAccessContent } from '@/utils/contentAccess'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
```

- Read `isPro`:

```ts
const isPro = useSubscriptionStore((s) => s.isPro)
```

- Compute access after topic query:

```ts
const hasAccess = canAccessContent(topic?.access_tier, isPro)
```

- Change `getBlocks` query `enabled`:

```ts
enabled: shouldFetch && Boolean(topicId) && Boolean(topic) && hasAccess
```

- Add lock render before blocks render:

```tsx
if (topic && !hasAccess) {
  return (
    <ContentLockState
      title={topic.title}
      contentType="grammar"
      teaserConfig={topic.teaser_config}
      backTo="/app/grammar"
    />
  )
}
```

- Update `useEffect` so view count increments only when `topic && hasAccess && shouldFetch`.

- [ ] **Step 5: Verify the chunk**

Run:

```powershell
pnpm vitest run src/pages/grammar/GrammarLessonPage.test.tsx src/utils/contentAccess.test.ts src/components/subscription/ContentLockState.test.tsx
pnpm tsc -b
```

Expected: targeted tests PASS and TypeScript build PASS.

- [ ] **Step 6: Commit chunk 3**

Run:

```powershell
git status --short --untracked-files=all
git diff -- src/pages/grammar/GrammarLessonPage.tsx src/pages/grammar/GrammarLessonPage.test.tsx
```

Run GitNexus `detect_changes`.

Then:

```powershell
git add -- src/pages/grammar/GrammarLessonPage.tsx src/pages/grammar/GrammarLessonPage.test.tsx
git commit -m "fix: guard grammar pro direct routes"
```

Expected: One atomic Grammar route guard commit.

## Chunk 4: Listening Metadata Helpers

**Files:**
- Modify: `src/services/supabase/listening.service.ts`
- Create: `src/services/supabase/listening.service.test.ts`
- Modify: `src/types/listening.types.ts`

- [ ] **Step 1: Run impact analysis**

Run GitNexus impact analysis for `listeningService`.

Expected: risk is moderate because several Listening pages depend on this service. Warn if HIGH or CRITICAL.

- [ ] **Step 2: Write failing service tests**

Create `src/services/supabase/listening.service.test.ts` using hoisted Supabase mocks:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listeningService } from './listening.service'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  order: vi.fn(),
}))

vi.mock('@/services/supabase/client', () => ({
  supabase: {
    from: mocks.from,
  },
}))

describe('listeningService content metadata helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.from.mockReturnValue({ select: mocks.select })
    mocks.select.mockReturnValue({ eq: mocks.eq, order: mocks.order })
    mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle, order: mocks.order })
    mocks.order.mockResolvedValue({ data: [], error: null })
  })

  it('fetches topic metadata by topic id without child payloads', async () => {
    mocks.maybeSingle.mockResolvedValueOnce({
      data: {
        id: 'topic-1',
        title: 'ETS 2026',
        access_tier: 'pro',
        teaser_config: { enabled: true, type: 'title_only' },
        is_published: true,
      },
      error: null,
    })

    await expect(listeningService.getTopic('topic-1')).resolves.toEqual(expect.objectContaining({
      id: 'topic-1',
      access_tier: 'pro',
    }))
    expect(mocks.from).toHaveBeenCalledWith('listening_topics')
    expect(mocks.select).toHaveBeenCalledWith('id,title,access_tier,teaser_config,is_published')
  })

  it('fetches parent topic metadata by test id', async () => {
    mocks.maybeSingle.mockResolvedValueOnce({
      data: {
        topic: {
          id: 'topic-1',
          title: 'ETS 2026',
          access_tier: 'pro',
          teaser_config: { enabled: true, type: 'title_only' },
          is_published: true,
        },
      },
      error: null,
    })

    await expect(listeningService.getTopicByTestId('test-1')).resolves.toEqual(expect.objectContaining({
      id: 'topic-1',
    }))
    expect(mocks.from).toHaveBeenCalledWith('listening_tests')
  })

  it('fetches parent topic metadata by part id', async () => {
    mocks.maybeSingle.mockResolvedValueOnce({
      data: {
        test: {
          topic: {
            id: 'topic-1',
            title: 'ETS 2026',
            access_tier: 'pro',
            teaser_config: { enabled: true, type: 'title_only' },
            is_published: true,
          },
        },
      },
      error: null,
    })

    await expect(listeningService.getTopicByPartId('part-1')).resolves.toEqual(expect.objectContaining({
      id: 'topic-1',
    }))
    expect(mocks.from).toHaveBeenCalledWith('listening_parts')
  })
})
```

- [ ] **Step 3: Verify service tests fail**

Run:

```powershell
pnpm vitest run src/services/supabase/listening.service.test.ts
```

Expected: FAIL because metadata helpers do not exist.

- [ ] **Step 4: Add a metadata type**

In `src/types/listening.types.ts`, import the shared teaser type and add:

```ts
import type { TeaserConfig } from '@/types/subscription.types'

export interface ListeningTopicAccess {
  id: string
  title: string
  access_tier?: 'free' | 'pro'
  teaser_config?: TeaserConfig
  is_published?: boolean
}
```

- [ ] **Step 5: Implement metadata mappers and helpers**

Modify `src/services/supabase/listening.service.ts`:

- Import `ListeningTopicAccess`.
- Add mapper:

```ts
const mapDbTopicAccess = (dbTopic: any): ListeningTopicAccess | null => {
  if (!dbTopic) return null
  return {
    id: dbTopic.id,
    title: dbTopic.title,
    access_tier: dbTopic.access_tier || 'free',
    teaser_config: dbTopic.teaser_config || { enabled: true, type: 'title_only' },
    is_published: dbTopic.is_published,
  }
}
```

- Add service methods:

```ts
async getTopic(topicId: string): Promise<ListeningTopicAccess | null> {
  const { data, error } = await supabase
    .from('listening_topics')
    .select('id,title,access_tier,teaser_config,is_published')
    .eq('id', topicId)
    .maybeSingle()

  if (error) throw error
  return mapDbTopicAccess(data)
}
```

For nested helpers, use Supabase embedded selects:

```ts
async getTopicByTestId(testId: string): Promise<ListeningTopicAccess | null> {
  const { data, error } = await supabase
    .from('listening_tests')
    .select('topic:listening_topics(id,title,access_tier,teaser_config,is_published)')
    .eq('id', testId)
    .maybeSingle()

  if (error) throw error
  return mapDbTopicAccess(Array.isArray(data?.topic) ? data.topic[0] : data?.topic)
}

async getTopicByPartId(partId: string): Promise<ListeningTopicAccess | null> {
  const { data, error } = await supabase
    .from('listening_parts')
    .select('test:listening_tests(topic:listening_topics(id,title,access_tier,teaser_config,is_published))')
    .eq('id', partId)
    .maybeSingle()

  if (error) throw error
  const test = Array.isArray(data?.test) ? data.test[0] : data?.test
  const topic = Array.isArray(test?.topic) ? test.topic[0] : test?.topic
  return mapDbTopicAccess(topic)
}
```

- [ ] **Step 6: Verify the chunk**

Run:

```powershell
pnpm vitest run src/services/supabase/listening.service.test.ts
pnpm tsc -b
```

Expected: targeted tests PASS and TypeScript build PASS.

- [ ] **Step 7: Commit chunk 4**

Run:

```powershell
git status --short --untracked-files=all
git diff -- src/services/supabase/listening.service.ts src/services/supabase/listening.service.test.ts src/types/listening.types.ts
```

Run GitNexus `detect_changes`.

Then:

```powershell
git add -- src/services/supabase/listening.service.ts src/services/supabase/listening.service.test.ts src/types/listening.types.ts
git commit -m "feat: add listening access metadata helpers"
```

Expected: One atomic service helper commit.

## Chunk 5: Listening Direct Route Gating

**Files:**
- Modify: `src/pages/listening/TestSelectionPage.tsx`
- Modify: `src/pages/listening/PartSelectionPage.tsx`
- Modify: `src/pages/listening/ListeningSessionPage.tsx`
- Create/modify:
  - `src/pages/listening/TestSelectionPage.test.tsx`
  - `src/pages/listening/PartSelectionPage.test.tsx`
  - `src/pages/listening/ListeningSessionPage.test.tsx`

- [ ] **Step 1: Run impact analysis**

Run GitNexus impact analysis for:

- `TestSelectionPage`
- `PartSelectionPage`
- `ListeningSessionPage`

Expected: risk should be limited to Listening route flow. Warn if HIGH or CRITICAL.

- [ ] **Step 2: Write failing tests for `TestSelectionPage`**

Create `src/pages/listening/TestSelectionPage.test.tsx` with:

- `QueryClientProvider`
- `MemoryRouter` routes for `/app/listening/:topicId`, `/app/listening`, `/app/upgrade`
- mocks:
  - `@/services/supabase/client` with `isSupabaseConfigured: true`
  - `listeningService.getTopic`
  - `listeningService.listTests`
  - `useAuthStore`
  - `useSubscriptionStore`

Required tests:

- Free user + Pro topic sees lock state and `listTests` is not called.
- Pro user + Pro topic sees tests.
- Free user + Free topic sees tests.
- Remote metadata returns `null`: shows a not-found/list fallback, not lock state, and does not call `listTests`.
- Metadata query loading: shows loading state, not an empty list.
- Demo/offline path for `ets2026` still returns demo test without lock.

- [ ] **Step 3: Write failing tests for `PartSelectionPage`**

Create `src/pages/listening/PartSelectionPage.test.tsx`.

Required tests:

- Free user + Pro parent topic by `testId` sees lock state and `listParts` is not called.
- Pro user + Pro parent topic sees parts/start button.
- Remote metadata returns `null`: shows a not-found/list fallback, not lock state, and does not call `listParts`.
- Metadata query loading: shows loading state, not an empty list.
- Demo test id `ets2026-test1` still renders demo parts without lock.

- [ ] **Step 4: Write failing tests for `ListeningSessionPage`**

Create `src/pages/listening/ListeningSessionPage.test.tsx`.

Required tests:

- Free user + Pro parent topic by `partId` sees lock state.
- Free user + Pro parent topic does not call `getPartWithQuestions`.
- Free user + Pro parent topic does not render `AudioPlayer`.
- Pro user + Pro parent topic renders a listening session.
- Demo part id still renders demo session without lock.

Mock `AudioPlayer` to a simple marker:

```ts
vi.mock('@/components/listening/AudioPlayer', () => ({
  AudioPlayer: ({ src }: { src: string }) => <div data-testid="audio-player">{src}</div>,
}))
```

- [ ] **Step 5: Verify tests fail**

Run:

```powershell
pnpm vitest run src/pages/listening/TestSelectionPage.test.tsx src/pages/listening/PartSelectionPage.test.tsx src/pages/listening/ListeningSessionPage.test.tsx
```

Expected: FAIL because route guards are not implemented.

- [ ] **Step 6: Implement `TestSelectionPage` guard**

Modify `src/pages/listening/TestSelectionPage.tsx`:

- Import `ContentLockState`, `canAccessContent`, `useSubscriptionStore`.
- Keep demo topic bypass:

```ts
const isDemoTopic = topicId === 'ets2026'
```

- Add topic metadata query:

```ts
const { data: topicAccess, isLoading: topicLoading } = useQuery({
  queryKey: ['listening-topic-access', topicId, user?.id],
  queryFn: () => listeningService.getTopic(topicId!),
  enabled: shouldUseRemoteData && Boolean(topicId) && !isDemoTopic,
})
```

- Compute access:

```ts
const isPro = useSubscriptionStore((s) => s.isPro)
const hasAccess = !shouldUseRemoteData || isDemoTopic || canAccessContent(topicAccess?.access_tier, isPro)
```

- Render a loading state while topic metadata is loading:

```tsx
if (topicLoading) {
  return (
    <div>
      <h1 className="text-2xl font-black mb-4">{t('listening.selectTest')}</h1>
      <div className="animate-pulse space-y-4">
        <div className="h-16 bg-muted rounded-lg" />
      </div>
    </div>
  )
}
```

- Render a not-found/list fallback when remote metadata resolves to `null`:

```tsx
if (shouldUseRemoteData && !isDemoTopic && !topicAccess) {
  return (
    <div className="text-center py-12">
      <p className="text-lg font-black">{t('common.notFound') || 'Không tìm thấy nội dung'}</p>
      <Button onClick={() => navigate('/app/listening')} className="mt-4">
        {t('listening.backToList')}
      </Button>
    </div>
  )
}
```

- Enable `listTests` only when access is true:

```ts
enabled: Boolean(topicId) && (!shouldUseRemoteData || isDemoTopic || Boolean(topicAccess && hasAccess))
```

- Render `ContentLockState` when `topicAccess && !hasAccess`.

- [ ] **Step 7: Implement `PartSelectionPage` guard**

Modify `src/pages/listening/PartSelectionPage.tsx`:

- Keep `isDemoTest = testId === 'ets2026-test1'`.
- Fetch metadata via `listeningService.getTopicByTestId(testId!)`.
- Show the existing loading skeleton while metadata is loading.
- If remote metadata resolves to `null`, show a not-found/list fallback and do not call `listParts`.
- Enable `listParts` only after access passes.
- Render `ContentLockState` with `contentType="listening"` and `backTo="/app/listening"` when blocked.

- [ ] **Step 8: Implement `ListeningSessionPage` guard**

Modify `src/pages/listening/ListeningSessionPage.tsx`:

- Keep demo part detection:

```ts
const isDemoPart = partId?.startsWith('ets2026') || !partId?.includes('-')
```

- Fetch metadata via `listeningService.getTopicByPartId(partId!)` only for remote non-demo parts.
- Enable `getPartWithQuestions` only after access passes.
- Render `ContentLockState` before rendering `AudioPlayer` when blocked.
- Treat missing metadata as not-found, not upgrade.

- [ ] **Step 9: Verify the chunk**

Run:

```powershell
pnpm vitest run src/pages/listening/TestSelectionPage.test.tsx src/pages/listening/PartSelectionPage.test.tsx src/pages/listening/ListeningSessionPage.test.tsx src/services/supabase/listening.service.test.ts src/utils/contentAccess.test.ts src/components/subscription/ContentLockState.test.tsx
pnpm tsc -b
```

Expected: targeted tests PASS and TypeScript build PASS.

- [ ] **Step 10: Commit chunk 5**

Run:

```powershell
git status --short --untracked-files=all
git diff -- src/pages/listening/TestSelectionPage.tsx src/pages/listening/PartSelectionPage.tsx src/pages/listening/ListeningSessionPage.tsx src/pages/listening/TestSelectionPage.test.tsx src/pages/listening/PartSelectionPage.test.tsx src/pages/listening/ListeningSessionPage.test.tsx
```

Run GitNexus `detect_changes`.

Then:

```powershell
git add -- src/pages/listening/TestSelectionPage.tsx src/pages/listening/PartSelectionPage.tsx src/pages/listening/ListeningSessionPage.tsx src/pages/listening/TestSelectionPage.test.tsx src/pages/listening/PartSelectionPage.test.tsx src/pages/listening/ListeningSessionPage.test.tsx
git commit -m "fix: guard listening pro direct routes"
```

Expected: One atomic Listening route guard commit.

## Chunk 6: Conditional Database/RLS Hardening

**Files:**
- Create conditionally: `supabase/migrations/<timestamp>_harden_content_gating_rls.sql`

- [ ] **Step 1: Confirm package 2 DB helper availability**

Run:

```powershell
rg -n "create or replace function public\\.is_user_pro|CREATE OR REPLACE FUNCTION public\\.is_user_pro" supabase/migrations
```

Expected:

- If found, proceed with this chunk.
- If not found, skip migration creation, record a follow-up before production rollout, and do not claim DB-level hardening is complete.

- [ ] **Step 2: Create migration if helper exists**

Run:

```powershell
npx supabase migration new harden_content_gating_rls
```

Expected: new timestamped migration file under `supabase/migrations/`.

- [ ] **Step 3: Add RLS policy updates**

Use the generated file and add SQL like:

```sql
-- Harden child payload reads for content gating.
-- Requires public.is_user_pro(uuid) from package 2.

drop policy if exists "anyone can view published listening tests" on public.listening_tests;
create policy "users can view accessible published listening tests" on public.listening_tests
  for select to authenticated
  using (exists (
    select 1
    from public.listening_topics top
    where top.id = topic_id
      and (
        public.is_admin()
        or (
          top.is_published = true
          and (
            coalesce(top.access_tier, 'free') = 'free'
            or public.is_user_pro(auth.uid())
          )
        )
      )
  ));

drop policy if exists "anyone can view published listening parts" on public.listening_parts;
create policy "users can view accessible published listening parts" on public.listening_parts
  for select to authenticated
  using (exists (
    select 1
    from public.listening_tests t
    join public.listening_topics top on top.id = t.topic_id
    where t.id = test_id
      and (
        public.is_admin()
        or (
          top.is_published = true
          and (
            coalesce(top.access_tier, 'free') = 'free'
            or public.is_user_pro(auth.uid())
          )
        )
      )
  ));

drop policy if exists "anyone can view blocks of published topics" on public.lesson_blocks;
create policy "users can view accessible blocks of published topics" on public.lesson_blocks
  for select to authenticated
  using (exists (
    select 1
    from public.grammar_topics t
    where t.id = topic_id
      and (
        public.is_admin()
        or (
          t.is_published = true
          and (
            coalesce(t.access_tier, 'free') = 'free'
            or public.is_user_pro(auth.uid())
          )
        )
      )
  ));

drop policy if exists "anyone can view grammar exercises" on public.grammar_exercises;
create policy "users can view accessible grammar exercises" on public.grammar_exercises
  for select to authenticated
  using (exists (
    select 1
    from public.grammar_topics t
    where t.id = topic_id
      and (
        public.is_admin()
        or (
          t.is_published = true
          and (
            coalesce(t.access_tier, 'free') = 'free'
            or public.is_user_pro(auth.uid())
          )
        )
      )
  ));
```

Do not change topic read policies; Free users must still see topic metadata and teaser prompts.

- [ ] **Step 4: Verify migration syntax if local Supabase is available**

Run:

```powershell
npx supabase migration list
```

Expected: migration list succeeds.

If local Docker Supabase is available:

```powershell
npx supabase db reset
```

Expected: all migrations apply successfully.

If Docker/local Supabase is not available, record the blocker and require reviewed remote SQL application before production.

- [ ] **Step 5: Add RLS behavior smoke verification**

Create a temporary SQL scratch file outside the commit, for example `tmp/content-gating-rls-smoke.sql`. Do not commit it.

The smoke script should run in a transaction and verify:

- Topic metadata for Free and Pro topics remains readable to authenticated users.
- Free authenticated user can select child rows for a Free topic:
  - `lesson_blocks`
  - `listening_tests`
  - `listening_parts`
  - `grammar_exercises` if still present.
- Free authenticated user cannot select child rows for a Pro topic.
- Pro authenticated user can select child rows for a Pro topic.
- Admin can select and manage child rows for Free and Pro topics.

Use local test rows and transaction-local JWT claims. Adapt claim setup to the repo's existing `public.is_admin()` and package 2's `public.is_user_pro()` implementation:

```sql
begin;

-- Example pattern only; confirm against local auth helpers before relying on it.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Insert Free and Pro topics plus child rows, then SELECT as Free/Pro/Admin contexts.
-- Use count assertions or inspected result rows.

rollback;
```

Expected:

- Free user receives rows for Free topic children and no rows for Pro topic children.
- Pro user receives rows for Pro topic children.
- Topic metadata remains readable for list/teaser UX.
- Admin paths still work.

If local Supabase cannot run this smoke script, record the exact blocker and require remote SQL-editor verification before production rollout.

- [ ] **Step 6: Commit chunk 6 if migration was created**

Run:

```powershell
git status --short --untracked-files=all
git diff -- supabase/migrations/<timestamp>_harden_content_gating_rls.sql
```

Run GitNexus `detect_changes`.

Then:

```powershell
git add -- supabase/migrations/<timestamp>_harden_content_gating_rls.sql
git commit -m "fix: harden content gating RLS"
```

Expected: One atomic migration commit, or no commit if helper was unavailable and migration was intentionally skipped.

## Chunk 7: Final Verification And Documentation

**Files:**
- Modify: `CLAUDE.md` only if needed.

- [ ] **Step 1: Run all targeted tests**

Run:

```powershell
pnpm vitest run src/utils/contentAccess.test.ts src/components/subscription/ContentLockState.test.tsx src/pages/grammar/GrammarLessonPage.test.tsx src/services/supabase/listening.service.test.ts src/pages/listening/TestSelectionPage.test.tsx src/pages/listening/PartSelectionPage.test.tsx src/pages/listening/ListeningSessionPage.test.tsx
```

Expected: all targeted tests PASS.

- [ ] **Step 2: Run TypeScript build**

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

Expected: PASS. If not practical or failing due unrelated existing tests, record exact blocker.

- [ ] **Step 4: Manual verification**

After package 2 subscription state is reliable and any required migration is applied:

- Free user opens `/app/grammar/:topicId` for a Pro topic and sees lock state.
- Free user does not see grammar blocks or increment view count for blocked topic.
- Free user opens `/app/listening/:topicId` for a Pro topic and sees lock state.
- Free user opens `/app/listening/:topicId/:testId` under a Pro topic and sees lock state.
- Free user opens `/app/listening/session/:partId/test` under a Pro topic and sees lock state.
- Pro user opens the same routes and sees real content.
- Demo/offline Listening routes still render demo data.

- [ ] **Step 5: Update `CLAUDE.md` if implementation confirms new behavior**

Add a short note under subscription/content gating context only if the final implemented behavior is not already documented.

- [ ] **Step 6: Commit documentation if changed**

Run:

```powershell
git status --short --untracked-files=all
git diff -- CLAUDE.md
```

Run GitNexus `detect_changes`.

Then:

```powershell
git add -- CLAUDE.md
git commit -m "docs: document content gating behavior"
```

Expected: documentation-only commit, only if `CLAUDE.md` changed.

- [ ] **Step 7: Continue to package 4**

After package 3 is implemented, verified, and committed:

1. Create a separate design spec for **Admin/UI Compliance**.
2. Focus on removing `alert`, `window.confirm`, and native `<select>/<option>` from admin pages.
3. Use `ConfirmModal`, project `Select`, toast/custom error UI, and UI verification.
4. Review and commit spec 4.
5. Create implementation plan for spec 4.
6. Implement, verify, and commit package 4.
7. Run final cross-package audit for packages 1-4 before production deployment.

## Notes For Implementers

- Do not implement package 4 Admin/UI Compliance in this package.
- Do not redesign teaser UI into real previews in this package.
- Do not hide Pro topics from list pages.
- Do not fetch Grammar blocks or Listening audio/transcript/questions before direct-route access is known.
- Do not apply remote Supabase migrations without explicit user approval.
- Do not use `git add -A` or `git add .`.
- Do not stage unrelated current dirty files such as existing `.gitignore` changes or unrelated files under `docs/`.
