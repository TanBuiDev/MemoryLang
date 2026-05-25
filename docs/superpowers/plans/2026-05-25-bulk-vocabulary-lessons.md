# Bulk Vocabulary Lessons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let signed-in learners split selected vocabulary into randomized lesson decks and open a deck-scoped translation quiz after completing that lesson's flashcards.

**Architecture:** Keep `decks` and `deck_terms` as the only persisted lesson model. Add a pure lesson-batch planner for shuffle/chunk/name logic, add a service orchestration method that reports partial creation honestly, connect it to the vocabulary selection UI, and pass a completed deck handoff from flashcard study back to the existing validated quiz setup flow.

**Tech Stack:** React 19, TypeScript 6, Zustand, TanStack React Query, React Router, Supabase, Vitest, Testing Library, Tailwind CSS v4.

---

## Execution Context

- The design source is `docs/superpowers/specs/2026-05-25-bulk-vocabulary-lessons-design.md`.
- The worktree already contains uncommitted edits in quiz/study/audio/i18n/CSS files. Before each task, inspect `git status --short` and the diff for every file the task will touch; preserve and integrate existing changes rather than replacing them.
- Before implementation begins, either complete/commit the overlapping quiz/study/i18n work already in this worktree or create an isolated worktree and deliberately reconcile that work before merging. Do not create an atomic feature commit that silently includes unrelated pre-existing hunks from `src/i18n/index.ts` or `src/pages/study/FlashcardStudyPage.tsx`.
- Bulk lesson creation is remote-only in this MVP. Demo mode continues to display vocabulary and existing demo decks, but does not invent saved lesson decks.
- The post-study CTA opens `/app/quiz` with the completed deck preselected. `QuizSetupPage` remains responsible for translation preflight and starting a fresh persisted quiz session, so the CTA never bypasses existing validation.

## File Structure

| File | Responsibility |
| --- | --- |
| `src/features/decks/bulkLessons.ts` | Pure validation, random shuffle/chunk, and sequential `Bai hoc NN` naming. |
| `src/features/decks/bulkLessons.test.ts` | Pin down no-loss/no-duplicate grouping, numbering, and invalid limits. |
| `src/services/supabase/deck.service.ts` | Persist a prepared batch of lesson decks and return complete or partial results. |
| `src/services/supabase/deck.service.test.ts` | Protect insert/link calls and failure-after-partial-creation reporting. |
| `src/pages/vocabulary/VocabularyListPage.tsx` | Reuse selection mode, render create-lessons modal/feedback, and invoke the domain/service flow. |
| `src/pages/vocabulary/VocabularyListPage.test.tsx` | Exercise selection, projected lesson count, mutation inputs, success link, and partial error UI. |
| `src/pages/study/FlashcardStudyPage.tsx` | Include the completed `deck_id` in navigation state only after confirmed completion. |
| `src/pages/study/FlashcardStudyPage.test.tsx` | Prove completion passes a deck handoff while discard does not. |
| `src/pages/study/StudySetupPage.tsx` | Render the recent-completion CTA, preflight translated terms, and preselect quiz source. |
| `src/pages/study/StudySetupPage.test.tsx` | Cover available/unavailable quiz CTA and navigation to preselected quiz setup. |
| `src/i18n/index.ts` | Add bilingual vocabulary-batch and study-to-quiz messaging. |
| `CLAUDE.md`, `README.md` | Record the implemented workflow after verification succeeds. |

No database migration is planned: `decks`, `deck_terms`, and the existing session state are sufficient.

### Task 1: Add The Pure Lesson Batch Planner

**Files:**
- Create: `src/features/decks/bulkLessons.ts`
- Create: `src/features/decks/bulkLessons.test.ts`

- [ ] **Step 1: Write failing planner tests**

Create `src/features/decks/bulkLessons.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildLessonBatch, getNextLessonNumber } from '@/features/decks/bulkLessons'

describe('getNextLessonNumber', () => {
  it('continues only lesson names matching the generated naming pattern', () => {
    expect(getNextLessonNumber([
      { name: 'Bai hoc 01' },
      { name: 'Bai hoc 05' },
      { name: 'Travel 99' },
    ])).toBe(6)
  })
})

describe('buildLessonBatch', () => {
  it('shuffles then chunks selected term ids without losing or repeating ids', () => {
    const batch = buildLessonBatch(
      ['term-1', 'term-2', 'term-3', 'term-4', 'term-5'],
      2,
      [{ name: 'Bai hoc 02' }],
      () => 0,
    )

    expect(batch.map((lesson) => lesson.name)).toEqual(['Bai hoc 03', 'Bai hoc 04', 'Bai hoc 05'])
    expect(batch.map((lesson) => lesson.termIds.length)).toEqual([2, 2, 1])
    expect(batch.flatMap((lesson) => lesson.termIds).sort()).toEqual(
      ['term-1', 'term-2', 'term-3', 'term-4', 'term-5'],
    )
  })

  it('creates one lesson when the limit exceeds selected vocabulary count', () => {
    expect(buildLessonBatch(['term-1', 'term-2'], 20, [], () => 0)).toHaveLength(1)
  })

  it.each([0, -1, 1.5, Number.NaN])('rejects invalid words-per-lesson values: %s', (limit) => {
    expect(() => buildLessonBatch(['term-1'], limit, [])).toThrow('wordsPerLesson')
  })
})
```

- [ ] **Step 2: Run the focused test to prove the module is missing**

Run:

```bash
pnpm exec vitest run src/features/decks/bulkLessons.test.ts
```

Expected: FAIL because `@/features/decks/bulkLessons` does not exist.

- [ ] **Step 3: Implement the planner with a small, stable contract**

Create `src/features/decks/bulkLessons.ts`:

```ts
import { shuffle } from '@/utils/shuffle'

const LESSON_NAME_PATTERN = /^Bai hoc (\d+)$/

export interface LessonDraft {
  name: string
  termIds: string[]
}

export function getNextLessonNumber(existingDecks: Array<{ name: string }>) {
  const highest = existingDecks.reduce((max, deck) => {
    const match = LESSON_NAME_PATTERN.exec(deck.name)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)

  return highest + 1
}

export function buildLessonBatch(
  selectedTermIds: string[],
  wordsPerLesson: number,
  existingDecks: Array<{ name: string }>,
  random: () => number = Math.random,
): LessonDraft[] {
  if (!Number.isInteger(wordsPerLesson) || wordsPerLesson < 1) {
    throw new Error('wordsPerLesson must be a positive integer')
  }

  const uniqueIds = Array.from(new Set(selectedTermIds))
  const shuffledIds = shuffle(uniqueIds, random)
  const firstNumber = getNextLessonNumber(existingDecks)

  return Array.from(
    { length: Math.ceil(shuffledIds.length / wordsPerLesson) },
    (_, index) => ({
      name: `Bai hoc ${String(firstNumber + index).padStart(2, '0')}`,
      termIds: shuffledIds.slice(index * wordsPerLesson, (index + 1) * wordsPerLesson),
    }),
  )
}
```

- [ ] **Step 4: Run planner tests and commit this independent domain unit**

Run:

```bash
pnpm exec vitest run src/features/decks/bulkLessons.test.ts
```

Expected: PASS.

Commit:

```bash
git add src/features/decks/bulkLessons.ts src/features/decks/bulkLessons.test.ts
git commit -m "feat: add bulk lesson batch planner"
```

### Task 2: Persist Prepared Lesson Batches With Partial-Result Reporting

**Files:**
- Modify: `src/services/supabase/deck.service.ts`
- Create: `src/services/supabase/deck.service.test.ts`

- [ ] **Step 1: Write failing service tests**

Create `src/services/supabase/deck.service.test.ts` using the existing service mocking style:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deckService } from '@/services/supabase/deck.service'

const from = vi.fn()

vi.mock('@/services/supabase/client', () => ({
  supabase: { from: (...args: unknown[]) => from(...args) },
}))

function createdDeck(id: string, name: string) {
  return {
    id,
    user_id: 'user-1',
    name,
    description: null,
    source_language: 'en',
    native_language: 'vi',
    color: null,
    icon: null,
    created_at: '2026-05-25T00:00:00.000Z',
    updated_at: '2026-05-25T00:00:00.000Z',
  } as const
}

describe('deckService.createLessonBatch', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates each prepared lesson and links only its selected term ids', async () => {
    const insertLinks = vi.fn().mockResolvedValue({ error: null })
    const create = vi.spyOn(deckService, 'create')
      .mockResolvedValueOnce(createdDeck('deck-1', 'Bai hoc 01'))
      .mockResolvedValueOnce(createdDeck('deck-2', 'Bai hoc 02'))
    from.mockReturnValue({ insert: insertLinks })

    const result = await deckService.createLessonBatch({
      base: { user_id: 'user-1', source_language: 'en', native_language: 'vi' },
      lessons: [
        { name: 'Bai hoc 01', termIds: ['term-1', 'term-2'] },
        { name: 'Bai hoc 02', termIds: ['term-3'] },
      ],
    })

    expect(create).toHaveBeenCalledTimes(2)
    expect(insertLinks).toHaveBeenNthCalledWith(1, [
      { deck_id: 'deck-1', user_term_id: 'term-1' },
      { deck_id: 'deck-1', user_term_id: 'term-2' },
    ])
    expect(result).toEqual({ createdDecks: expect.arrayContaining([expect.objectContaining({ id: 'deck-1' }), expect.objectContaining({ id: 'deck-2' })]), error: null })
  })

  it('returns already-created decks when a later lesson cannot be created', async () => {
    vi.spyOn(deckService, 'create')
      .mockResolvedValueOnce(createdDeck('deck-1', 'Bai hoc 01'))
      .mockRejectedValueOnce(new Error('insert failed'))
    from.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: null }) })

    const result = await deckService.createLessonBatch({
      base: { user_id: 'user-1', source_language: 'en', native_language: 'vi' },
      lessons: [
        { name: 'Bai hoc 01', termIds: ['term-1'] },
        { name: 'Bai hoc 02', termIds: ['term-2'] },
      ],
    })

    expect(result.createdDecks.map((deck) => deck.name)).toEqual(['Bai hoc 01'])
    expect(result.error).toBeInstanceOf(Error)
  })
})
```

- [ ] **Step 2: Run the service test to confirm the batch API is absent**

Run:

```bash
pnpm exec vitest run src/services/supabase/deck.service.test.ts
```

Expected: FAIL because `createLessonBatch` is not defined.

- [ ] **Step 3: Add explicit input/result types and sequential persistence**

Modify `src/services/supabase/deck.service.ts`:

```ts
import type { LessonDraft } from '@/features/decks/bulkLessons'

export interface CreateLessonBatchInput {
  base: Omit<DeckInput, 'name'>
  lessons: LessonDraft[]
}

export interface CreateLessonBatchResult {
  createdDecks: Deck[]
  error: unknown | null
}
```

Add this method inside `deckService` after `create()`:

```ts
  async createLessonBatch({ base, lessons }: CreateLessonBatchInput): Promise<CreateLessonBatchResult> {
    const createdDecks: Deck[] = []

    try {
      for (const lesson of lessons) {
        const deck = await deckService.create({ ...base, name: lesson.name })
        createdDecks.push(deck)
        const { error } = await supabase.from('deck_terms').insert(
          lesson.termIds.map((user_term_id) => ({ deck_id: deck.id, user_term_id })),
        )
        if (error) throw error
      }

      return { createdDecks, error: null }
    } catch (error) {
      return { createdDecks, error }
    }
  },
```

This intentionally does not delete a deck created before a later failure. If linking fails after deck creation, that deck is included in `createdDecks` and the UI reports an incomplete batch rather than promising a complete lesson.

- [ ] **Step 4: Cover a term-link failure as a partial created batch**

Add to `src/services/supabase/deck.service.test.ts`:

```ts
  it('includes a created deck when linking its terms fails', async () => {
    vi.spyOn(deckService, 'create').mockResolvedValueOnce(createdDeck('deck-1', 'Bai hoc 01'))
    from.mockReturnValue({ insert: vi.fn().mockResolvedValue({ error: new Error('link failed') }) })

    const result = await deckService.createLessonBatch({
      base: { user_id: 'user-1', source_language: 'en', native_language: 'vi' },
      lessons: [{ name: 'Bai hoc 01', termIds: ['term-1'] }],
    })

    expect(result.createdDecks.map((deck) => deck.id)).toEqual(['deck-1'])
    expect(result.error).toBeInstanceOf(Error)
  })
```

- [ ] **Step 5: Run service tests and commit**

Run:

```bash
pnpm exec vitest run src/services/supabase/deck.service.test.ts src/features/decks/bulkLessons.test.ts
```

Expected: PASS.

Commit:

```bash
git add src/services/supabase/deck.service.ts src/services/supabase/deck.service.test.ts
git commit -m "feat: create lesson decks in batches"
```

### Task 3: Create Lesson Decks From Vocabulary Selection Mode

**Files:**
- Modify: `src/pages/vocabulary/VocabularyListPage.tsx`
- Create: `src/pages/vocabulary/VocabularyListPage.test.tsx`
- Modify: `src/i18n/index.ts`

- [ ] **Step 1: Write failing vocabulary UI tests around the existing selection mode**

Create `src/pages/vocabulary/VocabularyListPage.test.tsx`. Mock virtualization so the two visible vocabulary cards render deterministically, and mock `deckService` in addition to the page's existing vocabulary dependencies:

```ts
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { demoVocabulary } from '@/features/demo/demoData'
import { VocabularyListPage } from '@/pages/vocabulary/VocabularyListPage'
import { deckService } from '@/services/supabase/deck.service'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 180,
    getVirtualItems: () => Array.from({ length: count }, (_, index) => ({ index, key: index, start: index * 180 })),
    measureElement: vi.fn(),
  }),
}))
vi.mock('@/services/supabase/client', () => ({ isSupabaseConfigured: true, supabase: {} }))
vi.mock('@/services/supabase/vocabulary.service', () => ({
  vocabularyService: { list: vi.fn(), removeMany: vi.fn() },
}))
vi.mock('@/services/supabase/deck.service', () => ({
  deckService: { list: vi.fn(), createLessonBatch: vi.fn() },
}))
vi.mock('@/services/local/studyLocalDb', () => ({
  studyLocalDb: { getCachedVocabulary: vi.fn().mockResolvedValue([]), cacheVocabulary: vi.fn(), flushPendingMutations: vi.fn().mockResolvedValue(undefined) },
}))
vi.mock('@/hooks/useOnlineStatus', () => ({ useOnlineStatus: () => false }))
vi.mock('@/utils/audio', () => ({ speak: vi.fn() }))

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><VocabularyListPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('VocabularyListPage bulk lessons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      user: { id: 'user-1' } as never,
      profile: { current_target_language: 'en', native_language: 'vi' } as never,
    })
    vi.mocked(vocabularyService.list).mockResolvedValue(demoVocabulary.slice(0, 2))
    vi.mocked(deckService.list).mockResolvedValue([{ name: 'Bai hoc 04' }] as never)
  })

  it('projects generated lesson count from selected words and lesson size', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Chọn' }))
    await user.click(screen.getByRole('button', { name: 'Chọn tất cả' }))
    await user.click(screen.getByRole('button', { name: 'Tạo bài học' }))
    await user.clear(screen.getByLabelText('Số từ mỗi bài'))
    await user.type(screen.getByLabelText('Số từ mỗi bài'), '1')
    expect(screen.getByText('Sẽ tạo 2 bài học')).toBeInTheDocument()
  })

  it('creates named lesson batches from selected vocabulary and links to the first result', async () => {
    const user = userEvent.setup()
    vi.mocked(deckService.createLessonBatch).mockResolvedValue({
      createdDecks: [{ id: 'deck-5', name: 'Bai hoc 05' } as never],
      error: null,
    })
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Chọn' }))
    await user.click(screen.getByRole('button', { name: 'Chọn tất cả' }))
    await user.click(screen.getByRole('button', { name: 'Tạo bài học' }))
    await user.click(screen.getByRole('button', { name: 'Xác nhận tạo bài' }))

    expect(deckService.createLessonBatch).toHaveBeenCalledWith(expect.objectContaining({
      base: expect.objectContaining({ user_id: 'user-1', source_language: 'en', native_language: 'vi' }),
      lessons: [expect.objectContaining({ name: 'Bai hoc 05' })],
    }))
    expect(await screen.findByRole('link', { name: 'Mở Bai hoc 05' })).toHaveAttribute('href', '/app/decks/deck-5')
  })

  it('reports created lessons without claiming full success when persistence is partial', async () => {
    const user = userEvent.setup()
    vi.mocked(deckService.createLessonBatch).mockResolvedValue({
      createdDecks: [{ id: 'deck-5', name: 'Bai hoc 05' } as never],
      error: new Error('link failed'),
    })
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Chọn' }))
    await user.click(screen.getByRole('button', { name: 'Chọn tất cả' }))
    await user.click(screen.getByRole('button', { name: 'Tạo bài học' }))
    await user.click(screen.getByRole('button', { name: 'Xác nhận tạo bài' }))
    expect(await screen.findByText('Đã tạo 1 bài học, nhưng lô tạo chưa hoàn tất.')).toBeInTheDocument()
  })

  it('reports failure and retains selection when no lesson can be created', async () => {
    const user = userEvent.setup()
    vi.mocked(deckService.createLessonBatch).mockResolvedValue({
      createdDecks: [],
      error: new Error('insert failed'),
    })
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Chọn' }))
    await user.click(screen.getByRole('button', { name: 'Chọn tất cả' }))
    await user.click(screen.getByRole('button', { name: 'Tạo bài học' }))
    await user.click(screen.getByRole('button', { name: 'Xác nhận tạo bài' }))
    expect(await screen.findByText('Không thể tạo bài học. Vui lòng thử lại.')).toBeInTheDocument()
    expect(screen.getByText('2 đã chọn')).toBeInTheDocument()
  })
})
```

The visible labels use the app's accented Vietnamese UI style; only the persisted generated deck name follows the approved `Bai hoc NN` naming convention.

- [ ] **Step 2: Run the UI test to confirm modal/action behavior is absent**

Run:

```bash
pnpm exec vitest run src/pages/vocabulary/VocabularyListPage.test.tsx
```

Expected: FAIL because there is no `Tạo bài học` action or lesson batch mutation.

- [ ] **Step 3: Add bilingual labels and feedback**

Modify both locale sections in `src/i18n/index.ts` with equivalent visible strings:

```ts
'vocabulary.createLessons': 'Create lessons',
'vocabulary.createLessonsTitle': 'Create lesson decks',
'vocabulary.wordsPerLesson': 'Words per lesson',
'vocabulary.lessonProjection': 'Will create {count} lessons',
'vocabulary.confirmCreateLessons': 'Create lessons',
'vocabulary.lessonsCreated': 'Created {count} lessons.',
'vocabulary.lessonsPartiallyCreated': 'Created {count} lessons, but the batch did not finish.',
'vocabulary.openCreatedLesson': 'Open {name}',
'vocabulary.lessonCreateFailed': 'Could not create lessons. Please try again.',
```

```ts
'vocabulary.createLessons': 'Tạo bài học',
'vocabulary.createLessonsTitle': 'Tạo các bài học',
'vocabulary.wordsPerLesson': 'Số từ mỗi bài',
'vocabulary.lessonProjection': 'Sẽ tạo {count} bài học',
'vocabulary.confirmCreateLessons': 'Xác nhận tạo bài',
'vocabulary.lessonsCreated': 'Đã tạo {count} bài học.',
'vocabulary.lessonsPartiallyCreated': 'Đã tạo {count} bài học, nhưng lô tạo chưa hoàn tất.',
'vocabulary.openCreatedLesson': 'Mở {name}',
'vocabulary.lessonCreateFailed': 'Không thể tạo bài học. Vui lòng thử lại.',
```

- [ ] **Step 4: Add a decks query and lesson mutation to `VocabularyListPage`**

Import `Label`, `buildLessonBatch`, `deckService`, and `Deck`. Add the query and state next to the current selection/delete state:

```ts
const profile = useAuthStore((state) => state.profile)
const decksQuery = useQuery({
  queryKey: ['decks', user?.id],
  queryFn: () => deckService.list(user!.id),
  enabled: shouldUseRemoteData,
})
const [lessonModalOpen, setLessonModalOpen] = useState(false)
const [wordsPerLesson, setWordsPerLesson] = useState('10')
const [lessonFeedback, setLessonFeedback] = useState<{ createdDecks: Deck[]; partial: boolean } | null>(null)
const parsedWordsPerLesson = Number(wordsPerLesson)
const canCreateLessons = selectedIds.size > 0
  && Number.isInteger(parsedWordsPerLesson)
  && parsedWordsPerLesson > 0
const projectedLessonCount = canCreateLessons
  ? Math.ceil(selectedIds.size / parsedWordsPerLesson)
  : 0
```

Add the mutation:

```ts
const createLessonsMutation = useMutation({
  mutationFn: async () => {
    const result = await deckService.createLessonBatch({
      base: {
        user_id: user!.id,
        source_language: profile?.current_target_language ?? 'en',
        native_language: profile?.native_language ?? 'vi',
      },
      lessons: buildLessonBatch(
        Array.from(selectedIds),
        parsedWordsPerLesson,
        decksQuery.data ?? [],
      ),
    })
    if (result.error && result.createdDecks.length === 0) throw result.error
    return result
  },
  onSuccess: async (result) => {
    setLessonModalOpen(false)
    setLessonFeedback({ createdDecks: result.createdDecks, partial: Boolean(result.error) })
    if (!result.error) exitSelectMode()
    await queryClient.invalidateQueries({ queryKey: ['decks', user?.id] })
  },
})
```

When `result.error` is present, retain selection so the learner can inspect the incomplete result before choosing how to proceed. Do not enqueue offline mutations for deck creation.

- [ ] **Step 5: Extend existing selection actions and render the creation modal/feedback**

In `headerActions`, add the create action before delete:

```tsx
<Button
  variant="secondary"
  disabled={selectedIds.size === 0 || !shouldUseRemoteData}
  onClick={() => setLessonModalOpen(true)}
>
  {t('vocabulary.createLessons')}
</Button>
```

Render feedback near the header and use the reusable `ConfirmModal` for input:

```tsx
{lessonFeedback ? (
  <Card className="mb-4">
    <p className="font-black">
      {t(lessonFeedback.partial ? 'vocabulary.lessonsPartiallyCreated' : 'vocabulary.lessonsCreated', {
        count: lessonFeedback.createdDecks.length,
      })}
    </p>
    {lessonFeedback.createdDecks[0] ? (
      <Button asChild className="mt-3">
        <Link to={`/app/decks/${lessonFeedback.createdDecks[0].id}`}>
          {t('vocabulary.openCreatedLesson', { name: lessonFeedback.createdDecks[0].name })}
        </Link>
      </Button>
    ) : null}
  </Card>
) : null}
<ConfirmModal
  open={lessonModalOpen}
  title={t('vocabulary.createLessonsTitle')}
  confirmLabel={t('vocabulary.confirmCreateLessons')}
  cancelLabel={t('actions.cancel')}
  variant="primary"
  confirmDisabled={!canCreateLessons || createLessonsMutation.isPending}
  onCancel={() => setLessonModalOpen(false)}
  onConfirm={() => createLessonsMutation.mutate()}
>
  <Label htmlFor="words-per-lesson">{t('vocabulary.wordsPerLesson')}</Label>
  <Input
    id="words-per-lesson"
    type="number"
    min={1}
    value={wordsPerLesson}
    onChange={(event) => setWordsPerLesson(event.target.value)}
  />
  {canCreateLessons ? <p className="mt-3 font-black">{t('vocabulary.lessonProjection', { count: projectedLessonCount })}</p> : null}
  {createLessonsMutation.error instanceof Error ? <p className="mt-3 text-sm font-black text-danger">{t('vocabulary.lessonCreateFailed')}</p> : null}
</ConfirmModal>
```

- [ ] **Step 6: Run UI/domain/service tests and commit**

Run:

```bash
pnpm exec vitest run src/pages/vocabulary/VocabularyListPage.test.tsx src/features/decks/bulkLessons.test.ts src/services/supabase/deck.service.test.ts
```

Expected: PASS.

Before staging, inspect the current `src/i18n/index.ts` diff and preserve unrelated quiz/audio labels already in progress. Commit only this task's integrated version:

```bash
git add src/pages/vocabulary/VocabularyListPage.tsx src/pages/vocabulary/VocabularyListPage.test.tsx src/i18n/index.ts
git commit -m "feat: create lessons from selected vocabulary"
```

### Task 4: Hand Off A Completed Study Deck To Translation Quiz Setup

**Files:**
- Modify: `src/pages/study/FlashcardStudyPage.tsx`
- Modify: `src/pages/study/FlashcardStudyPage.test.tsx`
- Modify: `src/pages/study/StudySetupPage.tsx`
- Modify: `src/pages/study/StudySetupPage.test.tsx`
- Modify: `src/i18n/index.ts`

- [ ] **Step 1: Add failing completion-navigation tests in the active flashcard test file**

In `src/pages/study/FlashcardStudyPage.test.tsx`, import `useLocation` and replace the setup route test element with a probe:

```tsx
function StudySetupProbe() {
  const location = useLocation()
  const state = location.state as { completedDeckId?: string } | null
  return <div>Study setup reached {state?.completedDeckId ?? 'without-completed-deck'}</div>
}
```

Use it in `renderPage()`:

```tsx
<Route path="/app/study" element={<StudySetupProbe />} />
```

Extend the existing confirmed-completion test and discard test:

```ts
expect(await screen.findByText('Study setup reached deck-1')).toBeInTheDocument()
```

```ts
expect(await screen.findByText('Study setup reached without-completed-deck')).toBeInTheDocument()
```

- [ ] **Step 2: Add failing `StudySetupPage` CTA tests**

In `src/pages/study/StudySetupPage.test.tsx`, import `Routes`, `demoVocabulary`, `deckService`, `studyService`, and `useQuizStore`; add `listTerms` to the deck service mock; reset `useQuizStore.setState({ selectedDeckId: null })` in `beforeEach`; and let the render helper accept an initial navigation entry plus a destination probe:

```tsx
function renderPage(initialEntry: string | { pathname: string; state?: unknown } = '/app/study') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/app/study" element={<StudySetupPage />} />
          <Route path="/app/quiz" element={<div>Quiz setup reached</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
```

Add these tests using a remote signed-in user:

```ts
it('offers a quiz for the just-completed deck when it has translated terms', async () => {
  const user = userEvent.setup()
  vi.mocked(deckService.list).mockResolvedValue([])
  vi.mocked(deckService.listTerms).mockResolvedValue([{ ...demoVocabulary[0]!, translation: 'qua tao' }])
  vi.mocked(studyService.listRecentSessions).mockResolvedValue([])
  useAuthStore.setState({ user: { id: 'user-1' } as never, profile: null })

  renderPage({ pathname: '/app/study', state: { completedDeckId: 'deck-1' } })
  await user.click(await screen.findByRole('button', { name: 'Kiểm tra bài này' }))

  expect(useQuizStore.getState().selectedDeckId).toBe('deck-1')
  expect(await screen.findByText('Quiz setup reached')).toBeInTheDocument()
})

  it('explains why a completed deck cannot be tested when no translations exist', async () => {
  vi.mocked(deckService.list).mockResolvedValue([])
  vi.mocked(deckService.listTerms).mockResolvedValue([{ ...demoVocabulary[0]!, translation: null }])
  vi.mocked(studyService.listRecentSessions).mockResolvedValue([])
  useAuthStore.setState({ user: { id: 'user-1' } as never, profile: null })

  renderPage({ pathname: '/app/study', state: { completedDeckId: 'deck-1' } })

  expect(await screen.findByText('Bổ sung bản dịch trước khi kiểm tra bài này.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Kiểm tra bài này' })).toBeDisabled()
})

it('allows retrying completed-deck quiz availability after loading fails', async () => {
  const user = userEvent.setup()
  vi.mocked(deckService.list).mockResolvedValue([])
  vi.mocked(deckService.listTerms)
    .mockRejectedValueOnce(new Error('network'))
    .mockResolvedValueOnce([{ ...demoVocabulary[0]!, translation: 'qua tao' }])
  vi.mocked(studyService.listRecentSessions).mockResolvedValue([])
  useAuthStore.setState({ user: { id: 'user-1' } as never, profile: null })

  renderPage({ pathname: '/app/study', state: { completedDeckId: 'deck-1' } })
  expect(await screen.findByText('Không kiểm tra được dữ liệu bài. Hãy tải lại và thử lại.')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Thử lại' }))
  expect(await screen.findByRole('button', { name: 'Kiểm tra bài này' })).toBeEnabled()
})
```

- [ ] **Step 3: Run study tests to verify handoff behavior is absent**

Run:

```bash
pnpm exec vitest run src/pages/study/FlashcardStudyPage.test.tsx src/pages/study/StudySetupPage.test.tsx
```

Expected: FAIL because completion does not pass deck navigation state and setup has no completed-lesson quiz card.

- [ ] **Step 4: Pass completion state only from confirmed deck completion**

Modify `src/pages/study/FlashcardStudyPage.tsx` without disturbing current audio/auto-play changes:

```ts
function clearSessionAndReturn(completed = false) {
  clearStoredStudySession(sessionKey)
  void studyLocalDb.clearActiveSession(sessionKey)
  clearActiveStudySession({ userId: user?.id, sessionId, remote: shouldUseRemoteData })
  navigate('/app/study', {
    state: completed && selectedDeckId && !isReviewSession
      ? { completedDeckId: selectedDeckId }
      : undefined,
  })
}

function discardIncompleteSession() {
  setAutoEnabled(false)
  setAutoSettingsOpen(false)
  clearSessionAndReturn()
}

function completeSession() {
  setAutoEnabled(false)
  setAutoSettingsOpen(false)
  const extraTermIds = item ? [item.id] : []
  void saveSessionSummary(extraTermIds).finally(() => clearSessionAndReturn(true))
}
```

This must not add a CTA for review sessions or incomplete discards.

- [ ] **Step 5: Render a preflighted quiz CTA on study setup**

Modify `src/pages/study/StudySetupPage.tsx`:

```ts
import { useLocation, useNavigate } from 'react-router-dom'
import { getDemoVocabularyForDeck } from '@/features/demo/demoData'
import { hasTranslation } from '@/features/quiz/translationInputQuiz'
import { useQuizStore } from '@/stores/useQuizStore'
```

Inside the component:

```ts
const location = useLocation()
const completionState = location.state as { completedDeckId?: string } | null
const completedDeckId = completionState?.completedDeckId ?? null
const setQuizDeckId = useQuizStore((state) => state.setSelectedDeckId)
const completedDeckTermsQuery = useQuery({
  queryKey: ['deck-terms', completedDeckId],
  queryFn: () => deckService.listTerms(completedDeckId!),
  enabled: shouldUseRemoteData && Boolean(completedDeckId),
})
const completedDeckVocabulary = filterActiveVocabulary(completedDeckId
  ? shouldUseRemoteData
    ? completedDeckTermsQuery.data ?? []
    : getDemoVocabularyForDeck(completedDeckId)
  : [])
const canQuizCompletedDeck = completedDeckVocabulary.some(hasTranslation)

function openCompletedDeckQuiz() {
  if (!completedDeckId || !canQuizCompletedDeck) return
  setQuizDeckId(completedDeckId)
  navigate('/app/quiz')
}
```

Render above the normal setup cards when `completedDeckId` is present:

```tsx
{completedDeckId ? (
  <Card className="mb-4 bg-primary">
    <CardTitle>{t('study.completedLessonTitle')}</CardTitle>
    <CardDescription className="mt-2">{t('study.completedLessonDescription')}</CardDescription>
    {completedDeckTermsQuery.isError ? (
      <div className="mt-3">
        <p className="font-black text-danger">{t('study.completedLessonQuizLoadError')}</p>
        <Button variant="ghost" className="mt-2" onClick={() => void completedDeckTermsQuery.refetch()}>
          {t('quiz.retryLoad')}
        </Button>
      </div>
    ) : null}
    {!completedDeckTermsQuery.isLoading && !completedDeckTermsQuery.isError && !canQuizCompletedDeck ? (
      <p className="mt-3 font-black">{t('study.completedLessonNeedsTranslation')}</p>
    ) : null}
    <Button className="mt-4" disabled={completedDeckTermsQuery.isLoading || !canQuizCompletedDeck} onClick={openCompletedDeckQuiz}>
      {t('study.quizCompletedLesson')}
    </Button>
  </Card>
) : null}
```

- [ ] **Step 6: Add bilingual completed-lesson CTA copy**

Modify both locale sections in `src/i18n/index.ts`:

```ts
'study.completedLessonTitle': 'Lesson complete',
'study.completedLessonDescription': 'Check what you remember from this lesson now.',
'study.quizCompletedLesson': 'Quiz this lesson',
'study.completedLessonNeedsTranslation': 'Add translations before testing this lesson.',
'study.completedLessonQuizLoadError': 'Could not check quiz availability. Reload and try again.',
```

```ts
'study.completedLessonTitle': 'Đã hoàn thành bài học',
'study.completedLessonDescription': 'Kiểm tra ngay những gì bạn vừa học.',
'study.quizCompletedLesson': 'Kiểm tra bài này',
'study.completedLessonNeedsTranslation': 'Bổ sung bản dịch trước khi kiểm tra bài này.',
'study.completedLessonQuizLoadError': 'Không kiểm tra được dữ liệu bài. Hãy tải lại và thử lại.',
```

- [ ] **Step 7: Run focused study tests and commit**

Run:

```bash
pnpm exec vitest run src/pages/study/FlashcardStudyPage.test.tsx src/pages/study/StudySetupPage.test.tsx src/pages/quiz/QuizSetupPage.test.tsx
```

Expected: PASS; quiz setup still performs the final preflight after the CTA navigates to it.

Before staging, inspect all current diffs for `src/pages/study/FlashcardStudyPage.tsx`, its test, and `src/i18n/index.ts`, since they already contain other in-progress work. Commit the integrated files without reverting that work:

```bash
git add src/pages/study/FlashcardStudyPage.tsx src/pages/study/FlashcardStudyPage.test.tsx src/pages/study/StudySetupPage.tsx src/pages/study/StudySetupPage.test.tsx src/i18n/index.ts
git commit -m "feat: offer lesson quiz after study completion"
```

### Task 5: Document And Verify The Completed Workflow

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md`

- [ ] **Step 1: Update project context after feature behavior passes**

In `CLAUDE.md`, add implemented behavior under the vocabulary/study patterns and MVP status:

```md
- Signed-in users can select existing vocabulary in the library and create randomized lesson decks in batches. Each batch divides selected terms into `Bai hoc NN` decks with a chosen maximum term count, continues numbering from existing generated lesson names, and reports partial Supabase creation honestly rather than silently rolling back created decks. Demo/offline mode does not create persisted lesson decks.
- Completing a deck-scoped flashcard session returns to `/app/study` with a recent-completion card. When that deck has at least one translated term, the learner can open `/app/quiz` with that deck preselected for the existing translation-input quiz preflight; review/all-vocabulary sessions do not create this lesson handoff.
```

In `README.md`, add a concise visible-feature bullet:

```md
- **Generated lessons** - Split selected vocabulary into randomized lesson decks, then quiz a completed lesson immediately
```

- [ ] **Step 2: Run targeted and full automated verification**

Run:

```bash
pnpm exec vitest run src/features/decks/bulkLessons.test.ts src/services/supabase/deck.service.test.ts src/pages/vocabulary/VocabularyListPage.test.tsx src/pages/study/FlashcardStudyPage.test.tsx src/pages/study/StudySetupPage.test.tsx src/pages/quiz/QuizSetupPage.test.tsx
pnpm test
pnpm lint
pnpm build
```

Expected: all commands exit with code `0`. If unrelated dirty work causes an existing failure, record the exact failing test or lint/build diagnostic before deciding whether it belongs to this feature.

- [ ] **Step 3: Visually verify the user workflow in the local app**

Start the app:

```bash
pnpm dev
```

Use the Browser plugin against the local URL and verify a signed-in flow:

1. On `/app/vocabulary`, enter selection mode, choose several terms, open `Tạo bài học`, change `Số từ mỗi bài`, and confirm the projected count changes.
2. Create the batch and confirm the success card links to its first `Bai hoc NN` deck.
3. Open that deck, complete its flashcard session, and confirm `/app/study` displays `Kiểm tra bài này`.
4. Click the CTA and confirm `/app/quiz` has that deck selected and still blocks start if its terms lack translations.

- [ ] **Step 4: Inspect and commit documentation only**

Follow repository policy before the documentation commit:

```bash
git status --short
git diff -- CLAUDE.md README.md
git diff --cached
```

Confirm that `.env`, keys, tokens, and unrelated source changes are not staged. Then commit only documentation:

```bash
git add CLAUDE.md README.md
git commit -m "docs: document bulk lesson workflow"
```
