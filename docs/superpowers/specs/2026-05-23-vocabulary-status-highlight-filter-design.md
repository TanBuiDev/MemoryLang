# Vocabulary Status Highlight & Filter

## Goal

Replace the vocabulary list page's limited 3-option status dropdown with a full 6-status chip/tab filter, and add colored left borders on each vocabulary card to make status visually scannable.

## Scope

- Only `VocabularyListPage.tsx` and related i18n keys
- No SRS grading on the vocabulary page — this is purely visual + filter
- No backend changes

## Design

### 1. Status filter chips

Replace the current `<Select>` with 3 options (`Tất cả trạng thái`, `Từ khó`, `Cần ôn tập`) with a horizontal row of clickable chips/buttons for all 6 statuses plus "All".

**Layout:**
- Same position as the current status dropdown (inside the 4-column grid at top)
- Chip row replaces the status `<Select>` entirely
- Similar to existing chip patterns in the codebase (e.g., `className="text-sm font-black"` with active/inactive styling)

**Chips:**
1. `Tất cả` (all) — default active
2. `Mới` (new)
3. `Đang học` (learning)
4. `Quen thuộc` (familiar)
5. `Đã ghi nhớ` (memorized)
6. `Từ khó` (difficult)
7. `Cần ôn tập` (need_review)

**Behavior:**
- Click a chip to filter — sets local `filterStatus` state
- Active chip uses `bg-primary text-primary-foreground`, inactive uses `bg-card text-foreground hover:bg-muted`
- "Tất cả" clears the filter (shows all items)
- Chips use existing `neo-button` base classes

### 2. Colored left border on cards

Each `<Card>` in the vocabulary list gets a colored left border based on its status.

| Status | CSS class | Color |
|--------|-----------|-------|
| `new` | `border-l-4 border-l-slate-400` | Gray |
| `learning` | `border-l-4 border-l-blue-500` | Blue |
| `familiar` | `border-l-4 border-l-emerald-500` | Green |
| `memorized` | `border-l-4 border-l-secondary` | Purple (Tailwind variable) |
| `difficult` | `border-l-4 border-l-destructive` | Red (Tailwind variable) |
| `need_review` | `border-l-4 border-l-amber-500` | Amber/Yellow |

The existing `border-2 border-border` on the Card component remains; the left border overrides only that side.

### 3. i18n keys

Add `settings.hotkeyPlayAudio` — already added. Need to confirm existing status label keys cover all 6:

| Key | EN | VI |
|-----|----|----|
| `vocabulary.allStatuses` | `All statuses` | `Tất cả trạng thái` |
| `vocabulary.statusNew` | `New` | `Mới` |
| `vocabulary.statusLearning` | `Learning` | `Đang học` |
| `vocabulary.statusFamiliar` | `Familiar` | `Quen thuộc` |
| `vocabulary.statusMemorized` | `Memorized` | `Đã ghi nhớ` |
| `vocabulary.statusDifficult` | `Difficult` | `Từ khó` |
| `vocabulary.statusNeedReview` | `Need review` | `Cần ôn tập` |

All keys already exist — no new i18n keys needed. Add a shorter "All" filter label if the existing key is too long.

New key: `vocabulary.filterAll` = `"All"` / `"Tất cả"`

## Implementation notes

- `filterStatus: VocabularyStatus | 'all'` state in `VocabularyListPage`, default `'all'`
- Filter logic: `filterStatus === 'all' ? vocabulary : vocabulary.filter(item => item.status === filterStatus)`
- Colored border class from a `statusBorderClasses` map keyed by `VocabularyStatus`
- Reuse existing `statusLabelKeys` map for chip labels
- Replace single `<Select>` with a horizontal flex-wrap row of `<button>` chips
- No changes to sort, search, or other filters

## SRS impact assessment

`scheduleReview()` is a pure function — no session context required. Adding remember/forgot buttons on the vocabulary page would technically work but could conflict if the same term is being studied in an active session (session has its own snapshot; flushing would overwrite). **Not implementing this now** — focus is highlight + filter only.
