# MemoryLang - Project Context

## Rules (must follow in every conversation)
1. **Always read this file first** before exploring the codebase. It contains all essential context.
2. **Update this file immediately** when you learn something new about the project that is not already documented here — new features, architecture changes, deployment info, conventions, dependencies, etc.
3. **Use this file as starting context**, but always verify against actual code when accuracy matters — CLAUDE.md may be outdated. Only skip reading code when the task is trivial or purely conversational.
4. After completing any significant task, ask yourself: "Does CLAUDE.md need updating?" If yes, update it before finishing.

## Overview
Vocabulary learning & spaced-repetition flashcard web app. Primary audience: Vietnamese learners studying English (supports 8+ languages). Single-page React app with Supabase backend.

## Tech Stack
- **Frontend:** React 19, TypeScript 6, Vite 8, Tailwind CSS v4 (CSS-first config)
- **Backend:** Supabase (PostgreSQL 17, Auth, Edge Functions)
- **State:** Zustand (4 client stores) + TanStack React Query (server state)
- **Local-first study storage:** Dexie/IndexedDB for cached study vocabulary, active study sessions, and pending study sync queues
- **Routing:** react-router-dom v7 (`createBrowserRouter`)
- **Validation:** Zod v4
- **Package manager:** pnpm
- **Testing:** Vitest + Testing Library + jsdom
- **Design:** Neobrutalist aesthetic (thick borders, hard shadows, yellow/purple/dark palette)

## Scripts
```
pnpm dev           # Vite dev server
pnpm build         # tsc -b && vite build
pnpm lint          # eslint
pnpm test          # vitest run
pnpm test:watch    # vitest (watch mode)
pnpm sync:secrets  # Sync API keys from .env to Supabase Edge Function secrets
```

**IMPORTANT:** Type-check with `pnpm tsc -b` (build mode with project references), NOT `tsc --noEmit`. The root `tsconfig.json` has `files: []` with project references, so `tsc --noEmit` on the root effectively checks nothing. CI runs `tsc -b` which catches errors that `--noEmit` misses.

## Path Aliases
- `@/` maps to `src/` (tsconfig + vite + components.json)

## Project Structure
```
src/
  app/              # App.tsx, providers.tsx, routes.tsx, ProtectedRoute.tsx
  components/
    common/         # AppLoading, EmptyState, PageHeader, StatTile
    layout/         # AppLayout (sidebar + header + outlet)
    ui/             # Button, Card, Badge, Progress, Input/Textarea/Select/Label, ConfirmModal
    vocabulary/     # RelatedTermsSection, relationshipDisplay
  features/
    demo/           # Hardcoded demo data (3 vocab, 2 decks)
    quiz/           # Translation-input quiz domain, legacy true/false generator, session persistence
    study/          # Study mode labels
    vocabulary/     # Zod form schema
  i18n/             # Custom i18n (vi/en, ~130 keys each)
  pages/            # 22 pages (see routing below)
  services/
    api/            # enrichVocabulary (Supabase Edge Function)
    local/          # Dexie local study DB + pending study sync service
    supabase/       # client, auth, vocabulary, deck, study, quiz, statistics
  stores/           # useAuthStore, useLanguageStore, useStudyStore, useQuizStore
  types/            # auth, deck, language, quiz, study, vocabulary
  utils/            # audio, cn, languageCodes, normalizeText, shuffle, spacedRepetition
  test/             # Vitest setup
```

## Database (13 tables, all RLS-enabled)
| Table | Purpose |
|---|---|
| `profiles` | User profile (linked to auth.users) |
| `language_profiles` | Per-language learning config |
| `global_terms` | Shared vocabulary cache |
| `user_terms` | Per-user vocabulary items (status, counts, review schedule, translation) |
| `term_relationships` | Directed links between user vocabulary terms (derivative, collocation, synonym, antonym, idiom, related) |
| `decks` | Vocabulary collections |
| `deck_terms` | Many-to-many join (decks <-> user_terms) |
| `flashcard_templates` | Card templates (MVP 2 placeholder) |
| `study_sessions` | Study session records |
| `quiz_results` | Legacy quiz attempt records (retained; translation-input MVP does not write results) |
| `quiz_answers` | Legacy individual quiz answers (retained; translation-input MVP does not write answers) |
| `notifications` | System/admin notifications (Realtime-enabled) |
| `user_notification_reads` | Tracks which user has read which notification |

## Routing
**Public:** `/` (full branded homepage with feature/workflow/product-preview sections), `/login`, `/register`, `/forgot-password`, `/onboarding`

**Protected (under `/app`, requires auth + completed onboarding):**
- `/app/dashboard` - Overview with daily goal, review pressure, learning health, deck progress, and statistics
- `/app/vocabulary` - List, detail, add, edit
- `/app/decks` - List, detail
- `/app/study` - Setup, session (`/session/:id`), result (`/result/:id`)
- `/app/quiz` - Setup, session (`/session/:id`), result (`/result/:id`)
- `/app/review` - Due today + difficult words
- `/app/templates` - MVP 2 placeholder
- `/app/statistics` - Redirects to `/app/dashboard` because statistics are integrated into Overview
- `/app/settings` - Profile, language, study, audio settings

## Key Patterns

### Dual-mode data layer
Every page checks `isSupabaseConfigured && Boolean(user)`. If false, uses hardcoded demo data from `features/demo/demoData.ts`. Allows full offline/demo operation.
Quiz demo sessions scope vocabulary by deck through `getDemoVocabularyForDeck()`. Study demo mode still uses the shared `demoVocabulary` list when a deck is selected until that flow is explicitly scoped.

### Vocabulary data model
- **meanings**: Definition/explanation of the word (English, from Dictionary API).
- **translation**: Direct translation of the word to user's native language (e.g., banana → quả chuối).
- **examples[].translation**: Translation of the example sentence.
- **Enrichment**:
  - Get IPA/Part of speech from `dictionaryapi.dev` (for English words).
  - Audio from Google Cloud TTS. Phrases, idioms, sentences, non-English source terms, and API errors return empty IPA unless manually entered/cached.
  - If dictionary enrichment returns no `audio_url`, `AddVocabularyForm` auto-calls the `generate-audio` Edge Function (Google Cloud TTS → Cloudflare R2 cache) to generate a WaveNet audio file (cached in R2 by text+language hash).
- **Relationships**:
  - Bidirectional (2 chiều): `synonym`, `antonym`, `related`.
  - One-way (1 chiều): `derivative`, `collocation`, `idiom`.
  - Loaded via `relationshipService.getCard(id)`. Edit page can create/delete these links.
- **Lesson Decks**:
  - Signed-in users can batch-create randomized lesson decks (`Bai hoc NN`) from selected library vocabulary.
  - If a deck's term linking fails, `deckService.createLessonBatch()` attempts to remove that incomplete deck while retaining earlier complete lessons.
  - Demo/offline mode does not create persisted lesson decks.
- Flashcard study uses `relationshipService.getCard(currentTermId)` for the active card so one-side cards and flipped two-side cards can show translation fallback, examples, notes, images, and compact related terms. `/app/study` is a study command center with session setup, optional resume card, and Supabase-backed recent study history. Remote study sessions create a `study_sessions` row at start, update viewed/remembered/forgot counts only on confirmed completion, prune history to the latest 30 sessions, and return to `/app/study` instead of a separate result screen. Users can delete individual history rows or clear all saved study history; vocabulary and review schedules are unaffected. Study sessions freeze a prepared vocabulary snapshot at session start and persist the snapshot, current card index, selected study mode, active session key, provisional ratings, and whether the final card has been reached in `sessionStorage`, so browser reloads and backward navigation preserve completion eligibility. Two-side cards use a lightweight CSS 3D flip with fixed-height front/back faces; one-side card height changes use a measured 180ms height transition. The study session UI normally exposes two review choices (`remember`/`forgot`) mapped to `know`/`dont_know`; setup can optionally require a timed centered `Đã nhớ` confirmation before forward or auto advancement, where click or its configured hotkey selects provisional `know` and timeout selects provisional `dont_know`. When confirmation mode is enabled, toolbar grading buttons are hidden and already rated cards do not prompt again. Settings exposes locally persisted flashcard hotkeys for confirm, grading, navigation, flip, auto-play, and session ending; hotkeys accept single keys or modifier combinations, do not run inside editable controls or completion/discard modals, and duplicate assignments are blocked before save. Once the final card is displayed, the right control and top card action become `Hoàn thành`; completing from either location opens one save-results modal. Before the final card is reached, `Kết thúc` opens an encouraging discard warning and abandoning the session records no SRS result. Auto-play stops and opens completion confirmation after traversing the final card.
- Completing a deck-scoped flashcard session returns to `/app/study` with a recent-completion card. When that deck has at least one translated term, `Kiểm tra bài này` opens `/app/quiz` with the completed deck preselected for the existing translation-input preflight. Review sessions, all-vocabulary sessions, and incomplete discards do not create this handoff.
- Flashcard sessions collect viewed term IDs and calculated SM-2 review actions provisionally inside the persisted session snapshot while cards are shown or rated. Only explicit completion enqueues actions, viewed IDs, and the session summary in Dexie/IndexedDB, then flushes them through the `apply_study_review_batch` Supabase RPC; ending an incomplete session clears its active snapshot without enqueuing those results. Completed pending changes retain the local-first transactional read-merge-write queue so simultaneous completion writes cannot overwrite review progress, and they retry on app startup after login, starting another session, and best-effort on `visibilitychange`/`pagehide`. Vocabulary remains cached per user/deck for offline fallback. Legacy `increment_term_view_counts` still exists, but flashcard study uses the combined batch sync path.
- Translation-input quiz setup selects all vocabulary or a deck, validates that active items have saved translations, and distinguishes empty, untranslated, partially translated, and failed-to-load sources before allowing start. When a selected source has both translated and untranslated active terms, setup shows the ready count against the total, names the untranslated terms, and links directly to their edit screens while still permitting a quiz from usable terms. The prompt shows source text plus optional IPA and part of speech; learners type the translation, retry incorrect input, or explicitly reveal the answer. Stored translations may contain comma/semicolon/newline-separated alternatives with a leading part-of-speech marker such as `(n)`; the quiz accepts an individual alternative while ignoring that marker. Revealing persists a no-point penalty for that question.
- The quiz session keeps the answer field focused, shakes it briefly on incorrect submissions, and exposes lightweight input-friendly shortcuts: `Enter` checks the answer, `Alt+R` reveals the answer after an incorrect try, and `Escape` clears the draft answer.
- Translation-input quiz sessions freeze generated questions and persist versioned progress (`index`, `score`, revealed/completed question IDs, and active session key) in `sessionStorage`, so reloads preserve order and reveal penalties without storing the draft input. Results currently show score only and do not write quiz statistics or update SRS.
- Legacy quiz system (true/false, quiz_results, quiz_answers) is retained in DB for compatibility but is NOT used by the current translation-input MVP UI.

### Service abstraction
All Supabase calls wrapped in service objects (`authService`, `vocabularyService`, `deckService`, `studyService`, `quizService`, `statisticsService`, `maintenanceService`, `notificationService`). Never call Supabase client directly from components.

### Maintenance mode
Admin can toggle maintenance mode from `/app/admin/features`. When enabled, `MaintenanceGuard` (inside `providers.tsx`, wrapping `AuthBootstrap` children) blocks all non-admin users with a full-screen `MaintenancePage`. Config is stored in `app_settings` key `maintenance_mode` (JSON: `{ enabled, message, estimated_end }`). The `anon` RLS policy allows unauthenticated users to read this key so the maintenance page displays before login. `maintenanceService.getStatus()` checks the setting every 30 seconds via React Query. Admin users bypass the guard and retain full app access.

### Notification system
Admin sends notifications from `/app/admin/notifications`. `NotificationBootstrap` in `AppLayout` loads active notifications on mount and subscribes to Supabase Realtime (postgres_changes on `notifications` table). New notifications trigger toast alerts via `showToast()` from `components/ui/toast.tsx`; toasts are suppressed during study/quiz sessions (`/session/` routes). `useNotificationStore` (Zustand) manages notification list, read IDs, and optimistic mark-as-read. Header bell icon shows real unread count badge and scrollable dropdown. Notifications have type (announcement/maintenance/update/alert), priority (low/normal/high/urgent), target (all/admins), and optional expiry.

### ConfirmModal (reusable confirmation dialog)
Use `ConfirmModal` from `@/components/ui/confirm-modal` instead of `window.confirm()`. Pattern: store pending action in state (e.g. `pendingDeleteIds`), render `<ConfirmModal open={...} onConfirm={...} onCancel={...} />`, execute action on confirm. Never use browser default dialogs.

### React Query keys
Pattern: `['entity', userId]` - e.g., `['vocabulary', user?.id]`, `['decks', user?.id]`, `['deck', id]`, `['deck-terms', id]`, `['statistics', user?.id]`

### Zustand stores (4)
1. `useAuthStore` - session, user, profile, loading
2. `useLanguageStore` - nativeLanguage, targetLanguage
3. `useStudyStore` - mode, cardLimit (`number | 'all'`), shuffle, and locally persisted remember-confirmation timing and flashcard hotkey mapping
4. `useQuizStore` - quizType, questionCount (`number | 'all'`)

### Spaced Repetition (`utils/spacedRepetition.ts`)
SM-2 adapter with the two-button study UI. `know` maps to quality 4 and increases repetition/interval using `srs_ease_factor`; `dont_know` maps to quality 0, resets repetition, schedules tomorrow, and lowers ease with a 1.3 floor. `status`, `correct_count`, `wrong_count`, `last_reviewed_at`, and `next_review_at` are still maintained for existing dashboard/review UI.

### i18n
Custom system in `i18n/index.ts`. `useI18n()` returns `{ language, t }`. Keys: `section.key` format. Supports `vi` and `en`.

### Auth flow
Supabase Auth (email/password + Google OAuth). `AuthBootstrap` in `providers.tsx` restores session on mount. Database trigger auto-creates profile on signup. `ProtectedRoute` guards: loading -> login redirect -> onboarding redirect -> render.

### Design system
Neobrutalist MemoryLang identity: thick navy borders, hard shadows, warm off-white surfaces, energetic yellow CTA/status accents, and purple secondary actions. Core CSS utilities: `neo-card`, `neo-button`, `neo-button-active`, `brand-grid-bg`, and `brand-surface`. Colors: yellow `#fdc800` (primary), purple `#432dd7` (secondary), off-white `#fbfbf9` (bg), dark navy `#1c293c` (fg). Fonts: Inter + JetBrains Mono.

### Brand assets
Usable logo exports live in `src/assets/brand/` and are rendered through `BrandLogo` / `BrandMark` from `components/common/BrandLogo.tsx`. Prefer SVG variants for runtime UI: primary logo for wide public surfaces, compact logo for navigation/auth/loading, icon-only for favicon, mobile headers, empty states, and subtle decorative marks. Study toolbar button icons live in `src/assets/brand/button-icons/`; corrected source/reference SVGs also live in `images/memorylang_button_icons_svg/`. The homepage uses the vector mascot export (`memorylang-mascot.svg`) as a large decorative layer behind hero/CTA objects so it stays transparent and does not carry a bitmap checkerboard background. The large generated brand-board PNGs in root `images/` are source/reference material; do not import them directly into the app runtime.

### Navigation
Authenticated app shell includes a `nav.home` link back to `/` so users can reach the public homepage without typing the URL. Homepage top navigation uses in-page anchors for features, workflow, and preview plus auth/demo entry points.
The authenticated `nav.study` sidebar link resumes an active stored flashcard session from normal app pages, but on `/app/study/result/:sessionId` it links to `/app/study` so finishing a legacy/result session and clicking `Học` starts from the study setup screen instead of reopening the completed session.

## Current State / MVP Status
- **MVP 1 (current):** Core vocab CRUD, deck CRUD/membership management, randomized lesson-deck creation from selected vocabulary, all-vocabulary or deck-scoped flashcard study (two-side/one-side) with numeric/all card limits and completed-lesson quiz handoff, all-vocabulary or deck-scoped translation-input quiz with numeric/all question limits and score-only results, review sessions from due/difficult SRS items, dashboard stats, i18n (vi/en)
- **MVP 2 (placeholder):** Custom flashcard templates, template builder
- **MVP 3 (planned):** Matching quiz, fill-blank quiz, mixed quiz
- **Not yet used:** `react-hook-form` (declared but forms use manual useState), `framer-motion` (declared, not used)

## Environment
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`
- Without these, app runs in demo mode with hardcoded data
- `UNSPLASH_ACCESS_KEY`, `PEXELS_API_KEY`, `PIXABAY_API_KEY` in `.env` (for image search Edge Function)
- `GOOGLE_TTS_CREDENTIALS_B64` in `.env` (base64 of Google Cloud Service Account JSON key for TTS Edge Function)
- `DEEPL_API_KEY` in `.env` (DeepL API auth key for machine translation; falls back to MyMemory when absent)
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_DOMAIN` in `.env` (Cloudflare R2 for storing generated TTS audio)
- Supabase local dev: `supabase/config.toml` (ports 54321/54322)
- Run `pnpm sync:secrets` after changing API keys in `.env` to push them to Supabase

## Supabase CLI & Deployment
- CLI available via `npx supabase` (v2.98+, no global install needed)
- Project ref: `brwvbpkgimhamivmaflu` (MemoryLang, Sydney region)
- Org ID: `lwpjxmfjvvdiufbsrviu`
- Remote DB has applied migrations up to `20260627000000_add_soft_delete_to_global_terms.sql` (Sydney region).
- **CRITICAL:** When deploying new code that relies on database schema changes (such as new columns, tables, or policies), you must ensure that all corresponding SQL migrations under `supabase/migrations/` have been successfully run/applied to the remote production Supabase database. Otherwise, the live app will hit 400 Bad Request errors (`column table.column does not exist`). Use the Supabase MCP server or Supabase Dashboard to run DDL migrations.
- Deploy edge functions: `npx supabase functions deploy <name> --project-ref brwvbpkgimhamivmaflu`
- Edge functions source: `supabase/functions/<name>/index.ts`
- **Edge Functions (3):**
  - `enrich-vocabulary` — dictionary lookup + machine translation
  - `search-images` — proxies Unsplash (primary), Pexels, and Pixabay APIs for vocabulary illustrations. All images are downloaded and re-uploaded to `vocabulary-images` bucket. API keys stored in `.env` and synced to Edge Function secrets via `pnpm sync:secrets`.
  - `generate-audio` — Google Cloud Text-to-Speech (WaveNet voices) with audio caching in Cloudflare R2. Accepts `text`, `language` (BCP-47), and optional `voice` name. Returns `audioUrl` + `cached` flag.
- Dashboard: https://supabase.com/dashboard/project/brwvbpkgimhamivmaflu

## Git Conventions
See `AGENTS.md` for commit workflow. Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`. No auto-push. Check for secrets before committing.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **MemoryLang** (3720 symbols, 6832 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/MemoryLang/context` | Codebase overview, check index freshness |
| `gitnexus://repo/MemoryLang/clusters` | All functional areas |
| `gitnexus://repo/MemoryLang/processes` | All execution flows |
| `gitnexus://repo/MemoryLang/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
