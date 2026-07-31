# B1 Exam Creation and Cloning Design

## Summary

MemoryLang will let administrators create reusable B1 practice exams from the exam library instead of treating the seeded `B1 Full Practice Test` as the only B1-compatible exam. An administrator can create a scaffolded B1 draft, copy the structure of any existing B1 exam, or copy all editable content from any existing B1 exam.

Copied content is independent after creation. Media assets are initially shared through asset references, but replacing media in a copied exam changes only that exam's resource usage. Every newly created exam and resource starts as a draft.

## Goals

- Let administrators create a B1 practice exam from the existing exam-management page.
- Support a scaffolded blank B1 exam with one starter section for Reading, Listening, Writing, and Speaking.
- Support structure-only cloning from any readable B1 practice exam.
- Support full-content cloning from any readable B1 practice exam.
- Keep cloned questions, answers, explanations, presentation configuration, and prompt samples independently editable.
- Reuse existing media assets safely without coupling later media replacement between exams.
- Remove runtime identification of B1 exams through the seeded `source_key = 'b1-de-full-copy'` special case.
- Make creation atomic, authorized, idempotent, and testable.

## Non-goals

- Cloning learner attempts, answers, section progress, drafts, grades, or result snapshots.
- Introducing background jobs for exam creation.
- Supporting nested parts inside an exam section.
- Automatically publishing newly created exams or their resources.
- Copying physical media files when an existing asset can be referenced safely.
- Redesigning the legacy TOEIC/IELTS exam builder.

## Terminology

- **B1 practice exam:** An exam using the reusable `exam_sections`, `practice_activities`, `practice_questions`, and `practice_prompts` architecture.
- **Blank:** A new B1 exam with four starter sections and no authored assessment content.
- **Structure-only clone:** A new B1 exam that copies section organization and presentation metadata but not authored questions, answers, explanations, samples, or media.
- **Full-content clone:** A new B1 exam that deep-copies editable content while sharing the referenced media assets.
- **Shared media:** Two resources have distinct usage rows that reference the same immutable media asset. Replacing one resource's media changes only that resource's usage.

## Product Flow

The existing **Tạo Đề thi mới** action opens a visual wizard.

### Step 1: Exam format

The administrator chooses:

- `B1 Practice`
- `Đề thi truyền thống`

The traditional choice preserves the current legacy creation behavior. The remainder of this specification concerns `B1 Practice`.

### Step 2: Exam information

The B1 form collects:

- Required title.
- Optional description.
- Default duration in minutes.
- Access tier: `free` or `pro`.

The CEFR level is fixed to `B1` for this flow. The category defaults to `GENERAL`. The exam is always created unpublished.

### Step 3: Initialization mode

The administrator chooses exactly one mode:

- `Tạo đề B1 trống` (`blank`).
- `Chỉ sao chép cấu trúc` (`structure_only`).
- `Sao chép toàn bộ nội dung` (`full_content`).

For either clone mode, a searchable source picker lists every non-deleted B1 practice exam the administrator may read. Each result shows its title, publication state, section count, and last-updated time.

### Step 4: Confirmation

The confirmation screen summarizes the new exam and explicitly describes the selected copy behavior. Full-content cloning states that editable content will be independent while existing media is initially shared.

The submit action is disabled while creation is in progress. A client-generated request ID makes retries idempotent.

On success, the app navigates to `/app/admin/exams/:id/content`. On failure, no partial exam remains and the wizard retains the administrator's entries.

## Data Model

### `exams`

Add these columns:

```sql
exam_format text not null default 'legacy'
  check (exam_format in ('legacy', 'b1_practice')),
cloned_from_exam_id uuid null references public.exams(id) on delete set null,
clone_mode text null
  check (clone_mode in ('structure_only', 'full_content'))
```

The seeded B1 exam is backfilled to `exam_format = 'b1_practice'`. Existing exams remain `legacy` unless they already use the reusable B1 section architecture and are explicitly included in the migration backfill.

`cloned_from_exam_id` is audit lineage only. A clone never reads through its source at runtime. `clone_mode` is null for blank and independently created exams.

Add an index on `exams(exam_format, deleted_at)` to support the B1 source picker. The migration must retain the existing uniqueness and lifecycle behavior of `source_key`.

### Idempotency

Add an admin operation table or equivalent durable record with a unique `(requested_by, request_id)` key. It stores the completed `exam_id` so an identical retry returns the same result. The record must be written in the same transaction as the exam.

The implementation plan must choose a focused name consistent with existing administrative audit conventions. It must not rely on an in-memory or browser-only deduplication mechanism.

## Backend Contract

Expose one guarded database RPC:

```sql
create_b1_exam(
  p_request_id uuid,
  p_title text,
  p_description text,
  p_access_tier text,
  p_default_time_minutes integer,
  p_initialization_mode text,
  p_source_exam_id uuid default null
) returns uuid
```

Allowed initialization modes are `blank`, `structure_only`, and `full_content`.

The RPC:

1. Requires an authenticated user with `exam.create`.
2. Requires `exam.read` when a source exam is supplied.
3. Validates the title, duration, access tier, mode, and source/mode combination.
4. Verifies that the source exists, is not deleted, and has `exam_format = 'b1_practice'`.
5. Returns the prior result for a repeated request ID owned by the same administrator.
6. Creates all rows in one database transaction.
7. Returns only the newly created exam ID.

If implemented as `SECURITY DEFINER`, the function must use an empty fixed `search_path`, fully qualified object names, explicit internal permission checks, revoked `PUBLIC` execution, and an explicit grant only to the intended authenticated role. The migration must preserve the project's server-enforced RBAC model rather than trusting client state or user-editable JWT metadata.

## Initialization Rules

### Blank B1 exam

The database creates four required starter sections in this order:

1. Reading
2. Listening
3. Writing
4. Speaking

Each section receives a new source key and a compatible draft resource. Reading and Listening use a supported starter objective presentation. Writing uses `long_form_prompt`; Speaking uses `speaking_script_prompt`. Objective starter resources may contain the minimum empty starter question required by the current builder contract. No authored answers, explanations, prompt samples, or media usages are created.

Administrators can rename, reorder, change the presentation, add sections, or remove sections before publication.

### Structure-only clone

Copy:

- Section order, title, skill, required state, and suggested time.
- Resource kind.
- `presentation_type` and `grading_mode`.
- Structural presentation configuration needed to render the selected presentation.

Do not copy:

- Authored passage or prompt content.
- Questions or their authored text.
- Options, accepted answers, translations, explanations, or correctness.
- Prompt samples.
- Audio URLs, image URLs, media assets, or media usages.
- Publication state.

Create a compatible empty resource for every section. When the builder contract requires an initial question, create one empty starter question. For configuration-only presentations such as matching or ordering, create an empty validated configuration rather than inventing authored pairs/items.

### Full-content clone

Deep-copy into new IDs:

- Exam sections.
- Practice activities and prompts.
- Practice questions.
- Passages, prompts, options, accepted answers, translations, explanations, and presentation configuration.
- Writing and Speaking prompt samples.
- Relevant resource metadata required by attempt and result renderers.

Do not copy learner-owned or historical data, including exam attempts, grading snapshots, section attempts, practice draft versions, answers, elapsed time, or result snapshots.

All copied exam, activity, and prompt publication flags are false. Every copied `source_key` is regenerated and unique. The new rows do not retain runtime dependencies on source content.

## Media Semantics

Full-content cloning creates new `exam_media_asset_usages` rows for cloned resources/questions that point to the same `exam_media_assets` rows used by the source. Resource URL fields remain consistent with those usages.

Media replacement follows copy-on-write behavior:

1. Upload or select a replacement asset.
2. Create a new version/asset when the existing media-management rules require one.
3. Update only the URL and usage belonging to the resource or question in the current exam.
4. Leave source-exam and other clone usages unchanged.

An asset cannot be deleted while any usage row references it. The UI displays the usage count when deletion is blocked.

The media administration route becomes `/app/admin/exams/:id/media`. Every resource, sign, review, upload, replacement, publish, and readiness query is scoped by `exam_id`; no operation may select the seeded B1 exam by a fixed source key.

## Builder and Routing

Routing decisions use `exam.exam_format`:

- `b1_practice` opens `/app/admin/exams/:id/content` and exposes the exam-scoped Media action.
- `legacy` opens `/app/admin/exams/:id/builder`.

The B1 content builder remains reusable for every B1 practice exam. It must not display labels or invoke services that imply only the seeded B1 exam is supported.

The learner catalog and attempt flow continue to use `exam_id`. Any guarded start, submit, abandon, progress, or publish routines that currently assume `b1-de-full-copy` must be generalized to the selected B1 exam while preserving immutable attempt/grading snapshots.

## Publication

Publishing remains a server-guarded operation. Replace the singleton B1 publication contract with an exam-scoped contract such as:

```sql
set_b1_exam_published_guarded(
  p_exam_id uuid,
  p_is_published boolean
) returns void
```

The RPC verifies `exam.publish`, confirms that the target is a non-deleted B1 practice exam, and evaluates readiness only for that exam's required sections and resources. A newly created exam cannot be published until all content, answer, translation, explanation, media, and prompt-sample requirements for its presentations are satisfied.

## Frontend Components

Keep `AdminExamsPage` focused on catalog orchestration. Extract the wizard into small components:

- `CreateExamWizard`: owns steps, validation, submission, and retained form state.
- `ExamFormatStep`: selects B1 or legacy.
- `B1ExamDetailsStep`: edits title, description, duration, and tier with visual controls.
- `B1InitializationStep`: selects blank, structure-only, or full-content behavior.
- `B1SourceExamPicker`: searches eligible B1 exams and presents source metadata.
- `B1CreationSummary`: explains exactly what will and will not be copied.

All visible actions use the shared `Button`. Selection uses the project's packaged `Select`; confirmation uses `ConfirmModal`. No browser-native dialog, raw HTML select, or developer-oriented JSON input is introduced.

The frontend service exposes typed methods for listing B1 clone sources and invoking `create_b1_exam`. Database errors are mapped to stable Vietnamese user messages while retaining diagnostic detail in development logs.

## Error and Concurrency Handling

- Validation failures leave the wizard open with field-level feedback.
- If the source is deleted or becomes unreadable, the RPC returns a stable source-unavailable error and the UI asks for another source.
- A repeated request ID returns the already-created exam rather than creating a duplicate.
- Any failed row copy rolls back the exam and idempotency record.
- The source rows are read from one transaction snapshot. The RPC uses the least disruptive locking strategy that prevents an inconsistent clone without blocking normal learner reads.
- Replacing shared media updates only the selected target usage.
- Publication rechecks readiness on the server even when the client reports ready.

## Authorization and RLS

- B1 creation requires `exam.create`.
- Source discovery and cloning require `exam.read`.
- Content mutation continues to use `exam.update` and question-specific permissions where applicable.
- Publication requires `exam.publish`.
- Media mutation requires the existing exam/media update permission model.
- Policies and RPC checks use authoritative RBAC functions, never `user_metadata`.
- New exposed tables have RLS enabled and explicit grants/policies. An idempotency table should not be directly writable by the browser when the RPC can own all writes.

## Testing Strategy

### Database tests

- Blank creation produces one draft B1 exam and four ordered starter sections.
- Structure-only cloning copies presentation structure without authored content or media.
- Full cloning copies all supported editable content and prompt samples to new IDs.
- Full cloning shares media asset IDs through distinct usage rows.
- Replacing clone media leaves source URLs and usages unchanged.
- Editing or deleting cloned questions does not change source questions.
- No attempt, draft, grading, or result rows are cloned.
- New source keys are unique.
- A repeated request ID returns one exam.
- Invalid input, missing source, wrong format, and unauthorized callers fail without partial rows.
- Publish readiness and guarded publication are scoped to the requested exam.

### Frontend unit and component tests

- Wizard exposes the correct steps for B1 and legacy formats.
- Source selection appears only for clone modes.
- Search results include only eligible B1 sources.
- Summary copy matches the selected initialization mode.
- Submission is disabled while pending and retains input after failure.
- Successful B1 creation navigates to the B1 content route.
- Exam cards and Media links use `exam_format`, not a source-key special case.
- Media queries and mutations include the current exam ID.

### Integration and smoke tests

- Create a blank exam and edit each starter skill.
- Clone only structure from an arbitrary B1 exam.
- Clone full content from an arbitrary B1 exam.
- Edit cloned content and verify the source remains unchanged.
- Replace shared media in the clone and verify the source continues using the original asset.
- Complete readiness requirements, publish the clone, start a learner attempt, save progress, submit, and review results.

## Migration and Rollout

1. Add and constrain the new exam metadata and idempotency storage.
2. Backfill the seeded B1 exam to `b1_practice` without reclassifying unrelated legacy exams.
3. Add the guarded creation RPC and database tests.
4. Generalize exam-scoped publish and attempt routines with compatibility tests.
5. Add typed frontend services and the creation wizard.
6. Generalize builder routing and exam-scoped media administration.
7. Run database tests, targeted Vitest suites, `pnpm tsc -b`, the production build, and Supabase advisors.
8. Apply the migration to the linked Supabase project only after the required dry-run gate passes with exactly the expected migrations.
9. Run authenticated admin and learner smoke tests against the deployed schema before enabling the creation action in production.

No destructive conversion of the seeded B1 data is required. Existing learner attempt snapshots remain immutable and readable throughout rollout.

## Acceptance Criteria

- An authorized administrator can create a scaffolded blank B1 exam from the exam library.
- An authorized administrator can choose any readable B1 exam and clone only its structure.
- An authorized administrator can choose any readable B1 exam and clone all supported editable content.
- Every new exam opens the B1 builder through `exam_format` and starts unpublished.
- Full clones can be edited without changing their source.
- Full clones initially share media assets, and replacing clone media does not affect the source.
- Failed or repeated requests do not create partial or duplicate exams.
- Media and publication operations are scoped by exam ID.
- Learner attempts work for newly created B1 exams without relying on the seeded source key.
- Database, frontend, integration, type-check, build, security, and deployment checks pass.
