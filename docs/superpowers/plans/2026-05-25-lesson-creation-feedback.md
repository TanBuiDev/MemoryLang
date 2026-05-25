# Lesson Creation Feedback Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the first-created-lesson link on vocabulary batch feedback with actions to view the deck list or dismiss the message.

**Architecture:** Keep the existing `lessonFeedback` state and batch mutation contract in `VocabularyListPage`; only change how successful or partially successful feedback is presented. The card will route to the existing `/app/decks` list and clear itself locally on dismissal, with no service or persistence changes.

**Tech Stack:** React 19, TypeScript, React Router, custom i18n, Vitest, Testing Library.

---

## File Map

| File | Responsibility |
| --- | --- |
| `src/pages/vocabulary/VocabularyListPage.test.tsx` | Specify result-card actions and failure visibility behavior. |
| `src/pages/vocabulary/VocabularyListPage.tsx` | Render the feedback card and dismiss action. |
| `src/i18n/index.ts` | Provide bilingual labels for the new actions. |
| `CLAUDE.md` | Record the implemented post-creation interaction. |
| `docs/superpowers/specs/2026-05-25-bulk-vocabulary-lessons-design.md` | Align the broader lesson workflow spec with the replacement navigation action. |

### Task 1: Change The Lesson Creation Result Card

**Files:**
- Modify: `src/pages/vocabulary/VocabularyListPage.test.tsx`
- Modify: `src/pages/vocabulary/VocabularyListPage.tsx`
- Modify: `src/i18n/index.ts`

- [ ] **Step 1: Add failing UI expectations for deck-list navigation and dismissal**

Update the successful creation test in `src/pages/vocabulary/VocabularyListPage.test.tsx` and add a dismissal assertion:

```tsx
it('creates named lesson batches and offers the deck list from feedback', async () => {
  const user = userEvent.setup()
  vi.mocked(deckService.createLessonBatch).mockResolvedValue({
    createdDecks: [{ id: 'deck-5', name: 'Bai hoc 05' } as never],
    error: null,
  })
  renderPage()

  await selectAllAndOpenLessonModal(user)
  await user.click(screen.getByRole('button', { name: 'Xác nhận tạo bài' }))

  expect(deckService.createLessonBatch).toHaveBeenCalledWith(expect.objectContaining({
    base: expect.objectContaining({ user_id: 'user-1', source_language: 'en', native_language: 'vi' }),
    lessons: [expect.objectContaining({ name: 'Bai hoc 05' })],
  }))
  expect(await screen.findByRole('link', { name: 'Xem bộ thẻ' })).toHaveAttribute('href', '/app/decks')
  expect(screen.queryByRole('link', { name: 'Mở Bai hoc 05' })).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Đóng' }))
  expect(screen.queryByText('Đã tạo 1 bài học.')).not.toBeInTheDocument()
})
```

Extend the partial and complete-failure tests:

```tsx
expect(await screen.findByRole('link', { name: 'Xem bộ thẻ' })).toHaveAttribute('href', '/app/decks')
```

```tsx
expect(screen.queryByRole('link', { name: 'Xem bộ thẻ' })).not.toBeInTheDocument()
```

- [ ] **Step 2: Run the vocabulary UI test and verify the new assertions fail**

Run:

```bash
pnpm exec vitest run src/pages/vocabulary/VocabularyListPage.test.tsx
```

Expected: FAIL because feedback still renders `Mở Bai hoc 05` and has no `Xem bộ thẻ` or `Đóng` actions.

- [ ] **Step 3: Add action labels in both locale sections**

In `src/i18n/index.ts`, replace the now-unused first-lesson action label:

```ts
'vocabulary.viewDecks': 'View decks',
'vocabulary.dismissLessonFeedback': 'Dismiss',
```

```ts
'vocabulary.viewDecks': 'Xem bộ thẻ',
'vocabulary.dismissLessonFeedback': 'Đóng',
```

Remove both locale entries for:

```ts
'vocabulary.openCreatedLesson': 'Open {name}',
'vocabulary.openCreatedLesson': 'Mở {name}',
```

- [ ] **Step 4: Render the deck-list and dismissal actions in the feedback card**

In `src/pages/vocabulary/VocabularyListPage.tsx`, preserve `lessonFeedback` as the existing result state and replace the current conditional first-deck link:

```tsx
<div className="mt-3 flex flex-wrap gap-2">
  <Button asChild>
    <Link to="/app/decks">{t('vocabulary.viewDecks')}</Link>
  </Button>
  <Button variant="ghost" onClick={() => setLessonFeedback(null)}>
    {t('vocabulary.dismissLessonFeedback')}
  </Button>
</div>
```

The feedback card is rendered only after a mutation result with at least one completed deck, so it does not need a link conditional. While editing, retain the already-present uncommitted `/app/vocabulary/split` header action and exclude that unrelated hunk from this commit.

- [ ] **Step 5: Run focused UI tests and commit the behavior change**

Run:

```bash
pnpm exec vitest run src/pages/vocabulary/VocabularyListPage.test.tsx src/features/decks/bulkLessons.test.ts src/services/supabase/deck.service.test.ts
```

Expected: PASS.

Before staging, inspect the current source diffs, then stage only the hunks for this result-card change in the overlapping vocabulary page:

```bash
git status --short
git diff -- src/pages/vocabulary/VocabularyListPage.tsx src/pages/vocabulary/VocabularyListPage.test.tsx src/i18n/index.ts
git add src/pages/vocabulary/VocabularyListPage.test.tsx src/i18n/index.ts
git add -p src/pages/vocabulary/VocabularyListPage.tsx
git diff --cached --check
git commit -m "feat: add lesson feedback deck actions"
```

### Task 2: Document The Updated Feedback Destination

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/superpowers/specs/2026-05-25-bulk-vocabulary-lessons-design.md`

- [ ] **Step 1: Record the implemented post-creation action**

In `CLAUDE.md`, amend the generated lesson behavior bullet so it states:

```md
After a complete or partial batch, the vocabulary page reports the completed count with actions to open `/app/decks` or dismiss the message; it does not open a generated lesson automatically.
```

In `docs/superpowers/specs/2026-05-25-bulk-vocabulary-lessons-design.md`, replace the prior first-lesson link statement with:

```md
Sau khi tao thanh cong, UI giu nguoi dung o Kho tu vung, bo tap chon da xu ly, hien thong bao so bai da tao va cung cap hanh dong mo danh sach bo the tai `/app/decks` hoac dong thong bao. UI khong tu dong mo hay hien link rieng toi `Bai hoc NN` dau tien cua lo.
```

- [ ] **Step 2: Inspect and commit documentation only**

Run:

```bash
git status --short
git diff -- CLAUDE.md docs/superpowers/specs/2026-05-25-bulk-vocabulary-lessons-design.md
git diff --cached --check
```

Expected: documentation describes deck-list navigation and does not contain unrelated staged source changes.

Commit:

```bash
git add CLAUDE.md docs/superpowers/specs/2026-05-25-bulk-vocabulary-lessons-design.md
git commit -m "docs: update lesson creation feedback flow"
```

### Task 3: Verify The Adjustment

**Files:**
- Verify only; no planned production changes.

- [ ] **Step 1: Run the focused feature regression suite**

Run:

```bash
pnpm exec vitest run src/features/decks/bulkLessons.test.ts src/services/supabase/deck.service.test.ts src/pages/vocabulary/VocabularyListPage.test.tsx src/pages/study/FlashcardStudyPage.test.tsx src/pages/study/StudySetupPage.test.tsx src/pages/quiz/QuizSetupPage.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Attempt repository checks and report unrelated failures accurately**

Run:

```bash
pnpm test
pnpm lint
pnpm build
```

Expected for a clean repository: PASS. The current working tree already contains uncommitted quiz/audio/split/settings changes that may fail these full checks; do not repair or stage them as part of this adjustment unless a failure points directly to the result-card edits.

- [ ] **Step 3: Check worktree and commit scope before reporting**

Run:

```bash
git status --short --branch
git worktree list --porcelain
git log --oneline -4
```

Expected: the feature commits are on `main`, no additional worktree exists, and unrelated working-tree edits remain untouched.
