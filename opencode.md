# OpenCode Rules — MemoryLang

## Must-Know Context (read CLAUDE.md first)
- Vocabulary learning + SRS flashcard app, Vietnamese learners → English
- React 19, TypeScript 6, Vite 8, Tailwind CSS v4, Supabase, pnpm
- Path alias `@/` → `src/`

## Commands
```
pnpm dev          # Start dev server
pnpm build        # tsc -b && vite build
pnpm lint         # ESLint
pnpm test         # Vitest (run)
pnpm test:watch   # Vitest (watch)
```

## Critical Code Rules

### 1. Dual-mode data layer
Every page MUST check `isSupabaseConfigured && Boolean(user)`. If false → use demo data from `features/demo/demoData.ts`. Never assume Supabase is available.

### 2. Service abstraction
All Supabase calls go through service objects (`authService`, `vocabularyService`, `deckService`, `studyService`, `quizService`, `statisticsService`, `relationshipService`). NEVER call `supabase` client directly from components.

### 3. ConfirmModal, never window.confirm()
Use `<ConfirmModal>` from `@/components/ui/confirm-modal`. Pattern: store pending action in state, render modal, execute on confirm.

### 4. React Query key pattern
`['entity', userId]` — e.g. `['vocabulary', user?.id]`, `['decks', user?.id]`, `['deck', id]`, `['deck-terms', id]`, `['statistics', user?.id]`, `['vocabulary-card', id]`.

### 5. No comments unless explicitly requested

### 6. Vocabulary data model
- `meanings` = English definitions
- `translation` = direct translation to native language
- `examples[].translation` = translation of example sentence
- IPA/audio only from dictionaryapi.dev, only for single English words
- Relationships: `synonym`/`antonym`/`related` = bidirectional; `derivative`/`collocation`/`idiom` = one-way

### 7. Design system (Neobrutalist)
CSS classes: `neo-card`, `neo-button`, `neo-button-active`, `brand-grid-bg`, `brand-surface`
Colors: yellow `#fdc800`, purple `#432dd7`, off-white `#fbfbf9`, navy `#1c293c`
Fonts: Inter + JetBrains Mono
UI components in `@/components/ui/` — always use these, never raw HTML inputs/buttons

### 8. Session persistence
Study + quiz sessions persist snapshots in `sessionStorage`. Always check sessionStorage first before fetching fresh data. Clear stale data when starting a new session.

### 9. No unused dependencies
`react-hook-form` and `framer-motion` are declared but NOT used. Forms use manual `useState`. Do not introduce them without explicit request.

### 10. Auth flow
`ProtectedRoute` checks: loading → login redirect → onboarding redirect → render.
`AuthBootstrap` restores session on mount.

## Git Rules

1. **Atomic commits** — one feature per commit, 3–10 files ideal, never bundle unrelated changes
2. **Conventional commits**: `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`
3. **No author attribution** in commit messages. No `Co-Authored-By`, no `--author`.
4. **Check for secrets** before committing (`.env`, keys, tokens)
5. **Stage only relevant files** — never `git add -A` or `git add .`
6. **No auto-push** — user reviews before pushing
7. After committing: report hash, message, and included files

## After Completing Tasks
- Run `pnpm lint` to verify code quality
- Ask: "Does CLAUDE.md need updating?" — if yes, update it
- Never commit unless explicitly asked

---

## Session Summary (2026-05-17)

### What we did
1. **Read CLAUDE.md** — nắm toàn bộ tech stack, architecture, conventions, routing, database schema
2. **Phân tích toàn bộ dự án** — khám phá sâu ~80+ source files:
   - 22 pages, 7 services, 4 stores, 6 type files, 7 utility files
   - 11 database tables (all RLS-enabled), 8 SQL migrations, 1 edge function
   - Luồng study session (flashcard 2 mặt, SRS, sessionStorage persistence, auto-play, view tracking batch RPC)
   - Luồng quiz session (true/false, sessionStorage persistence, score URL params)
   - Relationship system (6 loại, tự động 1 chiều / 2 chiều)
   - Dual-mode data layer (demo data khi không có Supabase)
   - Design system Neobrutalist (neo-card, neo-button, palette vàng/tím/navy)
3. **Tạo opencode.md** — tổng hợp các rule cốt lõi từ AGENTS.md + CLAUDE.md

### Current state
- File `opencode.md` đã có đầy đủ rule code + git + commands
- Đã thêm phần session summary để theo dõi tiến độ

### Next steps (suggested)
- [ ] Kiểm tra xem dự án đã chạy được chưa: `pnpm dev`
- [ ] Chạy test hiện có: `pnpm test`
- [ ] Review code quality: `pnpm lint`
- [ ] Xác định task cụ thể tiếp theo (bug fix, feature mới, refactor...)
