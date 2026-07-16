# Plan: MemoryLang AI Tutor

## Mục tiêu

Tích hợp AI Tutor vào MemoryLang để học viên luyện hội thoại bằng ngôn ngữ đang học, nhận sửa lỗi nhẹ nhàng, và được cá nhân hóa bằng từ vựng đã học. Plan này bám theo kiến trúc hiện tại của MemoryLang: React 19 + Supabase Edge Functions + PostgreSQL/RLS + subscription Free/Pro.

### Mục tiêu CV

- OpenAI Responses API integration cho workflow hội thoại mới.
- Prompt engineering: persona, language policy, correction style, RAG context.
- Supabase Edge Function bảo mật API key server-side.
- RAG cơ bản từ `user_terms` + `global_terms`.
- Conversation persistence với PostgreSQL, RLS, và kiểm thử isolation.
- Cost control: quota theo Free/Pro, rate limiting, input/output caps.
- Frontend UX: chat UI responsive, history, optimistic state, error states.

### Mục tiêu sản phẩm

- Học viên chat 2 chiều bằng target language hiện tại, mặc định English.
- AI đóng vai language practice partner, trả lời ngắn, tự nhiên, không biến thành bài giảng dài.
- AI dùng vocabulary gần đây/khó/đến hạn ôn để gợi câu hỏi và ví dụ cá nhân hóa.
- Lưu lịch sử nhiều session, xem lại, đổi tên/xóa session.
- Free user có quota giới hạn để demo giá trị; Pro user có quota cao hơn.

### Ngoài phạm vi MVP

- Chưa làm voice realtime, speech-to-speech, hoặc audio streaming.
- Chưa tự động cập nhật SRS từ nội dung chat.
- Chưa dùng vector database/embedding search; MVP dùng SQL retrieval có giới hạn.
- Chưa dùng OpenAI hosted conversation state; MemoryLang tự lưu message history để giữ quyền kiểm soát dữ liệu.
- Chưa cho AI ghi vocabulary/deck trực tiếp. Gợi ý từ mới có thể là phase sau với confirm UI riêng.

---

## Tech Stack

| Thành phần | Công nghệ |
|------------|-----------|
| LLM Provider | OpenAI Responses API |
| Model | `OPENAI_CHAT_MODEL` env var; đề xuất model chi phí thấp trong model family hiện hành, verify trước khi deploy |
| Backend | Supabase Edge Function (Deno) |
| Frontend | React 19 + TypeScript |
| Server state | TanStack React Query |
| Local UI state | Zustand `useChatStore` cho active session/draft/sidebar |
| Database | PostgreSQL/Supabase, 3 bảng mới |
| Auth | Supabase JWT, `auth.getUser()` trong Edge Function |
| API Key | `OPENAI_API_KEY` chỉ lưu trong Supabase Edge Function secrets |

---

## Kiến trúc tổng quan

```
[ChatPage.tsx]
    ↓ chatService.sendMessage()
[supabase.functions.invoke('ai-chat')]
    ↓ Authorization: Bearer <user access token>
[supabase/functions/ai-chat/index.ts]
    ├── OPTIONS/CORS
    ├── Validate body with action = 'send-message'
    ├── Verify user via Supabase anon client auth.getUser()
    ├── Load subscription/quota and session ownership
    ├── Retrieve bounded RAG context from user_terms + global_terms
    ├── Load last N chat messages for the same owned session
    ├── Save user message
    ├── Call OpenAI Responses API
    ├── Save assistant message + usage event
    └── Return assistant message DTO
```

### Key decisions

- **Use Responses API for new work**: OpenAI docs currently recommend Responses API for direct model requests and new agentic/multiturn apps. Chat Completions remains supported, but this plan should not start on the older API surface.
- **No hard-coded old model**: Do not hard-code `gpt-4o-mini`. Use `OPENAI_CHAT_MODEL`; set a documented default only after verifying current account availability.
- **Manual conversation persistence**: Store chat history in Supabase tables; do not rely on provider-side state for product history.
- **Service role only after auth**: Edge Function may use `SUPABASE_SERVICE_ROLE_KEY`, but only after `auth.getUser()` succeeds and every query is scoped to that `user.id`.
- **Quota first**: Add usage tracking before enabling the UI, because AI features carry direct variable cost.
- **MVP non-streaming**: Return one assistant response per request. Add streaming in a later phase if UX needs it.

---

## Database Changes

Create a migration with `npx supabase migration new create_ai_chat_tables`; do not invent a timestamp manually. The examples below are the target SQL body.

### Table: `chat_sessions`

```sql
create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'New Chat',
  source_language text not null default 'en',
  native_language text not null default 'vi',
  message_count int not null default 0,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index chat_sessions_user_updated_idx
  on public.chat_sessions(user_id, updated_at desc);

create trigger chat_sessions_updated_at
  before update on public.chat_sessions
  for each row execute function public.set_updated_at();

alter table public.chat_sessions enable row level security;

create policy "chat_sessions select own"
  on public.chat_sessions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "chat_sessions insert own"
  on public.chat_sessions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "chat_sessions update own"
  on public.chat_sessions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "chat_sessions delete own"
  on public.chat_sessions for delete
  to authenticated
  using ((select auth.uid()) = user_id);
```

### Table: `chat_messages`

```sql
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  model text,
  input_tokens int,
  output_tokens int,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index chat_messages_session_created_idx
  on public.chat_messages(session_id, created_at);

create index chat_messages_user_created_idx
  on public.chat_messages(user_id, created_at desc);

alter table public.chat_messages enable row level security;

create policy "chat_messages select own"
  on public.chat_messages for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "chat_messages insert own"
  on public.chat_messages for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.chat_sessions cs
      where cs.id = chat_messages.session_id
        and cs.user_id = (select auth.uid())
    )
  );

create policy "chat_messages delete own"
  on public.chat_messages for delete
  to authenticated
  using ((select auth.uid()) = user_id);
```

### Table: `chat_usage_events`

```sql
create table public.chat_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.chat_sessions(id) on delete set null,
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  request_status text not null check (request_status in ('succeeded', 'failed')),
  error_code text,
  created_at timestamptz not null default now()
);

create index chat_usage_events_user_created_idx
  on public.chat_usage_events(user_id, created_at desc);

alter table public.chat_usage_events enable row level security;

create policy "chat_usage_events select own"
  on public.chat_usage_events for select
  to authenticated
  using ((select auth.uid()) = user_id);
```

### Database notes

- `chat_messages.user_id` is intentionally duplicated for simpler RLS and faster user-scoped queries.
- Do not allow `system` role messages from the client. System/developer instructions are built inside the Edge Function only.
- Edge Function writes usage events with service role. Client can read own usage later for quota UI, but cannot insert/update usage.
- If these tables are exposed through PostgREST, RLS remains mandatory and policies must use `TO authenticated` plus ownership predicates.

---

## Files Cần Tạo/Sửa

| # | File | Loại | Mô tả |
|---|------|------|-------|
| 1 | `supabase/migrations/<generated>_create_ai_chat_tables.sql` | NEW | Tạo `chat_sessions`, `chat_messages`, `chat_usage_events`, indexes, RLS |
| 2 | `supabase/functions/ai-chat/index.ts` | NEW | Edge Function: auth, quota, RAG, Responses API, persistence |
| 3 | `src/types/chat.types.ts` | NEW | `ChatSession`, `ChatMessage`, request/response DTOs |
| 4 | `src/services/supabase/chat.service.ts` | NEW | Service object: sessions/messages/invoke Edge Function |
| 5 | `src/stores/useChatStore.ts` | NEW | Zustand store cho active session, sidebar, drafts |
| 6 | `src/pages/chat/ChatPage.tsx` | NEW | Main AI Tutor UI |
| 7 | `src/pages/chat/ChatPage.test.tsx` | NEW | Vitest tests cho UI flows |
| 8 | `src/app/routes.tsx` | EDIT | Lazy-load `ChatPage` bằng `lazyWithChunkRecovery()` |
| 9 | `src/components/layout/Header.tsx` | EDIT | Thêm nav item trong `mainNavItems` hoặc `moreDropdownItems` với icon `Bot` |
| 10 | `src/i18n/index.ts` | EDIT | Thêm `nav.aiTutor`/`chat.*` keys cho `vi` và `en` |
| 11 | `scripts/sync-secrets.mjs` | EDIT | Allowlist `OPENAI_API_KEY` và `OPENAI_CHAT_MODEL` nếu dùng secret/model env cho Edge Function |
| 12 | `.env.example` | EDIT | Thêm `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL` |
| 13 | `CLAUDE.md` | EDIT | Sau khi triển khai, cập nhật Edge Functions count và AI Tutor behavior |

---

## API Contract

### Edge Function request

```json
{
  "action": "send-message",
  "sessionId": "uuid-or-null",
  "message": "Can we practice ordering coffee?",
  "sourceLanguage": "en",
  "nativeLanguage": "vi"
}
```

### Edge Function response

```json
{
  "session": {
    "id": "uuid",
    "title": "Ordering coffee",
    "source_language": "en",
    "native_language": "vi",
    "message_count": 2,
    "last_message_at": "2026-07-16T10:00:00Z"
  },
  "userMessage": {
    "id": "uuid",
    "role": "user",
    "content": "Can we practice ordering coffee?",
    "created_at": "2026-07-16T10:00:00Z"
  },
  "assistantMessage": {
    "id": "uuid",
    "role": "assistant",
    "content": "Sure. Let's practice a short cafe conversation...",
    "created_at": "2026-07-16T10:00:02Z"
  },
  "quota": {
    "remainingToday": 19,
    "limitToday": 20
  }
}
```

### Error response shape

```json
{
  "error": {
    "code": "CHAT_QUOTA_EXCEEDED",
    "message": "Daily AI chat limit reached."
  }
}
```

Use stable error codes:

| Code | Status | Meaning |
|------|--------|---------|
| `UNAUTHORIZED` | 401 | Missing/invalid user session |
| `INVALID_REQUEST` | 400 | Bad action, invalid UUID, empty message, message too long |
| `SESSION_NOT_FOUND` | 404 | Session does not exist or does not belong to user |
| `CHAT_QUOTA_EXCEEDED` | 429 | User exceeded daily quota |
| `AI_SERVICE_UNAVAILABLE` | 503 | OpenAI request failed or timed out |

---

## Edge Function Design

### Validation

- `action` must be `send-message`.
- `message.trim().length` must be 1..1000.
- `sourceLanguage` and `nativeLanguage` must be valid app language codes.
- `sessionId` is optional; if present, validate UUID format and ownership.
- Reject client-supplied role/system prompt content. Only plain user text enters the model input.

### Auth and ownership

Use two clients:

1. `supabaseUser` with `SUPABASE_ANON_KEY` and incoming `Authorization` header to call `auth.getUser()`.
2. `supabaseAdmin` with `SUPABASE_SERVICE_ROLE_KEY` only after user is verified.

Every admin query must include `user_id = user.id` or validate ownership through `chat_sessions.user_id`.

### RAG retrieval SQL

Retrieve a small, bounded list. Favor recent, difficult, due, and memorized terms. Avoid loading all vocabulary because PostgREST defaults and cost both matter.

```ts
const { data: vocab } = await supabaseAdmin
  .from('user_terms')
  .select(`
    id,
    status,
    correct_count,
    wrong_count,
    last_reviewed_at,
    next_review_at,
    global_terms!fk_user_terms_global_term (
      source_text,
      translation,
      part_of_speech,
      tags
    )
  `)
  .eq('user_id', user.id)
  .is('deleted_at', null)
  .order('last_reviewed_at', { ascending: false, nullsFirst: false })
  .limit(30)
```

If this query becomes too blunt, create a Postgres RPC later. MVP should stay SQL/simple.

### Prompt template

```text
You are MemoryLang AI Tutor, a friendly language practice partner.

Learner profile:
- Native language: {nativeLanguage}
- Target language: {sourceLanguage}

Teaching style:
- Reply primarily in the target language.
- Keep the response short: 2-4 natural sentences.
- Ask exactly one follow-up question unless the user asks for explanation.
- If the learner makes a grammar or word-choice mistake, include one gentle correction in parentheses.
- Use Vietnamese only for brief clarification when the learner appears confused or explicitly asks.
- Do not claim you saved progress, changed vocabulary, or updated SRS.

Recent learner vocabulary, for natural use when relevant:
{vocabularyBullets}
```

### Responses API call

Use HTTP fetch from the Edge Function. Keep provider request server-side.

```ts
const response = await fetch('https://api.openai.com/v1/responses', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${openAiApiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: Deno.env.get('OPENAI_CHAT_MODEL') ?? 'gpt-5.6-luna',
    instructions: systemPrompt,
    input: [
      ...historyItems,
      {
        role: 'user',
        content: [{ type: 'input_text', text: message }],
      },
    ],
    max_output_tokens: 500,
    temperature: 0.7,
    safety_identifier: user.id,
  }),
})
```

Implementation must parse the response defensively and extract the assistant text from output message content. If the selected model does not support `temperature`, remove that parameter during implementation and document the model-specific adjustment.

### Quota and rate limit

Use `chat_usage_events` for daily counts:

| User tier | MVP daily limit | Notes |
|-----------|-----------------|-------|
| Free | 10 assistant replies/day | Enough for discovery; encourages upgrade |
| Pro | 100 assistant replies/day | Controlled cost ceiling |
| Admin | 200 assistant replies/day | Internal testing |

Quota logic:

1. Determine Pro/admin state using existing subscription/profile data.
2. Count `chat_usage_events` for `created_at >= startOfToday` and `request_status = 'succeeded'`.
3. If count >= limit, return 429 before calling OpenAI.
4. Insert failed usage events for OpenAI failures with `request_status = 'failed'`, but do not decrement user quota.

### Persistence order

1. Create session if `sessionId` is null.
2. Validate existing session ownership if `sessionId` is provided.
3. Save user message.
4. Call OpenAI.
5. Save assistant message.
6. Update `chat_sessions.message_count`, `last_message_at`, and title if default.
7. Insert usage event.

If OpenAI fails after user message is saved, keep the user message and return error with a retry option. UI can show unsent assistant state.

---

## Frontend Design

### Route and navigation

- Add `const ChatPage = lazyWithChunkRecovery(() => import('@/pages/chat/ChatPage'))` in `src/app/routes.tsx`.
- Render it inside `React.Suspense` with `AppLoading`.
- Add route `{ path: 'chat', element: <ChatPage /> }`.
- Add `Bot` icon nav item in `Header.tsx`. If top nav is too crowded, put AI Tutor in `moreDropdownItems`.
- Add `/app/chat` to protected app routes only; no public chatbot route in MVP.

### Service layer

Components must not call Supabase directly. Add `chatService`:

```ts
export const chatService = {
  listSessions(userId: string): Promise<ChatSession[]>,
  createSession(input: CreateChatSessionInput): Promise<ChatSession>,
  renameSession(sessionId: string, title: string): Promise<void>,
  deleteSession(sessionId: string): Promise<void>,
  listMessages(sessionId: string): Promise<ChatMessage[]>,
  sendMessage(input: SendChatMessageInput): Promise<SendChatMessageResponse>,
}
```

React Query keys:

- `['chat-sessions', user?.id]`
- `['chat-messages', sessionId]`
- `['chat-quota', user?.id]` if quota endpoint is added later

### UI requirements

- Use `Button` from `@/components/ui/button` for visible actions.
- Use `ConfirmModal` for deleting sessions; never use `window.confirm`.
- Use existing `Textarea`, `Input`, `Badge`, `Card` or `neo-card` patterns where appropriate.
- Desktop: two-column layout with session list and chat panel.
- Mobile: session list opens as drawer/panel; input remains reachable without overlap.
- Message bubbles must have stable max width and wrap long words.
- Send behavior: `Enter` sends, `Shift+Enter` inserts newline.
- Disable send while pending, but preserve draft on failure.
- Demo/offline mode: show a clear server-required state and optionally canned local responses; do not pretend AI is live.

### i18n keys

Add both Vietnamese and English keys:

| Key | Vietnamese | English |
|-----|------------|---------|
| `nav.aiTutor` | Gia sư AI | AI Tutor |
| `chat.title` | Gia sư AI | AI Tutor |
| `chat.newSession` | Cuộc trò chuyện mới | New chat |
| `chat.renameSession` | Đổi tên cuộc trò chuyện | Rename chat |
| `chat.placeholder` | Nhập tin nhắn... | Type a message... |
| `chat.send` | Gửi | Send |
| `chat.empty` | Bắt đầu luyện {language} với AI. | Start practicing {language} with AI. |
| `chat.emptySession` | Hãy gửi tin nhắn đầu tiên. | Send the first message. |
| `chat.demoNotice` | Gia sư AI cần kết nối Supabase và OpenAI. | AI Tutor requires Supabase and OpenAI. |
| `chat.deleteSession` | Xóa cuộc trò chuyện này? | Delete this chat? |
| `chat.deleteDescription` | Tin nhắn trong cuộc trò chuyện này sẽ bị xóa vĩnh viễn. | Messages in this chat will be permanently deleted. |
| `chat.deleteConfirm` | Xóa | Delete |
| `chat.sending` | Đang gửi... | Sending... |
| `chat.errorGeneric` | Đã xảy ra lỗi. Vui lòng thử lại. | Something went wrong. Please try again. |
| `chat.errorAI` | AI đang không khả dụng. Vui lòng thử lại sau. | AI is unavailable. Please try again later. |
| `chat.quotaReached` | Bạn đã dùng hết lượt chat hôm nay. | You have used today’s chat limit. |
| `chat.upgradeForMore` | Nâng cấp Pro để có thêm lượt chat. | Upgrade to Pro for more chat messages. |
| `chat.sessionList` | Lịch sử trò chuyện | Chat history |

---

## Testing Strategy

### Database/RLS tests

- User A can CRUD own `chat_sessions`.
- User A cannot select/update/delete User B sessions.
- User A can read messages only when `chat_messages.user_id = auth.uid()`.
- Client cannot insert `chat_usage_events`.
- Deleting session cascades messages.

### Edge Function tests

Use local function tests or scripted curl with mocked OpenAI response if practical.

Required cases:

- Missing auth returns 401.
- Empty message returns 400.
- Message over 1000 chars returns 400.
- User cannot send to another user's session.
- Free quota exceeded returns 429 before OpenAI fetch.
- OpenAI failure returns 503 and stores failed usage event.
- Successful send stores user message, assistant message, updates session, stores usage.

### Frontend tests

- Empty state renders for no session.
- New chat sends first message and shows assistant response.
- Delete session opens `ConfirmModal`.
- `Enter` sends and `Shift+Enter` does not send.
- Quota error shows upgrade CTA for Free users.
- Demo mode shows `chat.demoNotice`.

Verification commands:

```bash
pnpm test -- ChatPage
pnpm test -- chat.service
pnpm tsc -b
pnpm lint
```

---

## Implementation Phases

| Phase | Nội dung | Files | Thời gian |
|-------|----------|-------|-----------|
| 0 | Verify OpenAI model/API and Supabase CLI commands; create migration with CLI | docs/env notes | 0.25 ngày |
| 1 | DB migration + RLS + basic type definitions | migration, `chat.types.ts` | 0.75 ngày |
| 2 | Edge Function MVP: auth, validation, quota, RAG, Responses API, persistence | `ai-chat/index.ts`, `.env.example`, `sync-secrets.mjs` | 1.25 ngày |
| 3 | Service/store + React Query contracts | `chat.service.ts`, `useChatStore.ts` | 0.5 ngày |
| 4 | Chat page UI + route/nav/i18n | `ChatPage.tsx`, `routes.tsx`, `Header.tsx`, `i18n/index.ts` | 1.25 ngày |
| 5 | Tests + edge-case polish | tests, error states, demo/offline mode | 0.75 ngày |
| 6 | Deploy + remote verification | migration push, secrets sync, function deploy | 0.5 ngày |

**Tổng: ~5 ngày**

---

## Deployment

```bash
# 1. Create migration with real timestamp
npx supabase migration new create_ai_chat_tables

# 2. Apply schema locally/remotely only after review
npx supabase db push --project-ref brwvbpkgimhamivmaflu

# 3. Add secrets to .env, then sync
pnpm sync:secrets

# 4. Deploy Edge Function
npx supabase functions deploy ai-chat --project-ref brwvbpkgimhamivmaflu

# 5. Verify in app
pnpm tsc -b
pnpm test -- ChatPage
```

Remote verification checklist:

- `/app/chat` loads after production deploy and does not hit stale chunk errors.
- Signed-out request to `ai-chat` returns 401.
- Signed-in Free user can send up to daily limit.
- Another user's session ID returns 404/403.
- `chat_usage_events` records model/token metadata.
- `OPENAI_API_KEY` is absent from frontend bundle/env output.

---

## Security & Privacy

- Never expose `OPENAI_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` to the frontend.
- Edge Function must verify user with `auth.getUser()` before service-role queries.
- Use ownership checks even when RLS exists because service role bypasses RLS.
- Do not include email, payment data, admin flags, or unrelated profile data in prompts.
- RAG context should include only vocabulary text, translation, status, POS/tags.
- Keep prompt context bounded: last 12 messages and at most 30 vocabulary terms.
- Set request timeout for OpenAI fetch, e.g. 20 seconds.
- Add quota before public release.
- Avoid logging full user messages in Edge Function logs; log request IDs/error codes only.

---

## Future Enhancements

- Streaming response with `ReadableStream` once MVP is stable.
- Suggested vocabulary extraction with explicit user confirmation.
- Conversation modes: travel, interview, TOEIC speaking, daily chat.
- Voice practice with browser speech recognition or OpenAI Realtime API.
- Pro-only advanced tutor modes with longer context and grammar summaries.
- Optional embeddings/vector search if SQL retrieval stops being enough.

---

## CV Bullet Points

- Built an AI language tutor using OpenAI Responses API and Supabase Edge Functions, keeping provider credentials server-side and user data isolated with RLS plus explicit ownership checks.
- Designed a lightweight RAG pipeline over learner vocabulary to personalize conversation practice without introducing vector infrastructure prematurely.
- Implemented quota-aware AI usage tracking for Free/Pro subscription tiers to control LLM cost in production.
- Developed a responsive React chat interface with persisted multi-session history, robust error states, and localized Vietnamese/English UI.
