# Vocabulary Status Highlight & Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the limited 3-option status dropdown with full 6-status chip filter and add colored left borders on vocabulary cards.

**Architecture:** Local state (`filterStatus`) drives client-side filtering on `vocabulary` array. A `statusBorderClasses` map provides CSS classes for each status. The status filter `<Select>` is replaced with a flex-wrap row of `<button>` chips. No backend changes.

**Tech Stack:** React, TypeScript, Tailwind CSS, existing component library (Button, Card, etc.)

---

## File structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/i18n/index.ts:21,457` | Modify | Add `vocabulary.filterAll` key (EN + VI) |
| `src/pages/vocabulary/VocabularyListPage.tsx:28-184` | Modify | Add filterState, replace status Select with chips, add colored border to cards |

---

### Task 1: Add i18n label for "All" filter

**Files:**
- Modify: `src/i18n/index.ts`

- [ ] **Step 1: Add EN label after `vocabulary.allStatuses`**

In `src/i18n/index.ts`, after line 56 (`'vocabulary.allStatuses': 'All statuses',`), insert:

```ts
    'vocabulary.filterAll': 'All',
```

- [ ] **Step 2: Add VI label after `vocabulary.allStatuses`**

In `src/i18n/index.ts`, after line 490 (`'vocabulary.allStatuses': 'Tất cả trạng thái',`), insert:

```ts
    'vocabulary.filterAll': 'Tất cả',
```

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: no output (pass)

- [ ] **Step 4: Commit**

```bash
git add src/i18n/index.ts
git commit -m "feat: add vocabulary.filterAll i18n label"
```

---

### Task 2: Add status filter chips and colored borders to vocabulary list

**Files:**
- Modify: `src/pages/vocabulary/VocabularyListPage.tsx`

- [ ] **Step 1: Add `filterStatus` state and status helper maps**

After line 42 (`const [pendingDelete, setPendingDelete] = ...`), add:

```ts
  const [filterStatus, setFilterStatus] = useState<VocabularyStatus | 'all'>('all')
```

After line 26 (closing of `statusLabelKeys`), add:

```ts
const statusBorderClasses: Record<VocabularyStatus, string> = {
  new: 'border-l-slate-400',
  learning: 'border-l-blue-500',
  familiar: 'border-l-emerald-500',
  memorized: 'border-l-secondary',
  difficult: 'border-l-destructive',
  need_review: 'border-l-amber-500',
}
```

And the ordered status list for chips:

```ts
const statusFilterOptions: Array<VocabularyStatus | 'all'> = ['all', 'new', 'learning', 'familiar', 'memorized', 'difficult', 'need_review']
```

- [ ] **Step 2: Replace the status Select with chip buttons**

Replace lines 125-130 (the `<Select defaultValue="all">` for status) with:

```tsx
        <div className="flex flex-wrap gap-1">
          {statusFilterOptions.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(status)}
              className={[
                'neo-button min-h-10 rounded-md border-2 border-border px-3 py-2 text-sm font-black',
                filterStatus === status
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-foreground hover:bg-muted',
              ].join(' ')}
            >
              {status === 'all' ? t('vocabulary.filterAll') : t(statusLabelKeys[status])}
            </button>
          ))}
        </div>
```

- [ ] **Step 3: Apply client-side filter**

Replace line 38:

```ts
  const vocabulary = shouldUseRemoteData ? vocabularyQuery.data ?? [] : demoVocabulary
```

with:

```ts
  const rawVocabulary = shouldUseRemoteData ? vocabularyQuery.data ?? [] : demoVocabulary
  const vocabulary = filterStatus === 'all' ? rawVocabulary : rawVocabulary.filter((item) => item.status === filterStatus)
```

- [ ] **Step 4: Add colored left border to each Card**

Replace line 142:

```tsx
          <Card key={item.id} className="grid gap-3 md:grid-cols-[auto_1fr_auto] md:items-center">
```

with:

```tsx
          <Card key={item.id} className={`grid gap-3 md:grid-cols-[auto_1fr_auto] md:items-center border-l-4 ${statusBorderClasses[item.status]}`}>
```

- [ ] **Step 5: Fix 4-column grid (remove 4th slot)**

The status filter now uses flex-wrap chips taking up the same space. But the grid is `md:grid-cols-4` — remove one column since we have 3 filters (search, status chips, sort). Replace line 125:

```tsx
      <div className="mb-4 grid gap-3 md:grid-cols-4">
```

with:

```tsx
      <div className="mb-4 grid gap-3 md:grid-cols-3">
```

And remove the unused parts-of-speech Select (lines 129). The grid now has 3 columns: Search, Status chips, Sort.

Actually, looking more carefully at the current layout (lines 125-130):

```tsx
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <Input placeholder={t('vocabulary.search')} />
        <Select defaultValue="all"><option value="all">{t('vocabulary.allStatuses')}</option>...</Select>
        <Select defaultValue="created">...</Select>
        <Select defaultValue="all"><option value="all">{t('vocabulary.allPartsOfSpeech')}</option>...</Select>
      </div>
```

The 4th column is an unused parts-of-speech filter. After replacing the status dropdown with chips (which don't need a fixed column width), the layout becomes:

```tsx
      <div className="mb-4 grid gap-3 md:grid-cols-[2fr_auto_1fr]">
        <Input placeholder={t('vocabulary.search')} />
        <div className="flex flex-wrap gap-1">
          {/* chips */}
        </div>
        <Select defaultValue="created">
          <option value="created">{t('vocabulary.sortCreated')}</option>
          <option value="next_review">{t('vocabulary.sortReview')}</option>
          <option value="wrong">{t('vocabulary.sortWrong')}</option>
        </Select>
      </div>
```

Actually, let me keep it even simpler. Use `md:grid-cols-3` — Search | Chips | Sort. Remove the PoS Select entirely (it was always placeholder with only `noun` and `idiom`).

- [ ] **Step 6: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: no output (pass)

- [ ] **Step 7: Run tests**

Run: `npx vitest run`
Expected: 22 files, 92 tests pass

- [ ] **Step 8: Commit**

```bash
git add src/pages/vocabulary/VocabularyListPage.tsx
git commit -m "feat: add status filter chips and colored left border to vocabulary list"
```
