# MemoryLang

Vocabulary learning & spaced-repetition flashcard web app. Primary audience: Vietnamese learners studying English (supports 8+ languages).

## Features

- **Vocabulary CRUD** — Add, edit, delete words/phrases/idioms/sentences
- **Image search** — Search and add illustrations from Unsplash, Pexels, and Pixabay directly from the vocabulary detail page
- **Flashcard study** — Two-side and one-side card modes with progress tracking
- **Translation quiz** — Choose all vocabulary or a deck, type translations, reveal answers when stuck, and receive a score
- **Generated lessons** — Split selected vocabulary into randomized lesson decks, then quiz a completed lesson immediately
- **Spaced repetition** — Review scheduling based on recall performance
- **Exam Management & Builder** — Create generic certification exams (TOEIC, IELTS, TOEFL, THPTQG, Cambridge) with visual double/triple passage tabs, collapsible question lists, sticky save bar, and duplicate set features
- **Smart Exam Question Import (AI & OCR)** — Import questions from PDF/Word copy-paste text, local browser Web Worker OCR (`tesseract.js`), or Google Gemini 2.0 Flash AI Vision (auto-splits 2-column layouts, selects correct answers, and generates Vietnamese explanations)
- **Dashboard stats** — Total words, accuracy rate, deck progress
- **i18n** — Vietnamese and English interface
- **Demo mode** — Full offline operation with hardcoded data (no Supabase required)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript 6, Vite 8 |
| Styling | Tailwind CSS v4 (neobrutalist design) |
| Backend | Supabase (PostgreSQL 17, Auth, Edge Functions) |
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

### Environment Configuration

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Image search API keys (used by Edge Function search-images)
UNSPLASH_ACCESS_KEY=your_unsplash_access_key
PEXELS_API_KEY=your_pexels_api_key
PIXABAY_API_KEY=your_pixabay_api_key

# Do not add provider/API secrets to VITE_* variables. They are bundled into
# the browser. Configure Gemini only as an Edge Function secret or through
# the write-only admin vault UI after signing in.
```

Without `VITE_SUPABASE_*` variables, the app runs in **demo mode** with hardcoded data.

After setting or changing server-side API keys in `.env`, sync them to Supabase Edge Function secrets:

```bash
pnpm sync:secrets
npx supabase secrets set GEMINI_API_KEY=your_gemini_api_key
```

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
    exam/           # BulkExamQuestionImportModal (AI Vision & OCR Import)
    layout/         # AppLayout (sidebar + header)
    ui/             # Button, Card, Badge, Progress, Input, Select, ConfirmModal
  features/
    demo/           # Hardcoded demo data
    quiz/           # Translation quiz logic and session persistence
    study/          # Study mode labels
    vocabulary/     # Zod form schema
  i18n/             # Custom i18n (vi/en)
  pages/            # 22 pages (AdminExamBuilderPage, AdminSecretsPage...)
  services/
    api/            # enrichVocabulary, generateAudio, imageSearch
    supabase/       # client, auth, vocabulary, deck, study, quiz, statistics, adminExam
  stores/           # Zustand stores (auth, language, study, quiz)
  types/            # TypeScript type definitions
  utils/            # audio, examQuestionImport, imageOcrQuestionParser, geminiVisionParser
supabase/
  functions/        # Supabase Edge Functions (enrich-vocabulary, parse-exam-vision...)
```

## Deployment

```bash
# Sync server-side API keys from .env to Supabase
pnpm sync:secrets
npx supabase secrets set GEMINI_API_KEY=your_gemini_api_key

# Deploy Edge Functions
npx supabase functions deploy enrich-vocabulary --project-ref <your-project-ref>
npx supabase functions deploy search-images --project-ref <your-project-ref>
npx supabase functions deploy parse-exam-vision --project-ref <your-project-ref>

# Push database migrations
npx supabase db push
```

## License

Private project.
