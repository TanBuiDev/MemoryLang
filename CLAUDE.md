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
- **Rich-text editing:** Tiptap v3 / ProseMirror
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

## Core database tables (RLS-enabled)
| Table | Purpose |
|---|---|
| `profiles` | User profile (linked to auth.users) |
| `language_profiles` | Per-language learning config |
| `global_terms` | Shared vocabulary cache |
| `user_terms` | Per-user vocabulary progress (status, counts, review schedule, SRS state) linked to `global_terms` |
| `term_relationships` | Directed links between user vocabulary terms (derivative, collocation, synonym, antonym, idiom, related) |
| `decks` | Vocabulary collections |
| `deck_terms` | Many-to-many join between decks and vocabulary terms; current app code links deck entries by `global_term_id` |
| `flashcard_templates` | Card templates (MVP 2 placeholder) |
| `study_sessions` | Study session records |
| `quiz_results` | Quiz attempt records; translation-input sessions write aggregate result rows |
| `quiz_answers` | Legacy individual quiz answers; translation-input sessions currently do not write per-question answers |
| `notifications` | System/admin notifications (Realtime-enabled) |
| `user_notification_reads` | Tracks which user has read which notification |
| `chat_sessions` | Per-user AI Tutor conversation sessions |
| `chat_messages` | User and assistant messages; users can read only their own messages |
| `chat_usage_events` | Server-written provider/model/token audit events used for daily AI quota enforcement |
| `reading_articles` | Reading passages, classification, access tier, and publication state |
| `reading_questions` | Reading-comprehension quiz questions |
| `reading_attempts` | User reading progress and quiz attempts |
| `reading_highlights` | User highlights saved from reading passages |
| `reading_article_terms` | Persisted links between reading articles and existing `global_terms` vocabulary |

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
- Translation-input quiz sessions freeze generated questions and persist versioned progress (`index`, `score`, revealed/completed question IDs, and active session key) in `sessionStorage`, so reloads preserve order and reveal penalties without storing the draft input. Results save aggregate `quiz_results` rows for remote sessions, but currently pass an empty answers array, so `quiz_answers` remains legacy/unused for translation-input analytics. Quiz completion still does not update SRS.
- Legacy quiz system (true/false, quiz_results, quiz_answers) is retained in DB for compatibility but is NOT used by the current translation-input MVP UI.

### Service abstraction
All Supabase calls wrapped in service objects (`authService`, `vocabularyService`, `deckService`, `studyService`, `quizService`, `statisticsService`, `maintenanceService`, `notificationService`). Never call Supabase client directly from components.

### Maintenance mode
Admin can toggle maintenance mode from `/app/admin/features`. When enabled, `MaintenanceGuard` (inside `providers.tsx`, wrapping `AuthBootstrap` children) blocks all non-admin users with a full-screen `MaintenancePage`. Config is stored in `app_settings` key `maintenance_mode` (JSON: `{ enabled, message, estimated_end }`). The `anon` RLS policy allows unauthenticated users to read this key so the maintenance page displays before login. `maintenanceService.getStatus()` checks the setting every 30 seconds via React Query. Admin users bypass the guard and retain full app access.

### Content gating
Grammar and Listening topics use `access_tier` (`free`/`pro`) plus optional `teaser_config`. List pages may show Pro topics and teaser UI for discovery, but direct route pages must gate before loading protected payloads. Free users opening Pro Grammar lessons see `ContentLockState` before `lesson_blocks` are fetched or view counts increment. Free users opening Pro Listening topic/test/session URLs see `ContentLockState` before tests, parts, audio, transcripts, or questions are fetched; bundled ETS demo routes bypass remote gating. DB-level child-payload RLS hardening is implemented by `20260716052954_harden_content_gating_rls.sql`, which adds `public.is_user_pro(uuid)`, makes quota RPCs period-aware, and restricts `lesson_blocks`, `grammar_exercises`, `listening_tests`, and `listening_parts` payload reads to Free topics, Pro users, or admins.

Reading article classification options are stored in the `reading_article_options` `app_settings` row and admins can add CEFR, difficulty, purpose, or access-tier values from the article editor. Custom access tiers are restricted like Pro by default in both React and Reading RLS; only the literal `free` tier is public. Reading content uses a Tiptap/ProseMirror rich-text editor with headings, common text styles, lists, alignment, links, undo/redo, visual table creation/editing, and a paste-mode selector for preserving formatting or pasting plain text; admins are never exposed to raw HTML editing. Its HTML output remains compatible with the existing `content_html` column, while plain text for TTS and reading metrics is derived automatically. After saving an article, admins can scan its content against existing `global_terms`; exact normalized word matches are persisted in `reading_article_terms` and rendered with short, separated dotted underlines and single-click vocabulary popovers for readers. Admin-facing scan messages use product language instead of exposing database table names. Popovers group translations by each stored part of speech instead of merging multiple parts of speech into one label. Saving a draft switches the editor to an inline preview. The admin list's view action always targets the learner-facing `/app/reading/:id` route and is disabled for drafts because the public reading detail route intentionally serves published articles only. Generated Reading TTS audio can be played or paused directly in the editor.

### Subscription & Payment
MemoryLang has a Free/Pro subscription system backed by `subscriptions` and `payment_logs`. The MVP PayOS flow uses one Edge Function, `process-payment`, for authenticated app actions and PayOS webhooks. User actions send an `action` field; PayOS webhooks are detected by `{ data, signature }` and verified with `PAYOS_CHECKSUM_KEY`. PayOS does not provide a separate sandbox, so end-to-end payment verification must use a small real transaction.
Admins manage pricing and subscriptions from `/app/admin/subscriptions`, including Pro monthly/yearly price edits, manual Pro grants, renewals, cancel-at-period-end, downgrades, payment history review, and audit logging. Subscription prices live in `subscription_plans`; `/app/upgrade` and `process-payment` read from this table, while PayOS webhook verification uses the amount stored in the pending `payment_logs` row.
PayOS `qrCode` responses are raw VietQR payload strings, not image URLs. The subscription payment modal must render an image locally from that payload and keep `checkoutUrl` as the hosted payOS fallback link.
Subscription quota enforcement is shared across DB RPCs and Supabase services: Free users are limited to 100 active vocabulary terms and 5 decks, Pro requires active/trialing status plus a future or null `current_period_end`, and vocabulary/deck create paths call quota RPCs before inserting new `user_terms` or `decks`. UI success flows refresh `useSubscriptionStore` counts after quota-affecting writes.

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
The linked Supabase project currently signs user access tokens with an asymmetric EC P-256 key (`ES256`), exposed through the project JWKS endpoint; backend token verification must support JWKS key rotation instead of assuming legacy `HS256` or `RS256`.

### Statistics API database boundary
The planned Java statistics API connects with the dedicated `memorylang_stats_readonly` PostgreSQL role provisioned by the MemoryLang migration. The role is `LOGIN`, `NOINHERIT`, `NOBYPASSRLS`, has no direct role memberships or `SET OPTION` escape paths, defaults transactions to read-only, has `USAGE` on `public`, and can `SELECT` only `study_sessions`, `user_terms`, `global_terms`, `decks`, `deck_terms`, and `quiz_results`. Its password is provisioned and rotated out of band, never embedded in migrations.
Role-targeted restrictive `SELECT` policies require a non-null `(select auth.uid())` ownership match on user-scoped tables and owned-deck membership on `deck_terms`, so existing public-deck policies cannot broaden Java analytics reads. A role-targeted permissive policy exposes only non-deleted `global_terms`. Java must set `request.jwt.claim.sub` transaction-locally before queries; without that context, user-owned tables return no rows. Local isolation and privilege coverage lives in `supabase/tests/database/stats_api_rls.test.sql`.
The stats role has no effective `EXECUTE` privilege on any routine currently in `public`, including privileges inherited from `PUBLIC`. The provisioning migration replaces existing `PUBLIC` routine access with explicit grants that preserve the effective ACL of `anon`, `authenticated`, and `service_role`, without widening restricted RPCs. This is a snapshot boundary, not platform-wide default-privilege enforcement: every later public routine migration must explicitly revoke `PUBLIC`, grant only its intended Supabase roles, and rerun the stats pgTAP/catalog audit. The audit also enforces the exact six-relation SELECT allowlist, zero write privileges across public tables/views/materialized views/partitioned or foreign tables, and zero public-sequence privileges.
The sibling repository `../memorylang-stats-api` contains the Java 21 statistics API on Spring Boot 4.1.0 with the current `spring-boot-starter-webmvc` and `spring-boot-starter-security-oauth2-resource-server` starters, springdoc-openapi 3.0.3, and Maven Wrapper 3.3.4 (Maven 3.9.15). Official springdoc documentation supports the 3.x line with Spring Boot 4 generally; the exact springdoc 3.0.3 and Boot 4.1.0 pairing is verified locally by the integration test and build. Its runtime contract is `SUPABASE_URL`, `STATS_DB_URL`, `STATS_DB_USER`, `STATS_DB_PASSWORD`, and the explicit `STATS_CORS_ALLOWED_ORIGINS` allowlist; JDBC enforces TLS, Hikari uses `maximum-pool-size=5` and `minimum-idle=0`, and virtual threads are enabled. Spring Security uses a stateless OAuth2 Resource Server with an explicit Nimbus decoder: issuer `${SUPABASE_URL}/auth/v1`, rotation-aware JWKS `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`, ES256 only, standard timestamp/issuer validation, and UUID validation for JWT `sub` before application code. `AuthenticatedUserResolver` derives the immutable application identity only from the verified `sub`; `user_metadata`, email, and client IDs are not identity sources. `/actuator/health`, `/v3/api-docs/**`, and `/swagger-ui/**` are public; every business route requires authentication. `UserScopedTransaction` opens a Spring-marked read-only `REQUIRES_NEW` transaction and sets `request.jwt.claim.sub` with parameterized transaction-local `set_config(..., true)` on the transaction-bound `JdbcClient`. Its Java `UserScope` is installed only inside the transaction callback after the datasource's exact `ConnectionHolder` is bound, and is removed in `finally` before the callback returns or commit/completion synchronizations execute. Same-user direct nesting is allowed only while Spring reports the transaction active and the exact holder remains bound; different-user nesting, suspended/replaced transactions, unrelated transaction lifecycles, and completion callbacks are rejected before the nested operation or query runs. Analytics repository SQL continues to accept `userId` and include explicit ownership predicates while RLS remains the independent second layer. A versioned PostgreSQL 17 Testcontainers fixture uses a one-connection Hikari pool and a read-only `NOINHERIT`/`NOSUPERUSER`/`NOBYPASSRLS` role to prove commit and rollback cleanup on the same backend connection, holder-bound nesting, synchronization rejection, concurrent virtual-thread isolation, independent Spring/database read-only enforcement, and absence of packaged test fixtures or Testcontainers dependencies. Deterministic auth tests still serve an in-memory generated EC/RSA JWKS locally and exercise the real decoder/security chain without Supabase calls; PostgreSQL 17 integration tests verify database health, CORS, the public OpenAPI contract, and the protected business routes.

The Java statistics API now exposes authenticated study-activity analytics at `GET /api/v1/streaks/current`, `/api/v1/streaks/history`, `/api/v1/activity/heatmap`, and `/api/v1/activity/summary`. These routes never accept a user identity input: controllers resolve the verified JWT subject through `AuthenticatedUserResolver`, and every repository call runs inside `UserScopedTransaction` while retaining a parameterized `user_id` predicate. Study days come only from non-null `study_sessions.ended_at`, converted to the fixed `Asia/Ho_Chi_Minh` product date. PostgreSQL CTE/window queries deduplicate streak days and return most-recent runs; heatmap queries generate every requested date including zero days; summaries aggregate stored session counters and return a zero remembered ratio when the denominator is zero. Limits are history `1..100`, heatmap at most 366 inclusive dates with `from <= to`, and summary `1..365` days. Local PostgreSQL 17 integration coverage fixes the clock, exercises the real ES256/JWKS security chain, and proves timezone boundaries, duplicate aggregation, empty states, validation, explicit tenant predicates, and RLS isolation.

The Java statistics API also exposes current-state mastery/SRS analytics at `GET /api/v1/mastery/distribution`, `/api/v1/mastery/ease-factor`, `/api/v1/srs/health`, `/api/v1/srs/forecast`, and `/api/v1/srs/difficulty-distribution`. All queries require the authenticated UUID through `UserScopedTransaction`, retain an explicit `user_id` predicate, and exclude soft-deleted `user_terms`. Distribution returns six ordered known-status buckets and excludes unknown legacy statuses from both total and buckets. Ease averages use non-null values with four-place half-up rounding; health uses injected-clock overdue boundaries plus the `difficult`/`need_review` or wrong-over-correct retrograde rule; forecast uses UTC half-open filtering and zero-filled `Asia/Ho_Chi_Minh` dates for `1..90` days; interval analytics exclude non-positive unscheduled values. No historical mastery trajectory is exposed because `user_terms` stores only current state.

Deck analytics are exposed at `GET /api/v1/decks/analytics` and `GET /api/v1/decks/{id}/engagement`. Completion joins `decks → deck_terms → user_terms` only through `global_term_id`, never legacy `user_term_id`, deduplicates term/status membership, excludes soft-deleted user terms, and orders decks deterministically. Engagement includes only completed study sessions and defensively excludes invalid durations. Both routes retain explicit owner predicates inside `UserScopedTransaction`; public, private, and unknown decks not owned by the authenticated user are indistinguishable 404 responses. The partial index `study_sessions_user_deck_completed_idx` supports completed-session lookups by `(user_id, deck_id)`.

Quiz aggregate analytics are exposed at `GET /api/v1/quiz/analytics/summary` and `GET /api/v1/quiz/analytics/recent`. Summary returns total quiz/question/correct counts, weighted accuracy percentage, valid average duration, and deterministic `quiz_type` breakdowns. Recent results default to 30, accept `limit 1..100`, and order by `created_at desc, id desc`. Both queries run inside `UserScopedTransaction`, retain explicit `user_id` predicates, and expose no user identity. The Java API deliberately has no per-question DTO/path and never queries legacy `quiz_answers`, because current translation-input sessions persist aggregate `quiz_results` only.

Recommendation endpoints are exposed under `GET /api/v1/recommendations/*` for due review, at-risk, almost-memorized, neglected, weak-deck, and next-term suggestions. At-risk ranking uses a documented 100-point status/error/ease/overdue formula. Weak-deck selection is limited to owned non-empty decks. Term lists collapse duplicate `user_terms` rows deterministically by `global_term_id`, and language-pair frequency counts distinct global terms. Next-term selection uses the user's deterministic most-frequent active language pair, excludes all already represented global terms with `NOT EXISTS`, deduplicates tag overlap, ranks positive overlap ahead of zero, and uses a stable text/UUID fallback when the mastered profile is empty.

The Java API returns one `ApiError` shape for 400/401/403/404/405/500 responses and never exposes SQL, schema, stack traces, database hosts, or credentials in unexpected-error responses or logs. Unsupported HTTP methods retain the `405 METHOD_NOT_ALLOWED` contract instead of falling through to 500. `X-Request-Id` is accepted only when it matches the safe bounded format; otherwise a UUID is generated. Request logs contain request ID, method, path, status, and duration only. OpenAPI declares ES256 bearer authentication and shared error schemas. CORS credentials are allowed only for the explicit environment allowlist, with empty and wildcard configurations rejected; health details remain disabled.

The Java repository is containerized through a host-verified artifact workflow: `mvnw clean verify` runs all PostgreSQL 17 Testcontainers tests and produces the executable JAR before Docker build. The multi-stage Dockerfile validates that JAR, copies only it into an Eclipse Temurin JRE 21 runtime, and runs as UID/GID 10001. Compose supplies required Supabase/database values only through environment substitution and applies a read-only root filesystem, tmpfs `/tmp`, dropped capabilities, `no-new-privileges`, and init. Phase 11 local verification covers all 19 protected endpoints across user A/B, 107 tests from a clean clone, health/Swagger/401/valid-token container smoke, and repository/image/JAR secret and test-artifact scans. Phase 12 Cloud Run deployment remains deliberately deferred until local operation is accepted.

The React dashboard integrates the Java statistics API when `VITE_STATS_API_URL` is set. `statsApiService` reads the current Supabase session token per request, retries one 401 through Supabase session refresh without persisting another JWT copy, and fetches current streak plus the 30-day activity summary. The Neobrutalist learning-insights widget shows session count, studied cards, remembered cards, streaks, remembered ratio, and last study date. Admins control its visibility from `/app/admin/analytics` through the `feature_flags.learning_analytics_dashboard` row and can monitor public health plus the current admin's authenticated statistics pipeline. When hidden, the learner dashboard does not request Java analytics endpoints; when the URL is absent, the admin monitor reports the missing frontend configuration.

### Design system
Neobrutalist MemoryLang identity: thick navy borders, hard shadows, warm off-white surfaces, energetic yellow CTA/status accents, and purple secondary actions. Core CSS utilities: `neo-card`, `neo-button`, `neo-button-active`, `brand-grid-bg`, and `brand-surface`. Colors: yellow `#fdc800` (primary), purple `#432dd7` (secondary), off-white `#fbfbf9` (bg), dark navy `#1c293c` (fg). Fonts: Inter + JetBrains Mono.
Use the shared `Button` component from `@/components/ui/button` for visible page, modal, drawer, toast, form, and confirmation actions. Do not hand-roll raw `<button className="neo-button ...">` controls for standard actions; this has caused inconsistent button height, font weight, spacing, and variant colors. Modal cancel/close actions should use `Button variant="ghost"`, primary actions use `primary` or `secondary`, and destructive actions use `danger`.

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
- Optional `VITE_STATS_API_URL` enables the local Java dashboard widget (for example `http://localhost:8080`)
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
- Remote DB migration history is aligned through `20260723152208_add_reading_article_terms.sql` (Sydney region). Reading vocabulary scans now persist exact matches from `global_terms` in `reading_article_terms`, with admin-only refresh and authenticated-reader lookup RPCs.
- Remote catalog verification confirms `memorylang_stats_readonly` is login-only, `NOINHERIT`, `NOBYPASSRLS`, has zero memberships/routine/sequence privileges, exactly six `SELECT` grants, the six intended stats policies, and `default_transaction_read_only=on`.
- The dedicated stats role password and Java runtime `.env` are now provisioned locally. Remote role verification with two real non-admin users proves no-context reads return zero rows, user A/B contexts return only their distinct `user_terms`/completed-session counts, commit and rollback both clear the GUC, and writes fail under the read-only transaction. Real-token HTTP/API cross-user smoke remains separate evidence.
- Real Supabase ES256 tokens from two non-admin browser sessions now reach the local Java container through the React dashboard: both `/api/v1/streaks/current` and `/api/v1/activity/summary` return 200, while an unauthenticated request returns 401. The users receive isolated 30-day session totals of 1 and 2 respectively, matching direct remote role verification. Local Docker maps host port 8081 to the container's internal port 8080 because host port 8080 is occupied by another local service.
- **CRITICAL:** When deploying new code that relies on database schema changes (such as new columns, tables, or policies), you must ensure that all corresponding SQL migrations under `supabase/migrations/` have been successfully run/applied to the remote production Supabase database. Otherwise, the live app will hit 400 Bad Request errors (`column table.column does not exist`). Use the Supabase MCP server or Supabase Dashboard to run DDL migrations.
- Deploy edge functions: `npx supabase functions deploy <name> --project-ref brwvbpkgimhamivmaflu`
- Edge functions source: `supabase/functions/<name>/index.ts`
- **Edge Functions (5 source directories; `ai-chat` deployment pending):**
  - `enrich-vocabulary` — dictionary lookup + machine translation
  - `search-images` — proxies Unsplash (primary), Pexels, and Pixabay APIs for vocabulary illustrations. All images are downloaded and re-uploaded to `vocabulary-images` bucket. API keys stored in `.env` and synced to Edge Function secrets via `pnpm sync:secrets`.
  - `generate-audio` — Google Cloud Text-to-Speech (WaveNet voices) with audio caching in Cloudflare R2. Accepts `text`, `language` (BCP-47), and optional `voice` name. Returns `audioUrl` + `cached` flag.
  - `process-payment` — PayOS checkout, payment status/cancel actions, subscription cancellation, and unauthenticated PayOS webhook processing. Deployed with `--no-verify-jwt` so PayOS webhooks can reach the function; app actions still validate the Supabase auth header inside the function.
  - `ai-chat` — authenticated AI Tutor chat with Gemini/OpenAI provider selection, daily tier quota, and persisted session history. Gemini uses native function calling for read-only, JWT-scoped learner data tools; assistant messages retain the verified evidence labels in `chat_messages.metadata`. Direct learning-data and grammar-catalog replies are formatted deterministically from the RPC payload rather than letting the model paraphrase counts. Replies mirror the latest learner-message language unless target-language practice is explicitly requested; the chat page inserts an optimistic user message and a thinking state before the provider responds. Requires the AI chat migrations plus `AI_PROVIDER`, provider API key, and model secrets before deployment.
- Dashboard: https://supabase.com/dashboard/project/brwvbpkgimhamivmaflu

## Frontend Deployment & Chunk Cache
- Vite emits hashed lazy chunks under `/assets`. Cloudflare Pages only serves the current deployment on the custom domain, so users with an older in-memory SPA can request stale chunks after a new deploy.
- Dynamic import failures such as `Failed to fetch dynamically imported module: .../assets/*.js` usually mean stale deployment/chunk cache, not a broken page component.
- Lazy routes must use `lazyWithChunkRecovery()` from `src/utils/chunkLoadRecovery.ts` so stale chunk failures reload the app once and then use the newest `index.html`.
- Do not configure JS chunks with year-long immutable caching. `/assets/*.js`, root `/*.js`, `/assets/*.css`, and root `/*.css` must revalidate; stale chunk fallback is handled in the app by `lazyWithChunkRecovery()`, not by a top-level `404.html`.
- Cloudflare Pages `_redirects` only supports local proxy/rewrite status `200`. Do not add unsupported rewrite rules such as `/assets/* /404.html 404`; they can prevent the SPA fallback `/* /index.html 200` from working and make direct routes like `/app/admin` serve the static 404 page.
- Do not ship a top-level `public/404.html` for this SPA. On Cloudflare Pages, a root `404.html` switches missing-path handling to Not Found behavior; without it, Pages treats the project as an SPA and routes deep links back to `/`.

## Git Conventions
See `AGENTS.md` for commit workflow. Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`. No auto-push. Check for secrets before committing.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **MemoryLang** (6044 symbols, 10614 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

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
