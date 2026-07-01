# Grammar Lesson Blocks — Design Spec

**Date:** 2026-07-01
**Status:** Draft
**Context:** MemoryLang MVP 1 — add block-based lesson content system for grammar topics.

---

## Problem

`grammar_topics` currently stores explanation as plain `text` and exercises in a separate `grammar_exercises` table. This flat structure cannot represent rich lesson content that mixes theory (tables, code, callouts, examples) with inline practice exercises — a common format for grammar, conjunctions, relative clauses, and other structured English lessons.

## Goal

Let admins build grammar lessons as ordered, typed content blocks. Users see the lesson rendered as a single scrollable page with inline exercises. No SRS or per-user progress tracking — only a simple view count per topic.

---

## Database Design

### Modify: `grammar_topics`

Add one column:

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `view_count` | `INTEGER` | `0` | Unique user views per topic |

### New: `lesson_blocks`

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `id` | `UUID` PK | `gen_random_uuid()` | |
| `topic_id` | `UUID` NOT NULL FK → `grammar_topics(id)` ON DELETE CASCADE | | Owning topic |
| `sort_order` | `INTEGER` NOT NULL | `0` | Display order |
| `block_type` | `TEXT` NOT NULL | | See Block Types table below |
| `content` | `JSONB` NOT NULL | `'{}'` | Block payload (schema varies by type) |
| `created_at` | `TIMESTAMPTZ` NOT NULL | `now()` | |
| `updated_at` | `TIMESTAMPTZ` NOT NULL | `now()` | |

**Index:** `(topic_id, sort_order)`

### Deprecate: `grammar_exercises`

Exercises now live inline inside `lesson_blocks` of type `exercise_group`. The old table is retained for backward compatibility but no longer read by the user-facing UI.

---

## Block Types & Content Schemas

Every block has `block_type` and a type-specific `content` JSONB shape.

### `heading`

Section header.

```json
{
  "text": "PHẦN 1: LIÊN TỪ ĐẲNG LẬP",
  "level": 2,
  "icon": "📌"
}
```

- `level`: 2, 3, or 4 (maps to h2/h3/h4)
- `icon`: optional emoji prefix

### `paragraph`

Rich text block. Stores sanitized HTML.

```json
{
  "html": "<p>Liên từ đẳng lập nối 2 thành phần <strong>CÙNG LOẠI</strong>:</p>"
}
```

Allowed HTML tags: `p`, `strong`, `em`, `code`, `a`, `br`, `ul`, `ol`, `li`.

### `table`

Tabular content.

```json
{
  "headers": ["Liên từ", "Nghĩa", "Ví dụ"],
  "rows": [
    ["For", "Bởi vì", "I stayed home, <strong>for</strong> it was raining."],
    ["And", "Và", "She bought a laptop <strong>and</strong> a printer."]
  ],
  "caption": "FANBOYS - 7 liên từ đẳng lập cơ bản"
}
```

- `headers`: column header texts
- `rows`: 2D array of cell HTML strings (same allowed tags as paragraph)
- `caption`: optional table caption

### `code`

Code/preformatted text block.

```json
{
  "text": "Liên từ đẳng lập nối 2 thành phần CÙNG LOẠI:\n✓ Danh từ + Danh từ\n✓ Động từ + Động từ",
  "language": "plaintext"
}
```

- `language`: optional language hint for syntax highlighting (reserved for future)

### `callout`

Highlighted callout box.

```json
{
  "variant": "warning",
  "title": "Quy tắc quan trọng",
  "html": "<p>Liên từ đẳng lập nối 2 thành phần <strong>CÙNG LOẠI</strong></p>"
}
```

- `variant`: `"warning"` (yellow), `"tip"` (green), `"info"` (blue), `"danger"` (red)
- `title`: optional bold title
- `html`: body content (same allowed tags)

### `example_list`

List of correct/incorrect examples with visual markers.

```json
{
  "items": [
    { "text": "She is smart <strong>and</strong> hardworking.", "correct": true },
    { "text": "She is smart <strong>but</strong> hardworking.", "correct": false }
  ]
}
```

Rendered with ✅/❌ (or check/cross) icons.

### `exercise_group`

Inline multiple-choice exercises.

```json
{
  "instruction": "Chọn đáp án đúng",
  "questions": [
    {
      "id": "q1",
      "question": "_____ the bad weather, the event will proceed as scheduled.",
      "options": ["Although", "Despite", "Even though", "While"],
      "correctIndex": 1,
      "explanation": "\"Despite\" + danh từ (the bad weather). Các đáp án còn lại yêu cầu mệnh đề."
    }
  ]
}
```

- `id`: unique within the group (client-generated UUID)
- `correctIndex`: 0-based index of correct option
- `explanation`: shown after user answers

### `summary`

Bullet-point or card-style summary.

```json
{
  "variant": "bullet",
  "items": [
    "1. ĐẲNG LẬP (FANBOYS): for, and, nor, but, or, yet, so",
    "2. PHỤ THUỘC (quan trọng nhất): when, while, because, if..."
  ]
}
```

- `variant`: `"bullet"` or `"card"`

### `divider`

Visual separator. No content needed.

```json
{}
```

---

## API Design

### User-facing

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `listTopics()` | RPC or direct SELECT | List published topics with category, level, view_count |
| `getTopic(id)` | Direct SELECT | Single topic metadata |
| `getBlocks(topicId)` | Direct SELECT on `lesson_blocks` ORDER BY sort_order | All blocks for a topic |
| `incrementViewCount(topicId)` | RPC or direct UPDATE | Increment view_count (debounced client-side) |

### Admin-facing

| Method | Purpose |
|--------|---------|
| `createBlock(topicId, block)` | Insert new block at end |
| `updateBlock(blockId, content)` | Update block content/type |
| `deleteBlock(blockId)` | Delete block (reorder remaining) |
| `reorderBlocks(topicId, orderedIds: string[])` | Batch update sort_order for all blocks |

All admin operations via existing `admin.service.ts` pattern.

---

## TypeScript Types

```typescript
// src/types/grammar.types.ts (new file)

type BlockType =
  | 'heading'
  | 'paragraph'
  | 'table'
  | 'code'
  | 'callout'
  | 'example_list'
  | 'exercise_group'
  | 'summary'
  | 'divider'

interface LessonBlock {
  id: string
  topic_id: string
  sort_order: number
  block_type: BlockType
  content: Record<string, unknown>
  created_at: string
  updated_at: string
}

interface GrammarTopic {
  id: string
  title: string
  category: string
  level: string
  explanation: string  // kept for backward compat
  examples: { sentence: string; translation?: string }[]  // kept for backward compat
  is_published: boolean
  view_count: number
  created_at: string
}

// Block-specific content types (for type-safe admin forms)
interface HeadingContent  { text: string; level: 2 | 3 | 4; icon?: string }
interface ParagraphContent { html: string }
interface TableContent     { headers: string[]; rows: string[][]; caption?: string }
interface CodeContent      { text: string; language?: string }
interface CalloutContent   { variant: 'warning' | 'tip' | 'info' | 'danger'; title?: string; html: string }
interface ExampleListItem  { text: string; correct: boolean }
interface ExampleListContent { items: ExampleListItem[] }
interface ExerciseQuestion { id: string; question: string; options: string[]; correctIndex: number; explanation?: string }
interface ExerciseGroupContent { instruction?: string; questions: ExerciseQuestion[] }
interface SummaryContent   { variant: 'bullet' | 'card'; items: string[] }
```

---

## UI Design

### Grammar List Page (`/app/grammar`)

Refactor from current Reference/Practice tabs to a single lesson list:

- Category filter dropdown (e.g., "Từ loại", "Thì", "Liên từ", "Mệnh đề"...)
- Card grid with: title, category badge, level badge, view count
- Click → navigate to lesson page

### Grammar Lesson Page (`/app/grammar/:topicId`)

Single scrollable page rendering all blocks in order:

- Top: back button, title, level badge, view count
- Body: `BlockRenderer` component that switches on `block_type`:
  - `heading` → styled h2/h3/h4
  - `paragraph` → renders sanitized HTML
  - `table` → responsive table with neo-brutalist styling
  - `code` → preformatted block with dark background
  - `callout` → colored bordered box (yellow/blue/green/red)
  - `example_list` → list with ✅/❌ markers
  - `exercise_group` → interactive quiz cards with "Kiểm tra" button, answer feedback, explanation
  - `summary` → bullet list or card grid
  - `divider` → horizontal rule
- Bottom: prev/next topic navigation (within same category)
- On mount: call `incrementViewCount` (debounced, once per session)

### Admin Block Builder (`/app/admin/grammar/:topicId`)

- Topic metadata form (title, category, level, is_published)
- Block list with drag-and-drop reorder
- "Add block" dropdown → selects type → opens type-specific form modal
- Each block has: drag handle, type label, content preview, edit/delete buttons
- Edit modal renders type-specific form (heading fields, HTML editor for paragraph, table builder, etc.)
- Save calls `reorderBlocks` on drag end, individual block CRUD on edit/delete

---

## Data Migration

Existing `grammar_topics` explanation + examples will be converted to blocks:

1. For each topic with non-empty `explanation`: create one `paragraph` block with `content.html = explanation`
2. For each topic's `examples` array: create one `example_list` block
3. For each `grammar_exercises` row linked to a topic: group into one `exercise_group` block
4. Run once via migration SQL or admin script

Existing `grammar_topics.explanation` and `grammar_topics.examples` columns kept for backward compatibility during transition.

---

## RLS Policies

`lesson_blocks` inherits admin-write, authenticated-read pattern (same as `grammar_topics`).

---

## i18n Keys

New keys under `grammar.*`:

```
grammar.lessonListTitle       → "Danh sách bài học"
grammar.filterCategory        → "Lọc theo danh mục"
grammar.filterLevel           → "Lọc theo trình độ"
grammar.viewCount             → "{count} lượt học"
grammar.prevLesson            → "Bài trước"
grammar.nextLesson            → "Bài sau"
grammar.checkAnswer           → "Kiểm tra"
grammar.correctAnswer         → "Chính xác!"
grammar.incorrectAnswer       → "Chưa đúng"
grammar.showExplanation       → "Xem giải thích"
grammar.noLessons             → "Chưa có bài học nào"
grammar.addBlock              → "Thêm block"
grammar.editBlock             → "Sửa block"
grammar.deleteBlock           → "Xóa block"
grammar.blockTypeLabel        → (maps each block_type to Vietnamese label)
```

---

## Feature Flag

Existing `grammar_module` flag gates visibility. Once this feature ships, the flag can be enabled.

---

## Risks & Edge Cases

- **Rich HTML injection:** Paragraph/callout HTML must be sanitized (DOMPurify) before render
- **Large lesson rendering:** A lesson with 50+ blocks may need virtualized rendering — defer to optimization phase
- **Migration rollback:** Old `explanation`/`examples` columns kept intact; blocks can be dropped without data loss
- **View count accuracy:** Client-side debounce prevents double-counting on page refresh; no server-side dedup needed for MVP
