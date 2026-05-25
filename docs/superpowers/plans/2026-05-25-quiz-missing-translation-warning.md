# Quiz Missing Translation Warning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore quiz readiness for four confirmed untranslated lesson terms and explain partial deck readiness with direct edit links on the quiz setup page.

**Architecture:** Keep the existing quiz eligibility rule: active vocabulary requires a non-blank `translation`. Perform a one-time guarded Supabase data correction for the confirmed empty translations, then derive `missingTranslationVocabulary` in `QuizSetupPage` from its already-loaded source data and render an inline warning only when usable and unusable terms coexist. No service endpoint or schema change is required.

**Tech Stack:** React 19, TypeScript, TanStack Query, React Router, Vitest + Testing Library, custom i18n, Supabase/PostgreSQL CLI.

---

## File Map

| File / System | Responsibility In This Change |
| --- | --- |
| Supabase `public.user_terms` data | One-time conditional translation correction for four confirmed rows; no migration or schema change. |
| `src/pages/quiz/QuizSetupPage.test.tsx` | Proves the partial-readiness warning and direct edit action, while preserving the full-readiness and zero-ready behavior. |
| `src/pages/quiz/QuizSetupPage.tsx` | Derives untranslated active terms and renders warning/edit links in the existing readiness status card. |
| `src/i18n/index.ts` | Holds English and Vietnamese warning/count/action copy. |
| `CLAUDE.md` | Documents the implemented quiz setup behavior once it exists. |

### Task 1: Correct The Four Confirmed Empty Translations

**Files:**
- Modify data only: Supabase table `public.user_terms`
- Verify data only: Supabase tables `public.decks`, `public.deck_terms`, `public.user_terms`

- [ ] **Step 1: Confirm the Supabase CLI and relevant guidance before mutation**

Run:

```powershell
npx supabase --version
npx supabase db query --help
```

Check the current Supabase changelog/docs as required by the Supabase workflow before executing the write. This task changes existing user data only; it does not add SQL schema, policies, functions, or frontend Supabase API usage.

Expected: CLI version supports `db query --linked`, and there is no relevant breaking change preventing a conditional `UPDATE` query.

- [ ] **Step 2: Re-read the four target rows immediately before the update**

Run:

```powershell
npx supabase db query --linked --output json "select id, source_text, translation from public.user_terms where id in ('5f07191a-9331-4e7e-8a5c-1c54d4c8fcda'::uuid, 'c528f335-19cd-492f-ad60-c1800a5f4d11'::uuid, 'f9d4335d-4dba-4f69-a2e1-70410f5100c5'::uuid, 'c84ae4bf-a666-4572-99db-2f57116a642a'::uuid) order by source_text;"
```

Expected: rows that still need correction have `translation` equal to `null` or blank. If a row already has a non-blank translation, leave it unchanged in the following guarded update.

- [ ] **Step 3: Run the guarded translation correction**

Run:

```powershell
npx supabase db query --linked --output json "update public.user_terms set translation = case id when '5f07191a-9331-4e7e-8a5c-1c54d4c8fcda'::uuid then 'nổi tiếng vì' when 'c528f335-19cd-492f-ad60-c1800a5f4d11'::uuid then 'liên quan đến' when 'f9d4335d-4dba-4f69-a2e1-70410f5100c5'::uuid then 'trạng từ' when 'c84ae4bf-a666-4572-99db-2f57116a642a'::uuid then 'giới từ' end where id in ('5f07191a-9331-4e7e-8a5c-1c54d4c8fcda'::uuid, 'c528f335-19cd-492f-ad60-c1800a5f4d11'::uuid, 'f9d4335d-4dba-4f69-a2e1-70410f5100c5'::uuid, 'c84ae4bf-a666-4572-99db-2f57116a642a'::uuid) and nullif(btrim(translation), '') is null returning id, source_text, translation;"
```

Expected: each target that was still empty is returned with its confirmed Vietnamese translation. No non-empty value is overwritten.

- [ ] **Step 4: Verify lesson readiness after the correction**

Run:

```powershell
npx supabase db query --linked --output json "select d.name, count(dt.user_term_id) as linked_terms, count(ut.id) filter (where ut.deleted_at is null and nullif(btrim(ut.translation), '') is not null) as quiz_ready_terms, count(ut.id) filter (where ut.deleted_at is null and nullif(btrim(ut.translation), '') is null) as untranslated_terms from public.decks d join public.deck_terms dt on dt.deck_id = d.id join public.user_terms ut on ut.id = dt.user_term_id where d.name in ('Bai hoc 01','Bai hoc 02','Bai hoc 03','Bai hoc 04','Bai hoc 05') group by d.id, d.name order by d.name;"
```

Expected: all five lesson decks report `linked_terms = 20`, `quiz_ready_terms = 20`, and `untranslated_terms = 0`.

### Task 2: Add Failing UI Coverage For Partial Quiz Readiness

**Files:**
- Modify: `src/pages/quiz/QuizSetupPage.test.tsx`

- [ ] **Step 1: Write the failing partial-readiness test**

Add a remote-deck test after `uses the selected remote deck terms as the quiz source`:

```tsx
  it('explains partial readiness and links to edit untranslated deck terms', async () => {
    const user = userEvent.setup()
    const { deckService } = await import('@/services/supabase/deck.service')
    const { vocabularyService } = await import('@/services/supabase/vocabulary.service')
    useAuthStore.setState({ user: { id: 'user-1' } as never, profile: null })
    vi.mocked(deckService.list).mockResolvedValue([
      { id: 'lesson-1', name: 'Bai hoc 01' },
    ] as never)
    vi.mocked(vocabularyService.list).mockResolvedValue(demoVocabulary)
    vi.mocked(deckService.listTerms).mockResolvedValue([
      demoVocabulary[0]!,
      { ...demoVocabulary[1]!, id: 'missing-term', source_text: 'be known for', translation: null },
    ] as VocabularyItem[])

    renderPage()
    await screen.findByText('3 từ sẵn sàng kiểm tra')
    await user.selectOptions(screen.getAllByRole('combobox')[0], 'lesson-1')

    expect(await screen.findByText('1/2 từ sẵn sàng kiểm tra')).toBeInTheDocument()
    expect(screen.getByText('1 từ chưa có bản dịch sẽ không xuất hiện trong bài kiểm tra.')).toBeInTheDocument()
    expect(screen.getByText('be known for')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Bổ sung bản dịch' })).toHaveAttribute(
      'href',
      '/app/vocabulary/missing-term/edit',
    )
    expect(screen.getByRole('button', { name: 'Bắt đầu kiểm tra' })).toBeEnabled()
  })
```

- [ ] **Step 2: Make the existing complete-deck expectation explicitly reject warning UI**

Extend `uses the selected remote deck terms as the quiz source` after its existing readiness assertion:

```tsx
    expect(screen.queryByText(/chưa có bản dịch sẽ không xuất hiện/)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Bổ sung bản dịch' })).not.toBeInTheDocument()
```

- [ ] **Step 3: Run the focused test to verify the new behavior is missing**

Run:

```powershell
pnpm exec vitest run src/pages/quiz/QuizSetupPage.test.tsx
```

Expected: FAIL because `1/2 từ sẵn sàng kiểm tra`, warning text, and edit link are not rendered yet.

### Task 3: Render Missing Translation Warnings In Quiz Setup

**Files:**
- Modify: `src/pages/quiz/QuizSetupPage.tsx`
- Modify: `src/i18n/index.ts`
- Test: `src/pages/quiz/QuizSetupPage.test.tsx`

- [ ] **Step 1: Add translated copy for partial readiness and edit actions**

Add after the existing `quiz.availableCount` key in each language block of `src/i18n/index.ts`:

```ts
    'quiz.partialAvailableCount': '{available}/{total} words ready for a quiz',
    'quiz.missingTranslationNotice': '{count} word(s) without translations will not appear in the quiz.',
    'quiz.addTranslation': 'Add translation',
```

```ts
    'quiz.partialAvailableCount': '{available}/{total} từ sẵn sàng kiểm tra',
    'quiz.missingTranslationNotice': '{count} từ chưa có bản dịch sẽ không xuất hiện trong bài kiểm tra.',
    'quiz.addTranslation': 'Bổ sung bản dịch',
```

- [ ] **Step 2: Derive active untranslated vocabulary beside existing eligibility data**

In `src/pages/quiz/QuizSetupPage.tsx`, update the router import and add the memo immediately after `availableVocabulary`:

```tsx
import { Link, useNavigate } from 'react-router-dom'
```

```tsx
  const missingTranslationVocabulary = useMemo(
    () => sourceVocabulary.filter((item) => !hasTranslation(item)),
    [sourceVocabulary],
  )
```

- [ ] **Step 3: Replace the ready-state line with full and partial branches**

Replace the current `availableVocabulary.length > 0` readiness paragraph in the status card with:

```tsx
                {!vocabularyLoading && !vocabularyError && availableVocabulary.length > 0 && missingTranslationVocabulary.length === 0 ? (
                  <p className="text-sm font-black text-success">{t('quiz.availableCount', { count: availableVocabulary.length })}</p>
                ) : null}
                {!vocabularyLoading && !vocabularyError && availableVocabulary.length > 0 && missingTranslationVocabulary.length > 0 ? (
                  <div className="grid gap-3">
                    <p className="text-sm font-black text-warning">
                      {t('quiz.partialAvailableCount', {
                        available: availableVocabulary.length,
                        total: sourceVocabulary.length,
                      })}
                    </p>
                    <p className="text-sm font-bold text-muted-foreground">
                      {t('quiz.missingTranslationNotice', { count: missingTranslationVocabulary.length })}
                    </p>
                    <div className="grid gap-2">
                      {missingTranslationVocabulary.map((item) => (
                        <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border-2 border-border bg-card p-2">
                          <span className="text-sm font-black">{item.source_text}</span>
                          <Button asChild variant="ghost" className="text-xs">
                            <Link to={`/app/vocabulary/${item.id}/edit`}>{t('quiz.addTranslation')}</Link>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
```

Do not change `cannotStart`: a partially ready deck remains testable and an entirely untranslated source remains blocked by the existing rule.

- [ ] **Step 4: Run the focused setup tests**

Run:

```powershell
pnpm exec vitest run src/pages/quiz/QuizSetupPage.test.tsx
```

Expected: PASS, including the new partial-ready warning test and existing no-translation blocking behavior.

- [ ] **Step 5: Commit the UI behavior**

Before committing, inspect repository status and diffs and ensure no secrets are included. Stage only these related files:

```powershell
git status --short --branch
git diff -- src/pages/quiz/QuizSetupPage.tsx src/pages/quiz/QuizSetupPage.test.tsx src/i18n/index.ts
git add -- src/pages/quiz/QuizSetupPage.tsx src/pages/quiz/QuizSetupPage.test.tsx src/i18n/index.ts
git diff --cached
git commit -m "feat: explain untranslated terms in quiz setup"
```

Expected: one atomic UI commit containing only the status warning, link action, translations, and test coverage.

### Task 4: Document And Verify The Completed Behavior

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Document the implemented quiz preflight warning**

In the existing translation-input quiz setup bullet in `CLAUDE.md`, add the implemented partial-readiness behavior:

```md
- Translation-input quiz setup selects all vocabulary or a deck, validates that active items have saved translations, and distinguishes empty, untranslated, partially translated, and failed-to-load sources before allowing start. When a selected source has both translated and untranslated active terms, setup shows the ready count against the total, names the untranslated terms, and links directly to their edit screens while still permitting a quiz from usable terms.
```

- [ ] **Step 2: Run targeted verification**

Run:

```powershell
pnpm exec vitest run src/pages/quiz/QuizSetupPage.test.tsx src/features/quiz/translationInputQuiz.test.ts
```

Expected: PASS for quiz eligibility parsing and setup readiness UI.

- [ ] **Step 3: Attempt relevant broader validation and record unrelated failures separately**

Run:

```powershell
pnpm lint
pnpm build
```

Expected: PASS if the current branch is otherwise healthy. If an unrelated pre-existing or concurrent failure remains, record its exact file/test output without expanding scope.

- [ ] **Step 4: Check the visible UI in the local app when a browser target is available**

Open `http://localhost:5173/app/quiz` in the Browser plugin, select a deck fixture or data state containing one untranslated term, and verify:

- The status says `x/y` ready.
- The untranslated source term and `Bổ sung bản dịch` link are visible.
- The edit link routes to `/app/vocabulary/:id/edit`.
- The start button remains enabled when at least one translation exists.

If no in-app browser target is available, record that manual browser verification could not be performed in this session.

- [ ] **Step 5: Commit documentation only**

Before committing, inspect status and diffs and ensure no sensitive values are staged:

```powershell
git status --short --branch
git diff -- CLAUDE.md
git add -- CLAUDE.md
git diff --cached
git commit -m "docs: document partial quiz readiness warning"
```

Expected: documentation commit includes only `CLAUDE.md`.
