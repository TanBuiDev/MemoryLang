# B1 Exam Creation and Cloning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép quản trị viên tạo đề B1 có sẵn khung bốn kỹ năng, sao chép cấu trúc hoặc sao chép toàn bộ nội dung từ bất kỳ đề B1 nào, với nội dung độc lập và media dùng chung theo cơ chế copy-on-write.

**Architecture:** Thêm `exam_format` và metadata nguồn vào `exams`, sau đó đặt toàn bộ thao tác tạo/sao chép trong một RPC Supabase có transaction, RBAC và idempotency. Frontend dùng wizard trực quan gọi RPC; builder, Media và publish gate được scope bằng `exam_id` thay cho `source_key = 'b1-de-full-copy'`. Nội dung được deep-copy sang ID/source key mới, còn full clone tạo usage mới trỏ tới media asset hiện có.

**Tech Stack:** React 19, TypeScript 6, TanStack React Query, React Router 7, Tailwind CSS 4, Vitest/Testing Library, Supabase PostgreSQL 17, pgTAP, Supabase Storage/RLS/RPC.

## Global Constraints

- Spec nguồn: `docs/superpowers/specs/2026-08-01-b1-exam-creation-and-cloning-design.md`.
- Mọi đề/resource mới phải ở trạng thái bản nháp; không sao chép attempt, grading snapshot, progress, draft hoặc result.
- `structure_only` không sao chép nội dung soạn thảo, đáp án, lời giải, bài mẫu hoặc media.
- `full_content` deep-copy nội dung nhưng tạo usage mới trỏ tới cùng media asset; thay media chỉ cập nhật tài nguyên thuộc đề hiện tại.
- Mọi thao tác database đặc quyền phải dùng RBAC hiện có, không tin `user_metadata`.
- RPC `SECURITY DEFINER` phải có `set search_path = ''`, tên bảng/hàm đầy đủ schema, thu hồi quyền `PUBLIC`/`anon` và chỉ grant vai trò cần thiết.
- Mọi bảng mới trong schema exposed phải bật RLS và có grant/policy rõ ràng.
- Không dùng `window.confirm`, `window.alert`, `window.prompt`, raw `<select>` hoặc raw button cho action tiêu chuẩn.
- Dùng `Button`, `Select`, `Input`, `Label` và `ConfirmModal` hiện có; không tạo form nhập JSON/code.
- Route lazy mới phải dùng `lazyWithChunkRecovery()`; kế hoạch này không cần thêm route page lazy mới ngoài việc đổi path Media hiện có.
- Trước khi sửa bất kỳ symbol nào, chạy `gitnexus_impact({ target, direction: "upstream" })`; cảnh báo người dùng trước nếu rủi ro HIGH/CRITICAL.
- Trước mỗi commit: `git status`, `git diff` từng file, quét secrets, `gitnexus_detect_changes()`, rồi chạy `pnpm tsc -b` hoặc `pnpm build` đến exit code 0.
- Stage từng file cụ thể, dùng conventional commit tiếng Anh, không push tự động.

---

## File Map

### Database

- Create via `npx supabase migration new add_b1_exam_creation_and_cloning`: schema metadata, backfill và idempotency table trong đúng file CLI vừa in ra.
- Create via `npx supabase migration new create_blank_b1_exam_rpc`: guarded RPC và blank scaffold trong đúng file CLI vừa in ra.
- Create via `npx supabase migration new add_b1_exam_clone_modes`: structure/full clone branches và media usage mapping trong đúng file CLI vừa in ra.
- Create via `npx supabase migration new scope_b1_publish_and_media_by_exam`: thay chữ ký publish RPC, compatibility cleanup và các index/policy còn lại trong đúng file CLI vừa in ra.
- Modify: `supabase/tests/database/b1_exam_practice.test.sql` — pgTAP coverage cho blank/structure/full clone, RBAC, rollback, idempotency, publish và learner attempt.

### Domain and services

- Modify: `src/types/exam.types.ts` — `ExamFormat`, `B1InitializationMode`, clone source/result types và metadata mới trên `Exam`.
- Modify: `src/types/exam.types.test.ts` — runtime artifact/type regression fixtures.
- Modify: `src/services/supabase/adminExam.service.ts` — list nguồn B1 và gọi RPC tạo đề.
- Create: `src/services/supabase/adminExam.service.test.ts` — service contract tests.
- Modify: `src/services/supabase/adminExamContent.service.ts` — trả `exam_format` và từ chối dùng B1 builder cho legacy exam.
- Modify: `src/services/supabase/adminExamContent.service.test.ts` — builder format tests.
- Modify: `src/services/supabase/adminExamMedia.service.ts` — mọi query/mutation Media nhận `examId`.
- Modify: `src/services/supabase/adminExamMedia.service.test.ts` — exam-scoped media và publish contract.
- Modify: `src/services/supabase/examPractice.service.ts` — catalog chỉ lấy `b1_practice`.
- Modify: `src/services/supabase/examPractice.service.test.ts` — learner catalog/start regression.

### Frontend

- Create: `src/components/admin/exams/CreateExamWizard.tsx` — state machine, validation, submit và summary.
- Create: `src/components/admin/exams/CreateExamWizard.test.tsx` — component tests cho ba mode.
- Create: `src/components/admin/exams/B1SourceExamPicker.tsx` — tìm kiếm/chọn đề nguồn.
- Create: `src/components/admin/exams/B1SourceExamPicker.test.tsx` — picker tests.
- Modify: `src/pages/admin/AdminExamsPage.tsx` — mở wizard và route card bằng `exam_format`.
- Create: `src/pages/admin/AdminExamsPage.test.tsx` — integration tests cho create/navigation/card actions.
- Modify: `src/pages/admin/AdminB1ExamContentBuilderPage.tsx` — builder dùng cho mọi B1 exam và link Media theo ID.
- Modify: `src/pages/admin/AdminB1ExamContentBuilderPage.test.tsx` — generic B1 coverage.
- Modify: `src/pages/admin/AdminExamMediaPage.tsx` — đọc `:id`, scope query keys và mutation.
- Modify: `src/pages/admin/AdminExamMediaPage.test.tsx` — route/media isolation tests.
- Modify: `src/app/routes.tsx` — `/app/admin/exams/:id/media`.
- Modify: `src/pages/exams/ExamHubPage.test.tsx` — đề B1 mới xuất hiện và khởi chạy.

### Documentation and deployment

- Modify: `CLAUDE.md` — ghi kiến trúc nhiều đề B1, clone modes, exam-scoped Media/publish và migration mới sau khi triển khai thành công.

---

### Task 1: Add B1 exam metadata, idempotency storage, and domain types

**Files:**
- Create: migration generated by `npx supabase migration new add_b1_exam_creation_and_cloning`
- Modify: `supabase/tests/database/b1_exam_practice.test.sql`
- Modify: `src/types/exam.types.ts`
- Modify: `src/types/exam.types.test.ts`

**Interfaces:**
- Produces: `ExamFormat = 'legacy' | 'b1_practice'`.
- Produces: `B1InitializationMode = 'blank' | 'structure_only' | 'full_content'`.
- Produces: `exams.exam_format`, `exams.cloned_from_exam_id`, `exams.clone_mode`.
- Produces: private `b1_exam_creation_requests(requested_by, request_id, exam_id, created_at)`.

- [ ] **Step 1: Run impact analysis for the `Exam` interface and inspect the blast radius**

Run GitNexus impact on `Exam` in `src/types/exam.types.ts`, report direct consumers/processes, and stop for confirmation if risk is HIGH or CRITICAL.

- [ ] **Step 2: Create the migration through Supabase CLI**

Run:

```powershell
npx supabase migration new add_b1_exam_creation_and_cloning
```

Use only the path printed by the CLI. Do not invent a timestamp.

- [ ] **Step 3: Write failing pgTAP assertions for schema and backfill**

Add assertions that prove:

```sql
select has_column('public', 'exams', 'exam_format');
select has_column('public', 'exams', 'cloned_from_exam_id');
select has_column('public', 'exams', 'clone_mode');
select is(
  (select exam_format from public.exams where source_key = 'b1-de-full-copy'),
  'b1_practice',
  'seeded B1 exam is backfilled'
);
```

Also assert the idempotency table has RLS enabled and no direct `authenticated` insert/update/delete grants.

- [ ] **Step 4: Run the database test and verify RED**

Run the repository's local database test command discovered with `npx supabase test db --help`, targeting `b1_exam_practice.test.sql` when supported. Expected: missing columns/table assertions fail.

- [ ] **Step 5: Add schema, constraints, indexes, and policies**

Implement:

```sql
alter table public.exams
  add column exam_format text not null default 'legacy',
  add column cloned_from_exam_id uuid references public.exams(id) on delete set null,
  add column clone_mode text;

alter table public.exams
  add constraint exams_exam_format_check
    check (exam_format in ('legacy', 'b1_practice')),
  add constraint exams_clone_mode_check
    check (clone_mode is null or clone_mode in ('structure_only', 'full_content'));

create index exams_b1_clone_sources_idx
  on public.exams (updated_at desc)
  where exam_format = 'b1_practice' and deleted_at is null;

update public.exams
set exam_format = 'b1_practice'
where source_key = 'b1-de-full-copy';
```

Create `public.b1_exam_creation_requests` with a composite primary/unique key on `(requested_by, request_id)`, `exam_id` FK, RLS enabled, authenticated read restricted to `requested_by = auth.uid()`, and no direct browser write grants. Preserve RPC-owned writes.

- [ ] **Step 6: Add TypeScript domain types**

Add:

```ts
export type ExamFormat = 'legacy' | 'b1_practice'
export type B1InitializationMode = 'blank' | 'structure_only' | 'full_content'

export interface B1ExamCloneSource {
  id: string
  title: string
  is_published: boolean
  section_count: number
  updated_at: string
}
```

Extend `Exam` with required `exam_format` and nullable clone metadata. Update fixtures so legacy and B1 values are explicit.

- [ ] **Step 7: Run tests and type-check GREEN**

Run the targeted pgTAP file, `pnpm vitest run src/types/exam.types.test.ts`, and `pnpm tsc -b`. Expected: exit 0.

- [ ] **Step 8: Verify and commit**

Run GitNexus change detection, inspect diffs, then stage only the generated migration, database test and two type files.

```powershell
git commit -m "feat: add B1 exam creation metadata"
```

---

### Task 2: Implement atomic blank B1 exam creation

**Files:**
- Create: migration generated by `npx supabase migration new create_blank_b1_exam_rpc`
- Modify: `supabase/tests/database/b1_exam_practice.test.sql`

**Interfaces:**
- Consumes: schema/types from Task 1.
- Produces: `public.create_b1_exam(uuid,text,text,text,integer,text,uuid) returns uuid`.

- [ ] **Step 1: Impact-check permission helpers used by the RPC**

Run GitNexus context/impact for `security.has_permission` and review current RPC authorization patterns before editing SQL.

- [ ] **Step 2: Add failing pgTAP cases for blank creation**

Test an authorized call with `p_initialization_mode = 'blank'` and assert:

- One unpublished `b1_practice` exam with `cefr_level = 'B1'`.
- Four required sections ordered Reading, Listening, Writing, Speaking.
- Reading/Listening resources are compatible draft activities.
- Writing/Speaking resources are draft prompts using `long_form_prompt` and `speaking_script_prompt`.
- All source keys are non-blank and unique.
- No media usages or prompt samples are created.
- A repeated `(auth.uid(), request_id)` returns the same exam ID and row count remains one.

- [ ] **Step 3: Run pgTAP RED**

Expected: function-not-found failures.

- [ ] **Step 4: Create the blank-creation migration through Supabase CLI**

```powershell
npx supabase migration new create_blank_b1_exam_rpc
```

Use only the file path printed by the CLI.

- [ ] **Step 5: Add SQL helper functions with private execution**

Create internal helpers for unique source keys and starter resource payloads. Revoke execution from `PUBLIC`, `anon`, and `authenticated`; only `create_b1_exam` calls them. Generate keys from the new exam/request context plus `gen_random_uuid()` rather than titles.

- [ ] **Step 6: Implement the guarded RPC**

Validate:

```sql
if auth.uid() is null or not security.has_permission('exam.create') then
  raise exception using errcode = '42501', message = 'B1_CREATE_FORBIDDEN';
end if;
if btrim(coalesce(p_title, '')) = '' then
  raise exception using errcode = '22023', message = 'B1_TITLE_REQUIRED';
end if;
if p_default_time_minutes not between 1 and 480 then
  raise exception using errcode = '22023', message = 'B1_DURATION_INVALID';
end if;
```

For `blank`, reject non-null `p_source_exam_id`. Insert the exam, four sections and compatible resources in the same function transaction. Insert the idempotency record before returning the new UUID. Set `created_by = auth.uid()` where supported.

- [ ] **Step 7: Lock down function ACLs**

```sql
revoke all on function public.create_b1_exam(uuid,text,text,text,integer,text,uuid)
  from public, anon;
grant execute on function public.create_b1_exam(uuid,text,text,text,integer,text,uuid)
  to authenticated;
```

- [ ] **Step 8: Run pgTAP, advisors, and type-check**

Run the targeted database test, the available Supabase database advisors command discovered via `--help`, and `pnpm tsc -b`. Expected: exit 0 and no new security advisor finding.

- [ ] **Step 9: Verify and commit**

```powershell
git commit -m "feat: create scaffolded B1 exams atomically"
```

---

### Task 3: Add structure-only and full-content cloning

**Files:**
- Create: migration generated by `npx supabase migration new add_b1_exam_clone_modes`
- Modify: `supabase/tests/database/b1_exam_practice.test.sql`

**Interfaces:**
- Extends: `create_b1_exam(..., p_initialization_mode, p_source_exam_id)`.
- Guarantees: cloned resource/question/sample IDs and source keys are new; media asset IDs are shared only through new usage rows.

- [ ] **Step 1: Write failing structure-only clone tests**

Create a source fixture containing choice, matching, ordering, Writing and Speaking presentations. Assert that the clone preserves section order/title/skill/required/time plus presentation/grading mode, creates valid empty configs/starter questions, and contains no authored prompt, answer, explanation, sample, URL or media usage.

- [ ] **Step 2: Write failing full clone and isolation tests**

Assert full clone copies all activity/prompt/question fields used by attempt/result renderers, including `content_blocks`, `presentation_config`, `review_config`, question `metadata`, translations/explanations and prompt samples. Assert IDs/source keys differ, publication flags are false, and attempt/draft/result tables receive zero new rows.

- [ ] **Step 3: Write failing media copy-on-write tests**

Attach one audio and one question image asset to the source. Assert the clone gets distinct usage rows pointing to the same asset IDs. Update the clone usage/resource URL and prove the source usage/resource URL remains unchanged.

- [ ] **Step 4: Run pgTAP RED**

Expected: clone branches or copied records are missing.

- [ ] **Step 5: Create the clone-mode migration through Supabase CLI**

```powershell
npx supabase migration new add_b1_exam_clone_modes
```

Use `create or replace function` with the exact Task 2 signature and preserve its blank branch.

- [ ] **Step 6: Implement source validation and consistent snapshot reads**

For clone modes, require `exam.read`, select one non-deleted `b1_practice` source, and reject absent/wrong-format sources with `B1_SOURCE_UNAVAILABLE`. Use transaction-local snapshot semantics and only the minimum row locks needed to prevent administrative source mutation during the copy; learner reads must remain unblocked.

- [ ] **Step 7: Implement structure-only cloning**

Map each source section to a new resource ID and source key. Copy structural fields only. Use the same presentation registry defaults as the frontend builder: objective resource for objective presentations, prompt resource for Writing/Speaking, starter question except matching/ordering, and empty typed configuration for matching/ordering.

- [ ] **Step 8: Implement full-content cloning**

Use explicit column lists for every `insert ... select`; never use `select *`. Maintain temporary old→new ID maps for activities, prompts and questions so sections, samples and usages point to cloned rows. Copy authored fields, force publication false, set the new access tier/creator, and regenerate all source keys.

- [ ] **Step 9: Copy media usage references without copying assets**

For resource and question usage rows, insert new usage rows with the mapped cloned resource IDs and original `asset_id`. Keep cloned `audio_url`/`image_url` equal to the referenced asset URL. Do not create rows in `exam_media_assets`.

- [ ] **Step 10: Run pgTAP and advisors GREEN**

Expected: all clone, independence, media and rollback tests pass with no advisor regression.

- [ ] **Step 11: Verify and commit**

```powershell
git commit -m "feat: clone B1 exam structure and content"
```

---

### Task 4: Generalize publication and learner eligibility by exam ID

**Files:**
- Create: migration generated by `npx supabase migration new scope_b1_publish_and_media_by_exam`
- Modify: `supabase/tests/database/b1_exam_practice.test.sql`
- Modify: `src/services/supabase/examPractice.service.ts`
- Modify: `src/services/supabase/examPractice.service.test.ts`

**Interfaces:**
- Produces: `set_b1_exam_published_guarded(p_exam_id uuid, p_is_published boolean)`.
- Produces: learner catalog filter `exam_format = 'b1_practice'`.

- [ ] **Step 1: Impact-check `set_b1_exam_published_guarded`, `start_b1_exam_attempt`, and `listAvailableExams`**

Report direct callers and affected learner/admin processes before changing contracts.

- [ ] **Step 2: Create the second migration via CLI**

```powershell
npx supabase migration new scope_b1_publish_and_media_by_exam
```

- [ ] **Step 3: Add failing database tests for exam-scoped publication**

Create two B1 exams with different readiness. Publishing the ready ID must not publish or inspect the incomplete ID. A legacy ID, deleted ID, or caller without `exam.publish` must fail. Unpublishing must affect only the requested exam.

- [ ] **Step 4: Replace the singleton RPC signature**

Drop the exact old boolean signature after verifying no database caller remains, then create the UUID-scoped signature. Replace `public.is_admin()` with authoritative `security.has_permission('exam.publish')`, validate `exam_format`, and keep every readiness subquery constrained by `p_exam_id`.

- [ ] **Step 5: Add attempt eligibility assertions**

Extend `start_b1_exam_attempt` tests so a published ready clone starts successfully, while a published legacy exam is rejected even if `cefr_level = 'B1'`. Preserve immutable learner/grading snapshots.

- [ ] **Step 6: Filter the learner catalog by format**

Add `.eq('exam_format', 'b1_practice')` to `listAvailableExams()` and update its service test to assert the filter chain.

- [ ] **Step 7: Run database/service tests and type-check**

Run pgTAP, `pnpm vitest run src/services/supabase/examPractice.service.test.ts`, and `pnpm tsc -b`.

- [ ] **Step 8: Verify and commit**

```powershell
git commit -m "feat: scope B1 publication by exam"
```

---

### Task 5: Add typed admin creation service and source discovery

**Files:**
- Modify: `src/services/supabase/adminExam.service.ts`
- Create: `src/services/supabase/adminExam.service.test.ts`

**Interfaces:**
- Produces: `listB1CloneSources(search?: string): Promise<B1ExamCloneSource[]>`.
- Produces: `createB1Exam(input: CreateB1ExamInput): Promise<string>`.

- [ ] **Step 1: Impact-check `adminExamService`**

Review all callers before extending its public contract.

- [ ] **Step 2: Write failing source-list tests**

Mock Supabase and assert the query filters `exam_format = 'b1_practice'`, `deleted_at is null`, orders by `updated_at`, requests an exact section count without fetching all section rows, and applies escaped title search only when search text is non-empty.

- [ ] **Step 3: Write failing create-RPC tests**

Assert exact payload:

```ts
{
  p_request_id: input.requestId,
  p_title: input.title.trim(),
  p_description: input.description.trim() || null,
  p_access_tier: input.accessTier,
  p_default_time_minutes: input.defaultTimeMinutes,
  p_initialization_mode: input.initializationMode,
  p_source_exam_id: input.sourceExamId,
}
```

Also test stable mappings for `B1_CREATE_FORBIDDEN`, `B1_SOURCE_UNAVAILABLE`, `B1_TITLE_REQUIRED`, and `B1_DURATION_INVALID`.

- [ ] **Step 4: Implement typed inputs and service methods**

Use `crypto.randomUUID()` in the wizard, not inside retry logic, so retries retain one request ID. Return only the RPC's UUID. Do not add a client-side multi-insert fallback.

- [ ] **Step 5: Run service tests and type-check**

```powershell
pnpm vitest run src/services/supabase/adminExam.service.test.ts
pnpm tsc -b
```

- [ ] **Step 6: Verify and commit**

```powershell
git commit -m "feat: add B1 exam creation service"
```

---

### Task 6: Build the visual creation wizard

**Files:**
- Create: `src/components/admin/exams/CreateExamWizard.tsx`
- Create: `src/components/admin/exams/CreateExamWizard.test.tsx`
- Create: `src/components/admin/exams/B1SourceExamPicker.tsx`
- Create: `src/components/admin/exams/B1SourceExamPicker.test.tsx`

**Interfaces:**
- Consumes: `adminExamService.listB1CloneSources` and `adminExamService.createB1Exam`.
- Produces: `<CreateExamWizard open onClose onCreated />` where `onCreated(examId, examFormat)` drives navigation/refresh.

- [ ] **Step 1: Impact-check shared UI components and inspect existing modal patterns**

Check `ConfirmModal`, `Button`, `Input`, and packaged `Select`; do not modify them unless an impact report and separate justification are recorded.

- [ ] **Step 2: Write failing wizard flow tests**

Cover:

- Format choice routes legacy users to the existing fields/creation behavior.
- B1 details default to CEFR B1, GENERAL, free and 120 minutes.
- Source picker is absent for blank and required for both clone modes.
- Summary explains structure-only versus independent full content/shared media.
- Invalid title/duration prevents submit with Vietnamese feedback.
- Pending submission disables confirm.
- Failure retains form state and request ID.
- Success calls `onCreated` once.

- [ ] **Step 3: Write failing picker tests**

Debounce server-side title search by 250 ms and use fake timers in the test. Assert loading, empty, error and selected states; each result shows title, publication state, section count and updated date.

- [ ] **Step 4: Implement a reducer/state machine**

Use explicit steps and discriminated values:

```ts
type WizardStep = 'format' | 'details' | 'initialization' | 'source' | 'summary'
type WizardFormat = 'legacy' | 'b1_practice'
```

Generate `requestId` once when a B1 wizard session opens; reset only after success or explicit close.

- [ ] **Step 5: Implement visual controls and confirmation**

Use shared form components, `Button` variants and `ConfirmModal`. Do not render raw `<select>`, native dialogs or JSON inputs. Explain shared-media behavior in non-technical Vietnamese.

- [ ] **Step 6: Run component tests and accessibility assertions**

```powershell
pnpm vitest run src/components/admin/exams/CreateExamWizard.test.tsx src/components/admin/exams/B1SourceExamPicker.test.tsx
pnpm tsc -b
```

- [ ] **Step 7: Verify and commit**

```powershell
git commit -m "feat: add B1 exam creation wizard"
```

---

### Task 7: Integrate the wizard and route every B1 exam to the reusable builder

**Files:**
- Modify: `src/pages/admin/AdminExamsPage.tsx`
- Create: `src/pages/admin/AdminExamsPage.test.tsx`
- Modify: `src/services/supabase/adminExamContent.service.ts`
- Modify: `src/services/supabase/adminExamContent.service.test.ts`
- Modify: `src/pages/admin/AdminB1ExamContentBuilderPage.tsx`
- Modify: `src/pages/admin/AdminB1ExamContentBuilderPage.test.tsx`

**Interfaces:**
- Consumes: wizard from Task 6 and `Exam.exam_format` from Task 1.
- Guarantees: only B1 format opens content builder; seeded source key is no longer a routing discriminator.

- [ ] **Step 1: Impact-check `AdminExamsPage`, `getExamContent`, and `AdminB1ExamContentBuilderPage`**

Report affected admin flows and direct test coverage.

- [ ] **Step 2: Write failing page integration tests**

Assert the Create action opens the wizard; successful B1 creation refreshes the list and navigates to `/content`; B1 cards show **Quản lý nội dung B1** and exam-scoped Media; legacy cards show **Xây dựng Đề**.

- [ ] **Step 3: Replace the inline create modal**

Remove its local title/category/create state only after searching the entire file for every reference. Preserve the edit modal. Mount `CreateExamWizard` and invalidate/refetch the exam list on success.

- [ ] **Step 4: Route cards by `exam_format`**

Replace all three seeded-source comparisons with `exam.exam_format === 'b1_practice'`. Media links target `/app/admin/exams/${exam.id}/media`.

- [ ] **Step 5: Guard the B1 content service by format**

Select `exam_format` in `getExamContent`. Throw a stable error if a legacy exam is opened through `/content`. Extend `AdminExamContentExam` accordingly.

- [ ] **Step 6: Generalize builder copy and links**

Remove wording that implies a singleton seeded exam. Link Media with the current route `id`; keep query keys scoped by `id`.

- [ ] **Step 7: Run targeted tests and type-check**

Run all three updated test suites and `pnpm tsc -b`.

- [ ] **Step 8: Verify and commit**

```powershell
git commit -m "feat: route B1 exams through reusable builder"
```

---

### Task 8: Scope media management and replacement to one exam

**Files:**
- Modify: `src/app/routes.tsx`
- Modify: `src/services/supabase/adminExamMedia.service.ts`
- Modify: `src/services/supabase/adminExamMedia.service.test.ts`
- Modify: `src/pages/admin/AdminExamMediaPage.tsx`
- Modify: `src/pages/admin/AdminExamMediaPage.test.tsx`

**Interfaces:**
- Produces: `listResources(examId)`, `listSigns(examId)`, `listQuestionReviews(examId)`, `setExamPublished(examId, isPublished)`.
- Guarantees: upload/attach/replace actions mutate only resources reachable from `exam_sections.exam_id = examId`.

- [ ] **Step 1: Impact-check all modified Media service methods**

Pay special attention to shared asset deletion and usage replacement callers.

- [ ] **Step 2: Write failing service tests for exam scoping**

Assert each list method first resolves section resource IDs from the supplied exam ID, then limits activity/prompt/question queries to those IDs. Assert publication calls:

```ts
supabase.rpc('set_b1_exam_published_guarded', {
  p_exam_id: examId,
  p_is_published: true,
})
```

Add a test proving replacement deletes/repoints only the target resource usage while another usage of the same asset remains.

- [ ] **Step 3: Change the route and page query keys**

Replace `/app/admin/exam-media` with `/app/admin/exams/:id/media`. Read `id` through `useParams`, handle missing IDs accessibly, and use keys such as `['admin-b1-media', id]`.

- [ ] **Step 4: Scope all Media service queries**

Remove `.eq('source_key', 'b1-de-full-copy')` and `.eq('activity.source_key', 'signs')` as ownership selectors. Resolve resources through `exam_sections` for the provided exam. A section skill/presentation may identify sign UI only after ownership is established.

- [ ] **Step 5: Preserve copy-on-write replacement**

When replacing a shared asset, create the new version/asset as today, remove/update only the selected resource's usage, and synchronize only that resource URL. Keep deletion disabled while aggregate `usage_count > 0`.

- [ ] **Step 6: Update page tests**

Render under a memory route containing `:id`; assert service calls receive the ID and navigation back returns to that exam's B1 builder.

- [ ] **Step 7: Run Media tests, route tests, and type-check**

```powershell
pnpm vitest run src/services/supabase/adminExamMedia.service.test.ts src/pages/admin/AdminExamMediaPage.test.tsx src/pages/admin/AdminB1ExamContentBuilderPage.test.tsx
pnpm tsc -b
```

- [ ] **Step 8: Verify and commit**

```powershell
git commit -m "feat: scope B1 media management by exam"
```

---

### Task 9: Verify learner flows for newly created B1 exams

**Files:**
- Modify: `src/pages/exams/ExamHubPage.test.tsx`
- Modify: `supabase/tests/database/b1_exam_practice.test.sql`

**Interfaces:**
- Consumes: generalized catalog/start/publish contracts.
- Guarantees: no learner behavior depends on `b1-de-full-copy`.

- [ ] **Step 1: Search for remaining singleton assumptions**

Run:

```powershell
rg -n "b1-de-full-copy|/app/admin/exam-media|set_b1_exam_published_guarded" src supabase/tests supabase/migrations
```

Only immutable historical migrations, seed-specific fixtures and explicit compatibility tests may retain the source key.

- [ ] **Step 2: Add learner catalog/start tests with a cloned exam**

Use a published `b1_practice` exam whose source key is not `b1-de-full-copy`. Assert it appears, starts through its ID and navigates to the returned attempt.

- [ ] **Step 3: Add database end-to-end clone attempt test**

Create a full clone through the RPC, complete its required readiness data, publish by ID, start an attempt, save progress and submit. Assert the attempt/grading snapshots reference cloned resource keys and the source exam remains unchanged.

- [ ] **Step 4: Run learner and database suites**

```powershell
pnpm vitest run src/pages/exams/ExamHubPage.test.tsx src/pages/exams/ExamAttemptPage.test.tsx src/pages/exams/ExamResultPage.test.tsx src/services/supabase/examPractice.service.test.ts
pnpm tsc -b
```

Run the targeted pgTAP database test separately. Expected: exit 0.

- [ ] **Step 5: Verify and commit**

```powershell
git commit -m "test: cover cloned B1 learner flows"
```

---

### Task 10: Complete full verification, documentation, and deployment gate

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Produces: verified local implementation and an explicit remote migration/smoke checklist.

- [ ] **Step 1: Update project documentation**

Document `exam_format`, all three initialization modes, independent clone/shared-media semantics, `/app/admin/exams/:id/media`, exam-scoped publish RPC, and the exact generated migration filenames. Do not duplicate unrelated AGENTS rules.

- [ ] **Step 2: Run the full frontend and script test suite**

```powershell
pnpm test
pnpm lint
pnpm build
```

Expected: all commands exit 0. Fix failures before continuing; do not commit with a running or failed build.

- [ ] **Step 3: Run all local database tests and advisors**

Discover exact supported flags through `npx supabase test db --help`, run the complete database suite, then run the available advisors command. Expected: all pgTAP tests pass and no new security/performance finding is introduced.

- [ ] **Step 4: Verify migration dry-run through the repository gate**

Run the linked Supabase dry-run command discovered via `npx supabase db push --help`, capture its complete output, and pipe it through `scripts/check-supabase-migration-dry-run.mjs` with exactly the four CLI-generated filenames from Tasks 1–4. Do not apply remote migrations unless the gate passes.

- [ ] **Step 5: Apply remote migrations in order and verify catalog metadata**

After the dry-run passes, apply migrations to project `brwvbpkgimhamivmaflu`. Verify the seeded exam is `b1_practice`, existing unrelated exams remain `legacy`, function ACLs are correct, RLS is enabled, and no direct write grant exists on the idempotency table.

- [ ] **Step 6: Run authenticated admin smoke tests**

Verify:

1. Blank creates four starter skills.
2. Structure clone has no authored content/media.
3. Full clone contains independent content and shared media usages.
4. Editing clone content does not modify source.
5. Replacing clone media does not modify source.
6. Publication is scoped to the selected exam.

- [ ] **Step 7: Run authenticated learner smoke tests**

Publish a completed clone, confirm it appears in `/app/exams`, start it, autosave objective and Writing/Speaking work, submit, and review results. Confirm source and prior attempt snapshots are unchanged.

- [ ] **Step 8: Run final GitNexus and repository review**

Run `gitnexus_detect_changes()` across all uncommitted work, inspect every changed file with `git diff`, scan for secrets, then rerun `pnpm build` if any file changed after Step 2.

- [ ] **Step 9: Commit documentation only**

Stage only `CLAUDE.md` for the documentation commit. Task tracking state remains orchestration metadata and is not committed back into this plan.

```powershell
git commit -m "docs: document B1 exam cloning workflow"
```

- [ ] **Step 10: Report completion without pushing**

Report every commit hash/message/file group, local and remote verification results, migration filenames, smoke-test evidence, and any residual limitation. Do not push automatically.

---

## Plan Self-Review Result

- **Spec coverage:** Blank scaffold, arbitrary B1 source selection, structure-only clone, full deep clone, shared media/copy-on-write, RBAC, idempotency, generic builder, exam-scoped Media/publish, learner flow and deployment are each mapped to a task.
- **Boundary check:** Database creation/cloning, publish/learner eligibility, service contracts, wizard UI, builder routing, Media isolation and rollout can be reviewed and committed independently.
- **Type consistency:** `ExamFormat`, `B1InitializationMode`, `B1ExamCloneSource`, `CreateB1ExamInput`, the create RPC payload and the UUID-scoped publish RPC use the same names across tasks.
- **Safety check:** The plan never copies learner records, never mutates source content during cloning, never duplicates physical media assets, and never deploys before the project dry-run gate passes.
