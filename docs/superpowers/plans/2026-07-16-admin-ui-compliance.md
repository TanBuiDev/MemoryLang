# Admin/UI Compliance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove browser-native admin dialogs and page-level native selects from `src/pages/admin` while preserving existing admin behavior.

**Architecture:** Add a source-scanning compliance test first, then migrate admin pages in focused chunks. Each chunk replaces direct `alert`/`window.confirm` with `showToast`, inline error state, or `ConfirmModal`, and replaces admin page `<select>/<option>` markup with the project `Select` component.

**Tech Stack:** React 19, TypeScript, Vite/Vitest, Testing Library when needed, project UI primitives (`ConfirmModal`, `Select`, `showToast`), GitNexus, pnpm.

## Global Constraints

- Respond and write user-facing notes in Vietnamese with proper accents.
- Do not use browser-native `alert`, `confirm`, or `prompt` in `src/pages/admin`.
- Do not use page-level native `<select>` or `<option>` in `src/pages/admin`.
- Do not replace the hidden native select inside `src/components/ui/select.tsx`.
- Do not change Supabase schema, payment logic, subscription logic, or content gating in this package.
- Preserve existing admin data mutations and optimistic rollback behavior.
- Run GitNexus impact analysis before editing functions/components and `gitnexus_detect_changes` before every commit.
- Stage only files for the current task; do not stage `.gitignore` or unrelated untracked `docs/*` files.

---

## File Structure

- Create: `src/pages/admin/admin-ui-compliance.test.ts`
  - Source scanner that enforces no browser-native admin dialogs and no direct admin page selects.
- Modify: `src/pages/admin/AdminVocabularyPage.tsx`
  - Delete confirmation via `ConfirmModal`; import success via `showToast`.
- Modify: `src/pages/admin/AdminStoragePage.tsx`
  - Cleanup confirmation via `ConfirmModal`; cleanup result via `showToast`.
- Modify: `src/pages/admin/AdminFunctionsPage.tsx`
  - Deploy success via `showToast`.
- Modify: `src/pages/admin/AdminFeaturesPage.tsx`
  - Save success via `showToast`; validation via inline `formError`.
- Modify: `src/pages/admin/AdminTtsPage.tsx`
  - Save success via `showToast`; all page-level selects via project `Select`.
- Modify: `src/pages/admin/AdminGrammarPage.tsx`
  - Delete confirmations via `ConfirmModal`; alerts via `showToast` or inline error; selects via `Select`.
- Modify: `src/pages/admin/AdminListeningPage.tsx`
  - Delete confirmations via `ConfirmModal`; alerts via `showToast` or inline error; selects via `Select`.
- Modify: `src/pages/admin/AdminGrammarLessonEditPage.tsx`
  - Block type selector via `Select`; optional delete block confirmation via `ConfirmModal` if editing this delete flow in the same chunk.
- Modify: `src/pages/admin/AdminI18nPage.tsx`
  - Section filter via `Select`.
- Modify: `CLAUDE.md`
  - Only if implementation reveals a new reusable admin UI convention not already documented in `AGENTS.md` or the spec.

## Current Dirty Files To Ignore

At plan creation, unrelated dirty files existed:

- `.gitignore`
- `docs/ETS_TOEIC_READING_2026.json`
- `docs/backup-global_terms-20260706-010144.json`
- `docs/backup-user_terms-20260706-010155.json`
- `docs/create-toeic-decks.sql`
- `docs/plans/`

Do not stage or modify these unless the user explicitly asks.

## Task 1: Admin Compliance Scanner

**Files:**
- Create: `src/pages/admin/admin-ui-compliance.test.ts`

**Interfaces:**
- Produces: a Vitest scanner that later tasks must make pass.
- Consumes: Node `fs`, `path`, and `url`; no browser rendering.

- [ ] **Step 1: Write the failing compliance test**

Create `src/pages/admin/admin-ui-compliance.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))

function collectTsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) return collectTsxFiles(fullPath)
    return fullPath.endsWith('.tsx') ? [fullPath] : []
  })
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

describe('admin UI compliance', () => {
  const adminDir = currentDir
  const files = existsSync(adminDir) ? collectTsxFiles(adminDir) : []

  it('does not use browser-native dialogs in admin pages', () => {
    const violations = files.flatMap((file) => {
      const source = stripComments(readFileSync(file, 'utf8'))
      const matches = [
        ...source.matchAll(/\b(?:window\.)?(alert|confirm|prompt)\s*\(/g),
      ]
      return matches.map((match) => `${relative(adminDir, file)} uses ${match[1]}()`)
    })

    expect(violations).toEqual([])
  })

  it('does not use direct native select markup in admin pages', () => {
    const violations = files.flatMap((file) => {
      const source = stripComments(readFileSync(file, 'utf8'))
      const matches = [
        ...source.matchAll(/<\s*\/?\s*(select|option)\b/gi),
      ]
      return matches.map((match) => `${relative(adminDir, file)} uses <${match[1].toLowerCase()}>`)
    })

    expect(violations).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
pnpm vitest run src/pages/admin/admin-ui-compliance.test.ts
```

Expected: FAIL with violations for `AdminVocabularyPage`, `AdminStoragePage`, `AdminFunctionsPage`, `AdminFeaturesPage`, `AdminTtsPage`, `AdminGrammarPage`, `AdminListeningPage`, `AdminGrammarLessonEditPage`, and `AdminI18nPage`.

- [ ] **Step 3: Commit the failing scanner**

Run GitNexus `detect_changes` on staged files.

Then:

```powershell
git add -- src/pages/admin/admin-ui-compliance.test.ts
git commit -m "test: add admin ui compliance scanner"
```

Expected: One test-only commit. The scanner is allowed to fail until the following tasks remove existing violations.

## Task 2: Small Admin Pages Dialogs And Toasts

**Files:**
- Modify: `src/pages/admin/AdminVocabularyPage.tsx`
- Modify: `src/pages/admin/AdminStoragePage.tsx`
- Modify: `src/pages/admin/AdminFunctionsPage.tsx`

**Interfaces:**
- Consumes: `ConfirmModal` from `@/components/ui/confirm-modal`, `showToast` from `@/components/ui/toast`.
- Produces: small admin pages without `alert` or `window.confirm`.

- [ ] **Step 1: Run impact analysis**

Run GitNexus impact for:

- `AdminVocabularyPage`
- `AdminStoragePage`
- `AdminFunctionsPage`

Expected: LOW or MEDIUM. If HIGH or CRITICAL, warn the user before editing.

- [ ] **Step 2: Refactor `AdminVocabularyPage`**

Modify imports:

```tsx
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { showToast } from '@/components/ui/toast'
```

Add state:

```tsx
const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
```

Change `handleDelete` so it no longer calls `window.confirm`:

```tsx
const handleDelete = async (id: string) => {
  try {
    setError(null)
    await adminService.deleteGlobalTerm(id)
    setTerms(prev => prev.filter(t => t.id !== id))
    showToast({
      type: 'success',
      title: 'Đã xóa từ vựng',
      message: 'Từ vựng đã được xóa khỏi thư viện hệ thống.',
    })
  } catch (err: any) {
    console.error(err)
    const message = err.message || 'Lỗi khi xóa từ vựng'
    setError(message)
    showToast({ type: 'error', title: 'Không thể xóa từ vựng', message })
  } finally {
    setPendingDeleteId(null)
  }
}
```

Change delete button:

```tsx
onClick={() => setPendingDeleteId(row.id)}
```

Replace import success alert:

```tsx
showToast({
  type: 'success',
  title: 'Import thành công',
  message: `Đã import ${count} từ vựng mới vào hệ thống.`,
})
```

Render modal near the end of the component:

```tsx
<ConfirmModal
  open={pendingDeleteId !== null}
  title="Xóa từ vựng hệ thống?"
  description="Từ vựng này sẽ bị xóa khỏi thư viện dùng chung."
  confirmLabel="Xóa"
  cancelLabel="Hủy"
  variant="danger"
  onConfirm={() => {
    if (!pendingDeleteId) return
    void handleDelete(pendingDeleteId)
  }}
  onCancel={() => setPendingDeleteId(null)}
/>
```

- [ ] **Step 3: Refactor `AdminStoragePage`**

Modify imports:

```tsx
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { showToast } from '@/components/ui/toast'
```

Add state:

```tsx
const [confirmCleanupOpen, setConfirmCleanupOpen] = useState(false)
```

Change cleanup button:

```tsx
onClick={() => setConfirmCleanupOpen(true)}
```

Change `handleCleanupOrphan`:

```tsx
const handleCleanupOrphan = async () => {
  try {
    setClearing(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    showToast({
      type: 'success',
      title: 'Đã dọn dẹp storage',
      message: 'Không phát hiện tệp tin mồ côi nào.',
    })
    void loadStats()
  } catch (err: any) {
    const message = err?.message || 'Lỗi khi dọn dẹp bộ nhớ'
    showToast({ type: 'error', title: 'Không thể dọn dẹp storage', message })
  } finally {
    setClearing(false)
    setConfirmCleanupOpen(false)
  }
}
```

Render modal:

```tsx
<ConfirmModal
  open={confirmCleanupOpen}
  title="Dọn dẹp storage?"
  description="Thao tác này sẽ quét toàn bộ bucket để tìm tệp không còn được tham chiếu trong DB."
  confirmLabel="Dọn dẹp"
  cancelLabel="Hủy"
  variant="danger"
  onConfirm={() => void handleCleanupOrphan()}
  onCancel={() => setConfirmCleanupOpen(false)}
/>
```

- [ ] **Step 4: Refactor `AdminFunctionsPage`**

Import toast:

```tsx
import { showToast } from '@/components/ui/toast'
```

Replace deploy success alert inside `setTimeout`:

```tsx
showToast({
  type: 'success',
  title: 'Deploy thành công',
  message: `Edge Function "${funcName}" đã được deploy lại.`,
})
```

- [ ] **Step 5: Verify task 2**

Run:

```powershell
pnpm vitest run src/pages/admin/admin-ui-compliance.test.ts
pnpm tsc -b
```

Expected: compliance test still FAILS because other admin pages remain non-compliant; none of the failures should mention `AdminVocabularyPage`, `AdminStoragePage`, or `AdminFunctionsPage`. TypeScript PASS.

- [ ] **Step 6: Commit task 2**

Run:

```powershell
git diff -- src/pages/admin/AdminVocabularyPage.tsx src/pages/admin/AdminStoragePage.tsx src/pages/admin/AdminFunctionsPage.tsx
```

Run GitNexus `detect_changes`.

Then:

```powershell
git add -- src/pages/admin/AdminVocabularyPage.tsx src/pages/admin/AdminStoragePage.tsx src/pages/admin/AdminFunctionsPage.tsx
git commit -m "refactor: replace small admin browser dialogs"
```

## Task 3: Admin Features And TTS Feedback/Selects

**Files:**
- Modify: `src/pages/admin/AdminFeaturesPage.tsx`
- Modify: `src/pages/admin/AdminTtsPage.tsx`

**Interfaces:**
- Consumes: `showToast`, `Select`.
- Produces: feature and TTS admin pages without alerts or page-level native selects.

- [ ] **Step 1: Run impact analysis**

Run GitNexus impact for:

- `AdminFeaturesPage`
- `AdminTtsPage`

Expected: LOW or MEDIUM. Warn the user before editing if HIGH or CRITICAL.

- [ ] **Step 2: Refactor `AdminFeaturesPage` alerts**

Import:

```tsx
import { showToast } from '@/components/ui/toast'
```

Add page-level form error state near existing state declarations:

```tsx
const [formError, setFormError] = useState<string | null>(null)
```

Replace save success alert:

```tsx
showToast({
  type: 'success',
  title: 'Đã lưu cấu hình',
  message: `Cấu hình "${key}" đã được cập nhật.`,
})
```

Replace validation alerts with inline state:

```tsx
setFormError('Vui lòng điền đầy đủ Tên hiển thị và Mã từ loại.')
return
```

```tsx
setFormError('Dữ liệu JSON từ loại bị lỗi. Vui lòng chuyển sang Chế độ chuyên gia để sửa.')
return
```

```tsx
setFormError('Mã từ loại này đã tồn tại.')
return
```

Clear error at the start of valid save/add paths:

```tsx
setFormError(null)
```

Render inline error near the part-of-speech form:

```tsx
{formError ? (
  <div className="p-3 bg-rose-100 border-2 border-rose-400 text-rose-900 rounded-md font-bold text-sm">
    {formError}
  </div>
) : null}
```

- [ ] **Step 3: Refactor `AdminTtsPage` alert**

Import:

```tsx
import { showToast } from '@/components/ui/toast'
```

Replace:

```tsx
alert('Đã cập nhật cấu hình giọng đọc thành công!')
```

with:

```tsx
showToast({
  type: 'success',
  title: 'Đã cập nhật giọng đọc',
  message: 'Cấu hình giọng đọc đã được lưu thành công.',
})
```

- [ ] **Step 4: Replace `AdminTtsPage` selects**

Import:

```tsx
import { Select } from '@/components/ui/select'
```

Replace the test-language select with:

```tsx
<Select
  value={testLang}
  onChange={setTestLang}
  options={configs.map((c) => ({ value: c.language_code, label: c.language_code }))}
  placeholder="Chọn ngôn ngữ"
/>
```

Replace the test voice select with:

```tsx
<Select
  value={testVoice}
  onChange={setTestVoice}
  options={(VOICE_POPULAR[testLang] ?? []).map((voice) => ({ value: voice, label: voice }))}
  placeholder="Chọn giọng đọc"
/>
```

Replace each compare slot language select with:

```tsx
<Select
  value={slot.lang}
  onChange={(newLang) => {
    setCompareSlots(prev => prev.map((s, idx) => idx === i ? {
      ...s,
      lang: newLang,
      voice: VOICE_POPULAR[newLang]?.[0] ?? s.voice,
      audioUrl: null,
      played: false,
    } : s))
  }}
  options={configs.map((c) => ({ value: c.language_code, label: c.language_code }))}
  className="w-24"
/>
```

Replace each compare slot voice select with:

```tsx
<Select
  value={slot.voice}
  onChange={(voice) => {
    setCompareSlots(prev => prev.map((s, idx) => idx === i ? {
      ...s,
      voice,
      audioUrl: null,
      played: false,
    } : s))
  }}
  options={(VOICE_POPULAR[slot.lang] ?? [slot.voice]).map((voice) => ({ value: voice, label: voice }))}
  className="flex-1"
/>
```

- [ ] **Step 5: Verify task 3**

Run:

```powershell
pnpm vitest run src/pages/admin/admin-ui-compliance.test.ts
pnpm tsc -b
```

Expected: compliance test still FAILS only for remaining admin pages. No violation should mention `AdminFeaturesPage` or `AdminTtsPage`. TypeScript PASS.

- [ ] **Step 6: Commit task 3**

Run GitNexus `detect_changes`, then:

```powershell
git add -- src/pages/admin/AdminFeaturesPage.tsx src/pages/admin/AdminTtsPage.tsx
git commit -m "refactor: align admin config controls"
```

## Task 4: Admin Grammar Page Compliance

**Files:**
- Modify: `src/pages/admin/AdminGrammarPage.tsx`

**Interfaces:**
- Consumes: `ConfirmModal`, `showToast`, `Select`.
- Produces: grammar admin page without alerts, confirms, or direct selects.

- [ ] **Step 1: Run impact analysis**

Run GitNexus impact for `AdminGrammarPage`.

Expected: MEDIUM because this page owns many admin grammar flows. Warn if HIGH or CRITICAL.

- [ ] **Step 2: Add imports and pending delete state**

Import:

```tsx
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Select } from '@/components/ui/select'
import { showToast } from '@/components/ui/toast'
```

Add state:

```tsx
const [pendingDeleteTopicId, setPendingDeleteTopicId] = useState<string | null>(null)
const [pendingDeleteExerciseId, setPendingDeleteExerciseId] = useState<string | null>(null)
const [formError, setFormError] = useState<string | null>(null)
```

- [ ] **Step 3: Replace grammar alerts**

Use `showToast` for load/mutation failures:

```tsx
showToast({ type: 'error', title: 'Không thể tải bài tập', message: 'Vui lòng thử lại.' })
```

```tsx
showToast({ type: 'error', title: 'Không thể thay đổi phân quyền', message: err.message })
```

```tsx
showToast({ type: 'error', title: 'Lỗi thao tác hàng loạt', message: err.message })
```

```tsx
showToast({ type: 'error', title: 'Không thể đổi trạng thái phát hành', message: 'Vui lòng thử lại.' })
```

Use inline `formError` for required topic/exercise fields:

```tsx
setFormError('Vui lòng điền đầy đủ thông tin bắt buộc.')
return
```

```tsx
setFormError('Vui lòng nhập câu hỏi và câu trả lời chính xác.')
return
```

Render `formError` near the active form area:

```tsx
{formError ? (
  <div className="p-3 bg-rose-100 border-2 border-rose-400 text-rose-900 rounded-md font-bold text-sm">
    {formError}
  </div>
) : null}
```

- [ ] **Step 4: Replace delete confirms**

Change topic delete trigger:

```tsx
onClick={() => setPendingDeleteTopicId(topic.id)}
```

Change exercise delete trigger:

```tsx
onClick={() => setPendingDeleteExerciseId(exercise.id)}
```

Ensure `handleDeleteTopic` and `handleDeleteExercise` no longer call `window.confirm`.

Render modals:

```tsx
<ConfirmModal
  open={pendingDeleteTopicId !== null}
  title="Xóa chủ đề ngữ pháp?"
  description="Chủ đề này và toàn bộ bài tập liên quan sẽ bị xóa."
  confirmLabel="Xóa"
  cancelLabel="Hủy"
  variant="danger"
  onConfirm={() => {
    if (!pendingDeleteTopicId) return
    void handleDeleteTopic(pendingDeleteTopicId)
  }}
  onCancel={() => setPendingDeleteTopicId(null)}
/>
```

```tsx
<ConfirmModal
  open={pendingDeleteExerciseId !== null}
  title="Xóa bài tập?"
  description="Bài tập này sẽ bị xóa khỏi chủ đề hiện tại."
  confirmLabel="Xóa"
  cancelLabel="Hủy"
  variant="danger"
  onConfirm={() => {
    if (!pendingDeleteExerciseId) return
    void handleDeleteExercise(pendingDeleteExerciseId)
  }}
  onCancel={() => setPendingDeleteExerciseId(null)}
/>
```

Clear pending delete state in `finally` inside each delete handler.

- [ ] **Step 5: Replace grammar selects**

Define options near constants or inside component:

```tsx
const GRAMMAR_CATEGORY_OPTIONS = [
  { value: 'Verb Patterns', label: 'Verb Patterns' },
  { value: 'Connectors', label: 'Connectors' },
  { value: 'Sentence Structure', label: 'Sentence Structure' },
  { value: 'Prepositions', label: 'Prepositions' },
  { value: 'Adjective Phrases', label: 'Adjective Phrases' },
  { value: 'Adverbs', label: 'Adverbs' },
]

const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

const ACCESS_TIER_OPTIONS = [
  { value: 'free', label: 'Free (Miễn phí)' },
  { value: 'pro', label: 'Pro (Trả phí)' },
]

const GRAMMAR_TEASER_OPTIONS = [
  { value: 'title_only', label: 'Chỉ hiện tiêu đề' },
  { value: 'theory_only', label: 'Hiển thị lý thuyết, khóa bài tập' },
  { value: 'partial_exercise', label: 'Cho làm 2 câu hỏi đầu tiên' },
]
```

Use `Select` with explicit casts:

```tsx
<Select
  value={topicForm.category || 'Verb Patterns'}
  onChange={(value) => setTopicForm(prev => ({ ...prev, category: value }))}
  options={GRAMMAR_CATEGORY_OPTIONS}
/>
```

```tsx
<Select
  value={topicForm.level || 'beginner'}
  onChange={(value) => setTopicForm(prev => ({ ...prev, level: value as 'beginner' | 'intermediate' | 'advanced' }))}
  options={LEVEL_OPTIONS}
/>
```

```tsx
<Select
  value={topicForm.access_tier || 'free'}
  onChange={(value) => setTopicForm(prev => ({ ...prev, access_tier: value as 'free' | 'pro' }))}
  options={ACCESS_TIER_OPTIONS}
/>
```

```tsx
<Select
  value={topicForm.teaser_config?.type || 'title_only'}
  onChange={(value) => setTopicForm(prev => ({
    ...prev,
    teaser_config: { enabled: true, type: value as 'title_only' | 'theory_only' | 'partial_exercise' },
  }))}
  options={GRAMMAR_TEASER_OPTIONS}
/>
```

- [ ] **Step 6: Verify task 4**

Run:

```powershell
pnpm vitest run src/pages/admin/admin-ui-compliance.test.ts
pnpm tsc -b
```

Expected: compliance test still FAILS for remaining admin pages, with no `AdminGrammarPage` violations. TypeScript PASS.

- [ ] **Step 7: Commit task 4**

Run GitNexus `detect_changes`, then:

```powershell
git add -- src/pages/admin/AdminGrammarPage.tsx
git commit -m "refactor: align grammar admin controls"
```

## Task 5: Admin Listening Page Compliance

**Files:**
- Modify: `src/pages/admin/AdminListeningPage.tsx`

**Interfaces:**
- Consumes: `ConfirmModal`, `showToast`, `Select`.
- Produces: listening admin page without alerts, confirms, or direct selects.

- [ ] **Step 1: Run impact analysis**

Run GitNexus impact for `AdminListeningPage`.

Expected: MEDIUM because this page owns topic/test/part/question editing. Warn if HIGH or CRITICAL.

- [ ] **Step 2: Add imports and state**

Import:

```tsx
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Select } from '@/components/ui/select'
import { showToast } from '@/components/ui/toast'
```

Add state:

```tsx
const [pendingDeleteTopicId, setPendingDeleteTopicId] = useState<string | null>(null)
const [pendingDeleteTestId, setPendingDeleteTestId] = useState<string | null>(null)
const [pendingDeletePartId, setPendingDeletePartId] = useState<string | null>(null)
const [formError, setFormError] = useState<string | null>(null)
```

- [ ] **Step 3: Replace alerts with toast/inline errors**

Use inline `formError` for required fields:

```tsx
setFormError('Vui lòng nhập tiêu đề.')
return
```

```tsx
setFormError('Vui lòng nhập tên đề thi.')
return
```

```tsx
setFormError('Vui lòng nhập URL âm thanh.')
return
```

Use toast for load/mutation failures:

```tsx
showToast({ type: 'error', title: 'Không thể tải đề thi', message: 'Vui lòng thử lại.' })
```

```tsx
showToast({ type: 'error', title: 'Không thể tải phần thi', message: 'Vui lòng thử lại.' })
```

```tsx
showToast({ type: 'error', title: 'Không thể lưu chủ đề', message: err.message || 'Vui lòng thử lại.' })
```

```tsx
showToast({ type: 'error', title: 'Không thể thay đổi phân quyền', message: err.message })
```

```tsx
showToast({ type: 'error', title: 'Lỗi thao tác hàng loạt', message: err.message })
```

- [ ] **Step 4: Replace delete confirms**

Change triggers:

```tsx
onClick={() => setPendingDeleteTopicId(topic.id)}
onClick={() => setPendingDeleteTestId(test.id)}
onClick={() => setPendingDeletePartId(part.id)}
```

Remove `window.confirm` from `handleDeleteTopic`, `handleDeleteTest`, and `handleDeletePart`. Clear pending state in `finally`.

Render three `ConfirmModal` instances:

```tsx
<ConfirmModal
  open={pendingDeleteTopicId !== null}
  title="Xóa chủ đề nghe?"
  description="Chủ đề này sẽ xóa toàn bộ đề thi và phần nghe liên quan."
  confirmLabel="Xóa"
  cancelLabel="Hủy"
  variant="danger"
  onConfirm={() => {
    if (!pendingDeleteTopicId) return
    void handleDeleteTopic(pendingDeleteTopicId)
  }}
  onCancel={() => setPendingDeleteTopicId(null)}
/>
```

```tsx
<ConfirmModal
  open={pendingDeleteTestId !== null}
  title="Xóa đề thi?"
  description="Đề thi này sẽ xóa toàn bộ phần nghe và câu hỏi liên quan."
  confirmLabel="Xóa"
  cancelLabel="Hủy"
  variant="danger"
  onConfirm={() => {
    if (!pendingDeleteTestId) return
    void handleDeleteTest(pendingDeleteTestId)
  }}
  onCancel={() => setPendingDeleteTestId(null)}
/>
```

```tsx
<ConfirmModal
  open={pendingDeletePartId !== null}
  title="Xóa phần thi?"
  description="Phần thi này sẽ bị xóa khỏi đề hiện tại."
  confirmLabel="Xóa"
  cancelLabel="Hủy"
  variant="danger"
  onConfirm={() => {
    if (!pendingDeletePartId) return
    void handleDeletePart(pendingDeletePartId)
  }}
  onCancel={() => setPendingDeletePartId(null)}
/>
```

- [ ] **Step 5: Replace listening selects**

Define options:

```tsx
const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

const ACCESS_TIER_OPTIONS = [
  { value: 'free', label: 'Free (Miễn phí)' },
  { value: 'pro', label: 'Pro (Trả phí)' },
]

const LISTENING_TEASER_OPTIONS = [
  { value: 'title_only', label: 'Chỉ hiện tiêu đề & mô tả' },
  { value: 'audio_preview', label: 'Nghe thử 30 giây đầu' },
  { value: 'transcript_preview', label: 'Hiển thị transcript đoạn đầu' },
]

const PART_NUMBER_OPTIONS = [
  { value: '1', label: 'Part 1' },
  { value: '2', label: 'Part 2' },
  { value: '3', label: 'Part 3' },
  { value: '4', label: 'Part 4' },
]

const ANSWER_OPTIONS = [
  { value: '0', label: 'A' },
  { value: '1', label: 'B' },
  { value: '2', label: 'C' },
  { value: '3', label: 'D' },
]
```

Use `Select` with conversions:

```tsx
<Select
  value={topicForm.difficulty || 'intermediate'}
  onChange={(value) => setTopicForm(prev => ({ ...prev, difficulty: value }))}
  options={LEVEL_OPTIONS}
/>
```

```tsx
<Select
  value={topicForm.access_tier || 'free'}
  onChange={(value) => setTopicForm(prev => ({ ...prev, access_tier: value as 'free' | 'pro' }))}
  options={ACCESS_TIER_OPTIONS}
/>
```

```tsx
<Select
  value={partForm.part_number ? String(partForm.part_number) : '1'}
  onChange={(value) => setPartForm(prev => ({ ...prev, part_number: Number(value) as 1 | 2 | 3 | 4 }))}
  options={PART_NUMBER_OPTIONS}
/>
```

```tsx
<Select
  value={String(question.correctIndex ?? 0)}
  onChange={(value) => {
    const questions = [...partForm.questions]
    questions[idx].correctIndex = Number(value)
    setPartForm((prev: any) => ({ ...prev, questions }))
  }}
  options={ANSWER_OPTIONS}
/>
```

- [ ] **Step 6: Verify task 5**

Run:

```powershell
pnpm vitest run src/pages/admin/admin-ui-compliance.test.ts
pnpm tsc -b
```

Expected: compliance test still FAILS only for `AdminGrammarLessonEditPage` and `AdminI18nPage` if earlier tasks passed. TypeScript PASS.

- [ ] **Step 7: Commit task 5**

Run GitNexus `detect_changes`, then:

```powershell
git add -- src/pages/admin/AdminListeningPage.tsx
git commit -m "refactor: align listening admin controls"
```

## Task 6: Remaining Admin Selects

**Files:**
- Modify: `src/pages/admin/AdminGrammarLessonEditPage.tsx`
- Modify: `src/pages/admin/AdminI18nPage.tsx`

**Interfaces:**
- Consumes: `Select`.
- Produces: remaining admin pages without direct native select markup.

- [ ] **Step 1: Run impact analysis**

Run GitNexus impact for:

- `AdminGrammarLessonEditPage`
- `AdminI18nPage`

Expected: LOW or MEDIUM. Warn if HIGH or CRITICAL.

- [ ] **Step 2: Refactor `AdminGrammarLessonEditPage` block type select**

Import:

```tsx
import { Select } from '@/components/ui/select'
```

Define options:

```tsx
const BLOCK_TYPE_OPTIONS = [
  { value: '', label: '+ Thêm block...' },
  ...(Object.entries(BLOCK_TYPE_LABELS) as [BlockType, string][]).map(([value, label]) => ({
    value,
    label,
  })),
]
```

Replace native select with:

```tsx
<Select
  value={addingType ?? ''}
  onChange={(value) => setAddingType((value || null) as BlockType | null)}
  options={BLOCK_TYPE_OPTIONS}
  placeholder="+ Thêm block..."
  className="max-w-xs"
/>
```

- [ ] **Step 3: Refactor `AdminI18nPage` section select**

Import:

```tsx
import { Select } from '@/components/ui/select'
```

Define options:

```tsx
const SECTION_OPTIONS = [
  { value: 'all', label: 'Tất cả phân mục' },
  { value: 'navigation', label: 'Navigation (Điều hướng)' },
  { value: 'actions', label: 'Actions (Hành động)' },
  { value: 'study', label: 'Study (Học thẻ)' },
  { value: 'quiz', label: 'Quiz (Kiểm tra)' },
  { value: 'settings', label: 'Settings (Cài đặt)' },
]
```

Replace native select with:

```tsx
<Select
  value={filterSection}
  onChange={setFilterSection}
  options={SECTION_OPTIONS}
  className="sm:w-64"
/>
```

- [ ] **Step 4: Verify task 6**

Run:

```powershell
pnpm vitest run src/pages/admin/admin-ui-compliance.test.ts
pnpm tsc -b
```

Expected: compliance test PASS. TypeScript PASS.

- [ ] **Step 5: Commit task 6**

Run GitNexus `detect_changes`, then:

```powershell
git add -- src/pages/admin/AdminGrammarLessonEditPage.tsx src/pages/admin/AdminI18nPage.tsx
git commit -m "refactor: replace remaining admin selects"
```

## Task 7: Focused Interaction Tests

**Files:**
- Create: `src/pages/admin/AdminVocabularyPage.test.tsx`
- Create: `src/pages/admin/AdminStoragePage.test.tsx`

**Interfaces:**
- Consumes: `AdminVocabularyPage`, `AdminStoragePage`, mocked `adminService`, Testing Library.
- Produces: interaction coverage for the two representative confirmation flows.

- [ ] **Step 1: Write `AdminVocabularyPage` confirmation test**

Create `src/pages/admin/AdminVocabularyPage.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminVocabularyPage from './AdminVocabularyPage'
import { adminService } from '@/services/supabase/admin.service'

vi.mock('@/services/supabase/admin.service', () => ({
  adminService: {
    listGlobalTerms: vi.fn(),
    deleteGlobalTerm: vi.fn(),
    bulkImportVocabulary: vi.fn(),
  },
}))

vi.mock('@/components/ui/toast', () => ({
  showToast: vi.fn(),
}))

describe('AdminVocabularyPage confirmations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(adminService.listGlobalTerms).mockResolvedValue([
      {
        id: 'term-1',
        source_text: 'hello',
        ipa: 'həˈləʊ',
        item_type: 'word',
        part_of_speech: 'interjection',
        meanings: ['xin chào'],
      },
    ] as never)
    vi.mocked(adminService.deleteGlobalTerm).mockResolvedValue(undefined as never)
  })

  it('opens a confirmation modal before deleting a global term', async () => {
    const user = userEvent.setup()
    render(<AdminVocabularyPage />)

    await screen.findByText('hello')
    await user.click(screen.getByTitle('Xóa khỏi hệ thống'))

    expect(screen.getByRole('dialog', { name: 'Xóa từ vựng hệ thống?' })).toBeInTheDocument()
    expect(adminService.deleteGlobalTerm).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Xóa' }))

    await waitFor(() => {
      expect(adminService.deleteGlobalTerm).toHaveBeenCalledWith('term-1')
    })
  })
})
```

- [ ] **Step 2: Write `AdminStoragePage` confirmation test**

Create `src/pages/admin/AdminStoragePage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminStoragePage from './AdminStoragePage'
import { adminService } from '@/services/supabase/admin.service'

vi.mock('@/services/supabase/admin.service', () => ({
  adminService: {
    getStorageStats: vi.fn(),
  },
}))

vi.mock('@/components/ui/toast', () => ({
  showToast: vi.fn(),
}))

describe('AdminStoragePage confirmations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    vi.mocked(adminService.getStorageStats).mockResolvedValue({
      vocabImages: { count: 0, sizeBytes: 0 },
      audioCache: { count: 0, sizeBytes: 0 },
      listeningAudio: { count: 0, sizeBytes: 0 },
    } as never)
  })

  it('opens a confirmation modal before storage cleanup', async () => {
    const user = userEvent.setup()
    render(<AdminStoragePage />)

    await screen.findByText('Dọn dẹp bộ nhớ đệm lưu trữ')
    await user.click(screen.getByRole('button', { name: /dọn dẹp storage/i }))

    expect(screen.getByRole('dialog', { name: 'Dọn dẹp storage?' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run focused tests**

Run:

```powershell
pnpm vitest run src/pages/admin/AdminVocabularyPage.test.tsx src/pages/admin/AdminStoragePage.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Commit task 7**

Run GitNexus `detect_changes`, then:

```powershell
git add -- src/pages/admin/AdminVocabularyPage.test.tsx src/pages/admin/AdminStoragePage.test.tsx
git commit -m "test: cover admin confirmation flows"
```

## Task 8: Final Verification And Documentation

**Files:**
- Modify: `CLAUDE.md` only if a new reusable convention was learned.

**Interfaces:**
- Consumes: all prior task changes.
- Produces: verified package 4 implementation and final handoff for cross-package audit.

- [ ] **Step 1: Run compliance scanner**

Run:

```powershell
pnpm vitest run src/pages/admin/admin-ui-compliance.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run targeted admin tests**

Run:

```powershell
pnpm vitest run src/pages/admin/admin-ui-compliance.test.ts src/pages/admin/AdminVocabularyPage.test.tsx src/pages/admin/AdminStoragePage.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Run TypeScript build**

Run:

```powershell
pnpm tsc -b
```

Expected: PASS.

- [ ] **Step 4: Run full test suite**

Run:

```powershell
pnpm test
```

Expected: PASS. If an unrelated existing test fails, record the exact failing test and do not claim full suite success.

- [ ] **Step 5: Final grep audit**

Run:

```powershell
rg -n "alert\(|window\.alert|confirm\(|window\.confirm|prompt\(|window\.prompt|<select|<option" src/pages/admin -g "*.tsx"
```

Expected: no output.

- [ ] **Step 6: Update `CLAUDE.md` if needed**

Only update `CLAUDE.md` if implementation reveals a new reusable convention not already captured by `AGENTS.md` or this package's design spec. If no update is needed, do not edit it.

- [ ] **Step 7: Commit documentation if changed**

If `CLAUDE.md` changed, run GitNexus `detect_changes`, then:

```powershell
git add -- CLAUDE.md
git commit -m "docs: document admin ui compliance"
```

Expected: documentation-only commit. Skip this step if `CLAUDE.md` did not change.

- [ ] **Step 8: Report final package 4 status**

Report:

- Commit hashes created for package 4.
- Verification results.
- Remaining dirty files ignored.
- Production blockers, including unapplied Supabase migrations from earlier packages.
- Next action: final cross-package audit for packages 1-4.

## Notes For Implementers

- `src/components/ui/select.tsx` contains hidden native markup; do not modify it for this package.
- The compliance scanner only targets `src/pages/admin/**/*.tsx`.
- Use project `Select` as a single component with `options`; do not use shadcn-style `SelectTrigger`, `SelectValue`, `SelectContent`, or `SelectItem`.
- Prefer toast for operation feedback and inline state for field/form validation.
- Do not add new dependencies.
- Do not push commits.
