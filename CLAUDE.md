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
- **Routing:** react-router-dom v7 (`createBrowserRouter`)
- **Validation:** Zod v4
- **Package manager:** pnpm
- **Testing:** Vitest + Testing Library + jsdom
- **Design:** Neobrutalist aesthetic (thick borders, hard shadows, yellow/purple/dark palette)

## Scripts
```
pnpm dev          # Vite dev server
pnpm build        # tsc -b && vite build
pnpm lint         # eslint
pnpm test         # vitest run
pnpm test:watch   # vitest (watch mode)
```

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
    quiz/           # True/false question generator
    study/          # Study mode labels
    vocabulary/     # Zod form schema
  i18n/             # Custom i18n (vi/en, ~130 keys each)
  pages/            # 22 pages (see routing below)
  services/
    api/            # enrichVocabulary (Supabase Edge Function)
    supabase/       # client, auth, vocabulary, deck, study, quiz, statistics
  stores/           # useAuthStore, useLanguageStore, useStudyStore, useQuizStore
  types/            # auth, deck, language, quiz, study, vocabulary
  utils/            # audio, cn, languageCodes, normalizeText, shuffle, spacedRepetition
  test/             # Vitest setup
```

## Database (11 tables, all RLS-enabled)
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
| `quiz_results` | Quiz attempt records |
| `quiz_answers` | Individual quiz answers |

## Routing
**Public:** `/` (landing), `/login`, `/register`, `/forgot-password`, `/onboarding`

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

### Vocabulary data model
- `meanings` = definition/explanation of the word (from dictionary API, English)
- `translation` = direct translation of the word to user's native language (banana → quả chuối)
- `examples[].translation` = translation of the example sentence
- Vocabulary detail uses `relationshipService.getCard(id)` to load the main term plus grouped `term_relationships`. Edit vocabulary can create/delete related-term links; `synonym`, `antonym`, and `related` are stored bidirectionally, while `derivative`, `collocation`, and `idiom` are stored one-way.
- Flashcard study uses `relationshipService.getCard(currentTermId)` for the active card so one-side cards and flipped two-side cards can show translation fallback, examples, notes, images, and compact related terms.

### Service abstraction
All Supabase calls wrapped in service objects (`authService`, `vocabularyService`, `deckService`, `studyService`, `quizService`, `statisticsService`). Never call Supabase client directly from components.

### ConfirmModal (reusable confirmation dialog)
Use `ConfirmModal` from `@/components/ui/confirm-modal` instead of `window.confirm()`. Pattern: store pending action in state (e.g. `pendingDeleteIds`), render `<ConfirmModal open={...} onConfirm={...} onCancel={...} />`, execute action on confirm. Never use browser default dialogs.

### React Query keys
Pattern: `['entity', userId]` - e.g., `['vocabulary', user?.id]`, `['decks', user?.id]`, `['deck', id]`, `['deck-terms', id]`, `['statistics', user?.id]`

### Zustand stores (4)
1. `useAuthStore` - session, user, profile, loading
2. `useLanguageStore` - nativeLanguage, targetLanguage
3. `useStudyStore` - mode, cardLimit (`number | 'all'`), shuffle
4. `useQuizStore` - quizType, questionCount (`number | 'all'`)

### Spaced Repetition (`utils/spacedRepetition.ts`)
| Action | Status | Next Review |
|---|---|---|
| dont_know | need_review | +1 day |
| difficult | difficult | +1 day |
| know (1st correct) | learning | +2 days |
| know (repeated) | familiar | +7 days |
| memorized | memorized | +14 days |

### i18n
Custom system in `i18n/index.ts`. `useI18n()` returns `{ language, t }`. Keys: `section.key` format. Supports `vi` and `en`.

### Auth flow
Supabase Auth (email/password + Google OAuth). `AuthBootstrap` in `providers.tsx` restores session on mount. Database trigger auto-creates profile on signup. `ProtectedRoute` guards: loading -> login redirect -> onboarding redirect -> render.

### Design system
Neobrutalist: `neo-card`, `neo-button`, `neo-button-active` CSS utilities. Colors: yellow `#fdc800` (primary), purple `#432dd7` (secondary), off-white `#fbfbf9` (bg), dark navy `#1c293c` (fg). Fonts: Inter + JetBrains Mono.

## Current State / MVP Status
- **MVP 1 (current):** Core vocab CRUD, deck CRUD/membership management, all-vocabulary or deck-scoped flashcard study (two-side/one-side) with numeric/all card limits, all-vocabulary or deck-scoped true/false quiz with numeric/all question limits, review sessions from due/difficult SRS items, dashboard stats, i18n (vi/en)
- **MVP 2 (placeholder):** Custom flashcard templates, template builder
- **MVP 3 (planned):** Matching quiz, fill-blank quiz, mixed quiz
- **Not yet used:** `react-hook-form` (declared but forms use manual useState), `framer-motion` (declared, not used)

## Environment
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`
- Without these, app runs in demo mode with hardcoded data
- Supabase local dev: `supabase/config.toml` (ports 54321/54322)

## Supabase CLI & Deployment
- CLI available via `npx supabase` (v2.98+, no global install needed)
- Project ref: `brwvbpkgimhamivmaflu` (MemoryLang, Sydney region)
- Org ID: `lwpjxmfjvvdiufbsrviu`
- Deploy edge function: `npx supabase functions deploy enrich-vocabulary --project-ref brwvbpkgimhamivmaflu`
- Edge functions source: `supabase/functions/<name>/index.ts`
- Dashboard: https://supabase.com/dashboard/project/brwvbpkgimhamivmaflu

## Git Conventions
See `AGENTS.md` for commit workflow. Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`. No auto-push. Check for secrets before committing.
