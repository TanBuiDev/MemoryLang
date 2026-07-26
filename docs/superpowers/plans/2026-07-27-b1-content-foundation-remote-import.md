# B1 Content Foundation and Remote Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tạo schema nền tảng cho bộ đề B1, trích xuất toàn bộ nội dung `DeFull Copy.pdf` thành artifact đã kiểm chứng, seed dữ liệu nháp idempotent và migration lên Supabase remote.

**Architecture:** `exams` tiếp tục là aggregate root; `exam_sections` liên kết các tài nguyên luyện tập độc lập. Nội dung khách quan dùng `practice_activities`/`practice_questions`, Writing và Speaking dùng `practice_prompts`; attempt/draft được tạo ở phase sau nhưng schema ownership và khóa ngoại được chuẩn bị ngay. Artifact JSON là nguồn dữ liệu review được chuyển thành SQL seed ổn định, không gọi AI hoặc đọc PDF trong migration.

**Tech Stack:** PostgreSQL 17, Supabase CLI, Supabase RLS, TypeScript 6, Zod 4, Vitest, PyMuPDF chỉ dùng ngoại tuyến để trích xuất PDF.

## Global Constraints

- Luôn chạy `pnpm tsc -b` hoặc `pnpm build` thành công trước mỗi commit.
- Chỉ tạo migration bằng `supabase migration new extend_exams_for_b1_practice` hoặc `supabase migration new seed_b1_de_full_copy`; không tự đặt timestamp.
- Chạy GitNexus impact trước khi sửa symbol và `gitnexus_detect_changes()` trước commit.
- Mọi bảng trong `public` phải bật RLS và có Data API grants tối thiểu.
- Không dùng `auth.jwt()->'user_metadata'` để phân quyền.
- Không đưa service-role key, API key hoặc secret vào mã nguồn/artifact.
- Seed phải idempotent và không nhân đôi dữ liệu khi chạy lại.
- Tất cả dữ liệu nhập ban đầu giữ `is_published = false`.
- Signs để `image_url = null`; Listening/Writing/Speaking để `audio_url = null`.
- Không sử dụng raw `<select>`, browser dialog hoặc editor JSON trong UI.
- Không thay đổi hoặc stage các file untracked không thuộc phase này.

---

## File Map

- `scripts/extract-b1-pdf.py`: đọc text layer, annotation và metadata trang; xuất artifact thô có provenance.
- `scripts/validate-b1-content.mjs`: validate artifact chuẩn hóa và in báo cáo lỗi có đường dẫn JSON.
- `docs/data/b1-de-full-copy.json`: artifact chuẩn hóa, reviewable và là nguồn seed duy nhất.
- `src/types/exam.types.ts`: bổ sung type cho section, activity, prompt và các dạng câu hỏi.
- `src/types/exam.types.test.ts`: contract test cho dữ liệu artifact/type guards.
- Migration có hậu tố `_extend_exams_for_b1_practice.sql` do Supabase CLI tạo: schema, RLS, grants, indexes và constraints; đường dẫn đầy đủ được CLI in ra và được lưu vào biến `$schemaMigrationPath` trong phiên thực thi.
- Migration có hậu tố `_seed_b1_de_full_copy.sql` do Supabase CLI tạo: seed/upsert bộ đề, section, activity, question và prompt; đường dẫn đầy đủ được CLI in ra và được lưu vào biến `$seedMigrationPath`.
- `supabase/tests/database/b1_exam_practice.test.sql`: database contract, RLS và idempotency assertions.
- `CLAUDE.md`: cập nhật schema và quy ước import sau khi remote đã được xác minh.

### Task 1: Khóa contract dữ liệu B1

**Files:**
- Modify: `src/types/exam.types.ts`
- Create: `src/types/exam.types.test.ts`

**Interfaces:**
- Produces: `ExamSection`, `PracticeActivity`, `PracticeQuestion`, `PracticePrompt`, `B1ContentArtifact`.
- Produces: `isB1ContentArtifact(value: unknown): value is B1ContentArtifact`.
- Consumes: `Exam`, `ExamCategory`, `ExamAccessTier` hiện có.

- [ ] **Step 1: Chạy impact analysis**

Run GitNexus:

```text
gitnexus_impact({
  target: "Exam",
  file_path: "src/types/exam.types.ts",
  direction: "upstream",
  includeTests: true
})
```

Expected: ghi lại direct importers và risk. Nếu HIGH/CRITICAL, dừng và báo người dùng trước khi sửa.

- [ ] **Step 2: Viết contract test thất bại**

Tạo test với một artifact tối thiểu:

```ts
import { describe, expect, it } from 'vitest'
import { isB1ContentArtifact } from './exam.types'

describe('isB1ContentArtifact', () => {
  it('accepts a linked draft exam with activities and prompts', () => {
    expect(isB1ContentArtifact({
      source: { file_name: 'DeFull Copy.pdf', page_count: 18 },
      exam: { source_key: 'b1-de-full-copy', title: 'B1 Tổng hợp', default_time_minutes: 120 },
      activities: [{
        source_key: 'b1-grammar-use-of-english',
        skill: 'grammar',
        activity_type: 'multiple_choice',
        title: 'Grammar and Use of English',
        questions: [{
          source_key: 'grammar-101',
          source_number: '101',
          question_type: 'multiple_choice',
          prompt: 'Andrew managed ___ a promotion.',
          options: [
            { key: 'A', text: 'in getting', is_correct: false },
            { key: 'B', text: 'to get', is_correct: true },
          ],
          accepted_answers: [],
          source_page: 1,
          image_url: null,
        }],
      }],
      prompts: [],
      sections: [{
        source_key: 'section-grammar',
        skill: 'grammar',
        resource_type: 'activity',
        resource_source_key: 'b1-grammar-use-of-english',
        order_index: 1,
        is_required: true,
      }],
    })).toBe(true)
  })

  it('rejects a multiple-choice question without exactly one correct answer', () => {
    const invalid = {
      source: { file_name: 'DeFull Copy.pdf', page_count: 18 },
      exam: { source_key: 'b1', title: 'B1', default_time_minutes: 120 },
      activities: [{
        source_key: 'a',
        skill: 'grammar',
        activity_type: 'multiple_choice',
        title: 'A',
        questions: [{
          source_key: 'q',
          source_number: '1',
          question_type: 'multiple_choice',
          prompt: 'Question',
          options: [],
          accepted_answers: [],
          source_page: 1,
          image_url: null,
        }],
      }],
      prompts: [],
      sections: [],
    }
    expect(isB1ContentArtifact(invalid)).toBe(false)
  })
})
```

- [ ] **Step 3: Chạy test và xác nhận fail**

Run:

```bash
pnpm vitest run src/types/exam.types.test.ts
```

Expected: FAIL vì `isB1ContentArtifact` chưa tồn tại.

- [ ] **Step 4: Thêm type và guard tối thiểu**

Thêm các union chính xác:

```ts
export type ExamSkill = 'grammar' | 'signs' | 'reading' | 'cloze' | 'transformation' | 'listening' | 'writing' | 'speaking'
export type PracticeQuestionType = 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_text'
export type ExamResourceType = 'activity' | 'prompt'

export interface B1QuestionSeed {
  source_key: string
  source_number: string
  question_type: PracticeQuestionType
  prompt: string
  options: ExamQuestionOption[]
  accepted_answers: string[]
  source_page: number
  image_url: string | null
}
```

Implement guard kiểm tra:

- `page_count === 18`.
- `source_key` không rỗng và duy nhất trong từng collection.
- Multiple choice/True-False có đúng một lựa chọn đúng.
- Fill blank/short text có ít nhất một `accepted_answer`.
- Mọi section tham chiếu đúng activity hoặc prompt.

- [ ] **Step 5: Chạy test**

Run:

```bash
pnpm vitest run src/types/exam.types.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit contract**

Run `git status`, `git diff` từng file, secret scan, `pnpm tsc -b`, GitNexus detect changes, rồi:

```bash
git add src/types/exam.types.ts src/types/exam.types.test.ts
git commit -m "feat(exam): define B1 content import contracts"
```

### Task 2: Trích xuất PDF có provenance

**Files:**
- Create: `scripts/extract-b1-pdf.py`
- Create: `scripts/fixtures/b1-pdf-extraction.expected.json`

**Interfaces:**
- Consumes: CLI `python scripts/extract-b1-pdf.py --input "E:\b1\DeFull Copy.pdf" --output "tmp/b1-de-full-copy.raw.json"`.
- Produces: JSON thô gồm `pages[].text`, `pages[].annotations[]`, `pages[].image_count`.

- [ ] **Step 1: Tạo fixture kỳ vọng**

Fixture phải chứa:

```json
{
  "page_count": 18,
  "annotation_count": 99,
  "required_markers": {
    "1": ["101. Andrew managed"],
    "3": ["B. Signs", "PLEASE KEEP THIS DRIVEWAY ENTRANCE CLEAR"],
    "5": ["COASTEERING"],
    "10": ["2. COMPOSITION"],
    "11": ["LISTENING"],
    "16": ["SPEAKING TEST INSTRUCTIONS"],
    "18": ["Topic 33", "Topic 34", "Topic 35"]
  }
}
```

- [ ] **Step 2: Viết extractor**

Script:

- Dùng `fitz.open()`.
- Thất bại nếu PDF mã hóa hoặc không đủ 18 trang.
- Ghi text, image count, kích thước trang.
- Duyệt annotation, lưu type, rect, content, stroke/fill color.
- Chuẩn hóa ký tự replacement trong FreeText thành khoảng trắng.
- Không ghi email watermark vào artifact chuẩn hóa.

- [ ] **Step 3: Chạy extractor**

Run:

```bash
python scripts/extract-b1-pdf.py --input "E:\b1\DeFull Copy.pdf" --output "tmp/b1-de-full-copy.raw.json"
```

Expected: exit 0, `page_count=18`, `annotation_count=99`.

- [ ] **Step 4: Kiểm tra fixture**

Run script ở chế độ `--assert-fixture scripts/fixtures/b1-pdf-extraction.expected.json`.

Expected: PASS và tất cả marker xuất hiện đúng trang.

- [ ] **Step 5: Commit extractor**

Sau status/diff, secret scan và `pnpm tsc -b`:

```bash
git add scripts/extract-b1-pdf.py scripts/fixtures/b1-pdf-extraction.expected.json
git commit -m "feat(exam): add provenance-aware B1 PDF extractor"
```

### Task 3: Chuẩn hóa artifact nội dung

**Files:**
- Create: `docs/data/b1-de-full-copy.json`
- Create: `scripts/validate-b1-content.mjs`
- Create: `scripts/validate-b1-content.test.mjs`

**Interfaces:**
- Consumes: `B1ContentArtifact`.
- Produces: exit 0 và summary counts; exit 1 cùng JSON path cho dữ liệu lỗi.

- [ ] **Step 1: Viết test validator thất bại**

Test phải xác nhận:

- Duplicate `source_key` bị từ chối.
- Multiple choice không có đúng một đáp án bị từ chối.
- Section tham chiếu resource không tồn tại bị từ chối.
- `source_page` ngoài 1-18 bị từ chối.
- Placeholder ảnh/audio `null` được chấp nhận nhưng xuất warning.

- [ ] **Step 2: Chạy test fail**

Run:

```bash
node --test scripts/validate-b1-content.test.mjs
```

Expected: FAIL vì validator chưa tồn tại.

- [ ] **Step 3: Implement validator**

Export:

```js
export function validateB1Artifact(value) {
  return {
    valid: boolean,
    errors: Array<{ path: string, message: string }>,
    warnings: Array<{ path: string, message: string }>,
    counts: Record<string, number>,
  }
}
```

CLI in:

```bash
node scripts/validate-b1-content.mjs docs/data/b1-de-full-copy.json
```

- [ ] **Step 4: Tạo artifact chuẩn hóa**

Nhập đầy đủ nội dung đã trích xuất, gồm:

- 20 câu Grammar.
- 15 câu Signs, `image_url: null`.
- 10 câu của hai bài Reading.
- 10 câu Cloze.
- 10 câu Sentence Transformation.
- Một Writing prompt.
- Năm Listening activities tương ứng Text 1, 31, 34, 52, 56, `audio_url: null`.
- Speaking instructions và các prompt nhìn thấy trong PDF, `audio_url: null`.
- Section liên kết theo thứ tự thi.

Mỗi câu lưu `source_page`, `source_number` và `source_key`. Đáp án lấy từ annotation tô vàng/FreeText; không tự suy đoán khi PDF không cung cấp.

- [ ] **Step 5: Chạy validator và review counts**

Run:

```bash
node --test scripts/validate-b1-content.test.mjs
node scripts/validate-b1-content.mjs docs/data/b1-de-full-copy.json
```

Expected: tests PASS; artifact `valid=true`; chỉ warning thiếu Signs image và audio.

- [ ] **Step 6: Commit artifact**

Sau status/diff, secret scan và `pnpm tsc -b`:

```bash
git add docs/data/b1-de-full-copy.json scripts/validate-b1-content.mjs scripts/validate-b1-content.test.mjs
git commit -m "feat(exam): add validated B1 source content"
```

### Task 4: Tạo schema B1 practice

**Files:**
- Create: migration được in ra bởi `supabase migration new extend_exams_for_b1_practice`
- Create: `supabase/tests/database/b1_exam_practice.test.sql`

**Interfaces:**
- Produces tables: `exam_sections`, `practice_activities`, `practice_questions`, `practice_prompts`.
- Produces constraints/indexes/RLS/grants.
- Consumes: `public.exams`, `public.profiles`, `public.is_user_pro(uuid)` nếu tồn tại.

- [ ] **Step 1: Kiểm tra CLI và migration state**

Run:

```bash
pnpm exec supabase --version
pnpm exec supabase migration list
pnpm exec supabase migration new --help
```

Expected: CLI hoạt động và local/remote history không diverge. Nếu diverge, dừng trước khi tạo file.

- [ ] **Step 2: Chạy Supabase advisors hiện tại**

Run command được xác nhận bởi `supabase db --help`, hoặc MCP advisors nếu CLI hiện tại hỗ trợ.

Expected: lưu baseline; không quy lỗi cũ cho migration mới.

- [ ] **Step 3: Tạo migration bằng CLI**

Run:

```bash
pnpm exec supabase migration new extend_exams_for_b1_practice
```

Expected: CLI in chính xác đường dẫn migration. Dùng đúng file đó cho các bước sau.

Trong PowerShell, bắt đường dẫn vừa tạo và xác minh chỉ có một kết quả:

```powershell
$schemaMigrationPath = (Get-ChildItem -LiteralPath 'supabase/migrations' -Filter '*_extend_exams_for_b1_practice.sql').FullName
if (@($schemaMigrationPath).Count -ne 1) { throw 'Expected exactly one schema migration path' }
```

- [ ] **Step 4: Viết database test thất bại**

Test SQL kiểm tra:

```sql
select has_table('public', 'exam_sections');
select has_table('public', 'practice_activities');
select has_table('public', 'practice_questions');
select has_table('public', 'practice_prompts');
select col_is_null('public', 'practice_questions', 'image_url');
select col_is_null('public', 'practice_activities', 'audio_url');
select col_is_null('public', 'practice_prompts', 'audio_url');
```

Thêm test foreign key, unique `(exam_id, source_key)`, unique `(activity_id, source_key)`, RLS enabled và authenticated ownership/admin policies.

- [ ] **Step 5: Chạy database test fail**

Run:

```bash
pnpm exec supabase start
pnpm exec supabase db reset
pnpm exec supabase test db supabase/tests/database/b1_exam_practice.test.sql
```

Expected: FAIL do bảng chưa tồn tại.

- [ ] **Step 6: Implement schema**

Migration phải:

- Bổ sung `source_key`, `cefr_level`, `default_time_minutes` cho `exams`.
- Tạo bốn bảng với UUID PK, timestamps, nullable media URLs và JSONB metadata.
- Dùng check constraints cho skill/question/resource type.
- Index tất cả FK và lookup `(source_key)`.
- Bật RLS.
- Grant SELECT published content cho authenticated; CRUD admin bằng `public.is_admin()` hoặc `profiles.is_admin`.
- Không tham chiếu `user_metadata`.
- Sửa policy Exam cũ để loại bỏ `user_metadata`.

- [ ] **Step 7: Chạy reset/test/advisors**

Run:

```bash
pnpm exec supabase db reset
pnpm exec supabase test db supabase/tests/database/b1_exam_practice.test.sql
pnpm tsc -b
```

Expected: PASS, advisors không có lỗi mới do migration.

- [ ] **Step 8: Commit schema**

Sau GitNexus detect changes và review SQL:

```bash
git add -- $schemaMigrationPath supabase/tests/database/b1_exam_practice.test.sql
git commit -m "feat(db): add B1 practice content schema"
```

### Task 5: Sinh seed idempotent từ artifact

**Files:**
- Create: `scripts/build-b1-seed.mjs`
- Create: `scripts/build-b1-seed.test.mjs`
- Create: migration được in ra bởi `supabase migration new seed_b1_de_full_copy`

**Interfaces:**
- Consumes: `docs/data/b1-de-full-copy.json`.
- Produces: SQL transaction dùng deterministic UUID và `ON CONFLICT`.

- [ ] **Step 1: Viết generator test fail**

Test yêu cầu output:

- Bắt đầu `begin;` và kết thúc `commit;`.
- Upsert đúng một `exams` row theo `source_key`.
- Upsert resource trước section.
- Không có email watermark.
- Có literal `is_published = false`.
- Có `image_url = null` cho Signs.
- Có `audio_url = null` cho Listening/Writing/Speaking.
- Không chứa key/secret.

- [ ] **Step 2: Chạy test fail**

Run:

```bash
node --test scripts/build-b1-seed.test.mjs
```

Expected: FAIL vì generator chưa tồn tại.

- [ ] **Step 3: Tạo migration seed bằng CLI**

Run:

```bash
pnpm exec supabase migration new seed_b1_de_full_copy
```

Expected: CLI in đường dẫn migration seed.

Trong PowerShell, bắt đường dẫn vừa tạo và xác minh chỉ có một kết quả:

```powershell
$seedMigrationPath = (Get-ChildItem -LiteralPath 'supabase/migrations' -Filter '*_seed_b1_de_full_copy.sql').FullName
if (@($seedMigrationPath).Count -ne 1) { throw 'Expected exactly one seed migration path' }
```

- [ ] **Step 4: Implement generator**

Generator:

- Validate artifact trước khi sinh SQL.
- Dùng namespace UUID cố định và UUID v5 từ `source_key`.
- Escape SQL literal an toàn.
- Sinh insert theo thứ tự exam → activities/prompts → questions → sections.
- Dùng `ON CONFLICT (source_key) DO UPDATE` cho resource.
- Không publish.

- [ ] **Step 5: Sinh migration và chạy test**

Run:

```bash
node scripts/build-b1-seed.mjs docs/data/b1-de-full-copy.json $seedMigrationPath
node --test scripts/build-b1-seed.test.mjs
pnpm exec supabase db reset
pnpm exec supabase test db supabase/tests/database/b1_exam_practice.test.sql
```

Expected: PASS.

- [ ] **Step 6: Kiểm tra idempotency**

Trong local DB, chạy thân seed lần hai trong transaction test rồi assert:

```sql
select count(*) = 1 from exams where source_key = 'b1-de-full-copy';
select count(*) = count(distinct source_key)
from practice_activities
where source_document = 'DeFull Copy.pdf';
select count(*) = count(distinct source_key)
from practice_prompts
where source_document = 'DeFull Copy.pdf';
```

Expected: tất cả true.

- [ ] **Step 7: Commit seed**

Sau review generated SQL, secret scan, `pnpm tsc -b`, GitNexus detect changes:

```bash
git add -- scripts/build-b1-seed.mjs scripts/build-b1-seed.test.mjs $seedMigrationPath
git commit -m "feat(db): seed B1 DeFull practice content"
```

### Task 6: Apply remote và xác minh dữ liệu

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: hai migration đã test local.
- Produces: remote schema/data đã xác minh và tài liệu dự án cập nhật.

- [ ] **Step 1: Xác nhận đúng remote project**

Run các lệnh read-only từ `supabase --help`/`supabase projects --help` để xác nhận project ref linked khớp môi trường production mong muốn.

Expected: đúng project; không push nếu project không xác định rõ.

- [ ] **Step 2: Dry-run migration remote**

Discover flags:

```bash
pnpm exec supabase db push --help
```

Run dry-run flag được CLI hiện tại hỗ trợ.

Expected: chỉ hai migration B1 mới được lên kế hoạch; không có migration bất ngờ.

- [ ] **Step 3: Apply remote**

Run `supabase db push` với flags đã xác nhận từ help.

Expected: exit 0; cả schema và seed migration được ghi trong remote history.

- [ ] **Step 4: Verify remote bằng count query**

Dùng MCP `execute_sql` nếu có; nếu không, dùng CLI command được `--help` xác nhận. Kiểm tra:

```sql
select id, title, is_published, default_time_minutes
from public.exams
where source_key = 'b1-de-full-copy';

select skill, count(*)
from public.practice_activities
where source_document = 'DeFull Copy.pdf'
group by skill
order by skill;

select skill, count(*)
from public.practice_prompts
where source_document = 'DeFull Copy.pdf'
group by skill
order by skill;

select count(*) filter (where image_url is null) as missing_sign_images
from public.practice_questions
where skill = 'signs';
```

Expected: một draft exam; resource counts khớp artifact; 15 Signs thiếu ảnh; audio fields vẫn null.

- [ ] **Step 5: Verify RLS**

Thực hiện read checks với authenticated non-admin và mutation denial:

- Học viên không đọc draft exam/resource.
- Học viên không insert/update/delete content.
- Admin đọc và sửa draft content.
- Không policy nào chứa `user_metadata`.

- [ ] **Step 6: Chạy remote advisors**

Expected: không có security/performance issue mới liên quan bảng B1.

- [ ] **Step 7: Cập nhật CLAUDE.md**

Ghi:

- Bốn bảng nội dung mới và vai trò.
- `exams` là bộ điều phối.
- Source key `b1-de-full-copy`.
- Dữ liệu đang draft, Signs/audio cần admin hoàn thiện.
- Quy ước artifact → generated seed → remote migration.

- [ ] **Step 8: Final verification và commit docs**

Run:

```bash
node scripts/validate-b1-content.mjs docs/data/b1-de-full-copy.json
node --test scripts/validate-b1-content.test.mjs scripts/build-b1-seed.test.mjs
pnpm exec supabase test db supabase/tests/database/b1_exam_practice.test.sql
pnpm tsc -b
git status --short
```

Run GitNexus detect changes, review `git diff -- CLAUDE.md`, rồi:

```bash
git add CLAUDE.md
git commit -m "docs: document B1 practice content foundation"
```

Expected: remote verified, local tests pass, commits atomic, unrelated untracked files untouched.

## Subsequent Plans

Sau khi Phase 1 hoàn tất và remote được xác minh, tạo và thực thi lần lượt:

1. `B1 Writing and Speaking Versioned Practice`: draft editor, giới hạn năm bản, diff, TTS playback và admin media flow.
2. `B1 Linked Practice UI`: learner catalog/detail/session cho activity, Signs placeholder, Reading/Listening adapters.
3. `B1 Full Mock Exam Runner`: attempts, snapshot, shared timer/overtime, autosave, resume, submit và results.
4. `B1 Admin Content Completion`: section tree, Signs image upload/crop, Listening audio upload, TTS generation và publish validator.
