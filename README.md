# MemoryLang

Vocabulary learning & spaced-repetition flashcard web app. Primary audience: Vietnamese learners studying English (supports 8+ languages).

## Features

- **Vocabulary CRUD** — Add, edit, delete words/phrases/idioms/sentences
- **AI-powered enrichment** — Auto-generate IPA, definitions, translations, and example sentences via Edge Function
- **Flashcard study** — Two-side and one-side card modes with progress tracking
- **Translation quiz** — Choose all vocabulary or a deck, type translations, reveal answers when stuck, and receive a score
- **Generated lessons** — Split selected vocabulary into randomized lesson decks, then quiz a completed lesson immediately
- **Spaced repetition** — Review scheduling based on recall performance
- **Dashboard stats** — Total words, accuracy rate, deck progress
- **i18n** — Vietnamese and English interface
- **Demo mode** — Full offline operation with hardcoded data (no Supabase required)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript 6, Vite 8 |
| Styling | Tailwind CSS v4 (neobrutalist design) |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions) |
| State | Zustand + TanStack React Query |
| Routing | react-router-dom v7 |
| Validation | Zod v4 |
| Testing | Vitest + Testing Library |

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Installation

```bash
pnpm install
```

### Environment

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Without these variables, the app runs in **demo mode** with hardcoded data.

### Development

```bash
pnpm dev
```

### Build

```bash
pnpm build
```

### Test

```bash
pnpm test
```

## Project Structure

```
src/
  app/              # App entry, providers, routes, auth guards
  components/
    common/         # PageHeader, StatTile, EmptyState
    layout/         # AppLayout (sidebar + header)
    ui/             # Button, Card, Badge, Progress, Input
  features/
    demo/           # Hardcoded demo data
    quiz/           # Translation quiz logic and session persistence
    study/          # Study mode labels
    vocabulary/     # Zod form schema
  i18n/             # Custom i18n (vi/en)
  pages/            # 22 pages
  services/
    api/            # enrichVocabulary (Edge Function)
    supabase/       # client, auth, vocabulary, deck, study, quiz, statistics
  stores/           # Zustand stores (auth, language, study, quiz)
  types/            # TypeScript type definitions
  utils/            # audio, spaced repetition, text normalization
```

## Database

10 tables with Row Level Security:

| Table | Purpose |
|---|---|
| `profiles` | User profile |
| `language_profiles` | Per-language learning config |
| `global_terms` | Shared vocabulary cache |
| `user_terms` | Per-user vocabulary (status, counts, review schedule, translation) |
| `decks` | Vocabulary collections |
| `deck_terms` | Many-to-many join |
| `flashcard_templates` | Card templates (MVP 2) |
| `study_sessions` | Study session records |
| `quiz_results` | Quiz attempt records |
| `quiz_answers` | Individual quiz answers |

## Spaced Repetition

| Action | Status | Next Review |
|---|---|---|
| Don't know | need_review | +1 day |
| Difficult | difficult | +1 day |
| Know (1st correct) | learning | +2 days |
| Know (repeated) | familiar | +7 days |
| Memorized | memorized | +14 days |

## Deployment

```bash
# Deploy Edge Function
npx supabase functions deploy enrich-vocabulary --project-ref <your-project-ref>

# Push database migrations
npx supabase db push
```

## License

Private project.
