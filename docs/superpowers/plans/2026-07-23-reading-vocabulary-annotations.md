# Reading Vocabulary Annotations Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins scan a saved reading article against existing English–Vietnamese `global_terms`, persist matches, and show matched words as dotted-underlined interactive vocabulary popovers to readers.

**Architecture:** A PostgreSQL RPC extracts normalized unique word tokens from `reading_articles.plain_text`, replaces the article’s rows in `reading_article_terms`, and returns the match count. The reader fetches persisted term details once, then a DOM-based annotator wraps matching text nodes without modifying stored HTML; clicks open a compact Neobrutalist popover using only stored `global_terms` data.

**Tech Stack:** PostgreSQL 17/Supabase RLS and RPC, React 19, TypeScript, Vitest/Testing Library.

---

## Chunk 1: Data and matching

### Task 1: Token annotation utility

**Files:**
- Create: `src/utils/readingVocabulary.ts`
- Test: `src/utils/readingVocabulary.test.ts`

- [ ] Write failing tests proving case-insensitive whole-word matching, punctuation preservation, repeated-word annotation, and no replacement inside HTML tags.
- [ ] Run `pnpm test -- src/utils/readingVocabulary.test.ts` and confirm failure because the utility does not exist.
- [ ] Implement a DOM text-node walker that produces annotated HTML with `data-reading-term-id` attributes.
- [ ] Re-run the test and confirm it passes.

### Task 2: Database scan and persisted matches

**Files:**
- Create: `supabase/migrations/<timestamp>_add_reading_article_terms.sql`
- Modify: `src/types/reading.types.ts`
- Modify: `src/services/supabase/adminReading.service.ts`
- Modify: `src/services/supabase/reading.service.ts`
- Test: `src/services/supabase/readingVocabulary.service.test.ts`

- [ ] Write failing service tests for scanning an article and loading persisted term details.
- [ ] Create the migration through `npx supabase migration new add_reading_article_terms`.
- [ ] Add `reading_article_terms`, explicit grants, RLS policies, indexes, and the authenticated admin-only `scan_reading_article_terms(uuid)` RPC.
- [ ] Add typed scan/load service methods and re-run tests.

## Chunk 2: Admin and reader UI

### Task 3: Admin scan control

**Files:**
- Modify: `src/pages/admin/AdminReadingEditorPage.tsx`

- [ ] Add a scan button available only after the article is saved.
- [ ] Show loading, result count, and rescan guidance without changing article HTML.
- [ ] Verify existing editor tests and TypeScript build.

### Task 4: Reader annotation and popover

**Files:**
- Create: `src/components/reading/ReadingVocabularyPopover.tsx`
- Test: `src/components/reading/ReadingVocabularyPopover.test.tsx`
- Modify: `src/pages/reading/ReadingDetailPage.tsx`
- Modify: `src/components/reading/VocabularyPopup.tsx` (remove from Reading flow only; keep file if used elsewhere)

- [ ] Write a failing component test for stored IPA, part of speech, translation, and audio rendering.
- [ ] Implement the anchored compact popover with no add-to-vocabulary action.
- [ ] Load article terms, annotate rendered HTML, and open the popover from a single click.
- [ ] Preserve text selection and existing quiz/audio behavior.

## Chunk 3: Verification and deployment

### Task 5: Verify, document, commit, and migrate

**Files:**
- Modify: `CLAUDE.md`

- [ ] Run focused tests and `pnpm build`.
- [ ] Run `gitnexus_detect_changes()` and review affected flows.
- [ ] Inspect `git status`, all diffs, and secret patterns.
- [ ] Commit only related files with a conventional English message.
- [ ] Dry-run and apply the single migration to the linked Supabase project.
- [ ] Verify aligned migration history, database lint output, and final dry-run.
