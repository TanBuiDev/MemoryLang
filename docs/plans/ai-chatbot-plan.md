# Plan: MemoryLang AI Tutor

## Mục tiêu

Tích hợp AI Tutor vào MemoryLang để học viên luyện hội thoại bằng ngôn ngữ đang học, nhận sửa lỗi nhẹ nhàng, và được cá nhân hóa bằng từ vựng đã học. Plan này bám theo kiến trúc hiện tại của MemoryLang: React 19 + Supabase Edge Functions + PostgreSQL/RLS + subscription Free/Pro.

### Mục tiêu CV

- AI provider integration: ưu tiên Gemini/Vertex AI trong thời gian Google Cloud free trial, giữ OpenAI Responses API làm fallback.
- Prompt engineering: persona, language policy, correction style, RAG context.
- Supabase Edge Function bảo mật API key server-side.
- RAG cơ bản từ `user_terms` + `global_terms`.
- Conversation persistence với PostgreSQL, RLS, và kiểm thử isolation.
- Cost control: quota theo Free/Pro, rate limiting, input/output caps, provider switch để tận dụng free trial.
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
- Chưa dùng provider-hosted conversation state; MemoryLang tự lưu message history để giữ quyền kiểm soát dữ liệu.
- Chưa cho AI ghi vocabulary/deck trực tiếp. Gợi ý từ mới có thể là phase sau với confirm UI riêng.

---

## Tech Stack

| Thành phần | Công nghệ |
|------------|-----------|
| LLM Provider | Provider abstraction: `gemini` via Google Cloud/Vertex AI first, `openai` fallback |
| Model | `GEMINI_CHAT_MODEL` / `OPENAI_CHAT_MODEL` env vars; verify current availability before deploy |
| Backend | Supabase Edge Function (Deno) |
| Frontend | React 19 + TypeScript |
| Server state | TanStack React Query |
| Local UI state | Zustand `useChatStore` cho active session/draft/sidebar |
| Database | PostgreSQL/Supabase, 3 bảng mới |
| Auth | Supabase JWT, `auth.getUser()` trong Edge Function |
| API Key | `GEMINI_API_KEY` or Vertex credentials / `OPENAI_API_KEY` only in Supabase Edge Function secrets |

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
    ├── Call configured AI provider (Gemini first during Google Cloud trial, OpenAI fallback)
    ├── Save assistant message + usage event
    └── Return assistant message DTO
```

### Key decisions

- **Provider abstraction first**: Implement a small provider interface so the Edge Function can use Gemini/Vertex AI while Google Cloud free-trial credits are active, then switch to OpenAI or another provider without rewriting chat persistence/UI.
- **No hard-coded model**: Do not hard-code `gpt-4o-mini` or any Gemini model. Use `AI_PROVIDER`, `GEMINI_CHAT_MODEL`, and `OPENAI_CHAT_MODEL`; document the tested model in deployment notes.
- **Manual conversation persistence**: Store chat history in Supabase tables; do not rely on provider-side state for product history.
- **Service role only after auth**: Edge Function may use `SUPABASE_SERVICE_ROLE_KEY`, but only after `auth.getUser()` succeeds and every query is scoped to that `user.id`.
- **Quota first**: Add usage tracking before enabling the UI, because AI features carry direct variable cost.
- **MVP non-streaming**: Return one assistant response per request. Add streaming in a later phase if UX needs it.
- **Free-trial guardrails**: Add Google Cloud budget alerts and keep Gemini usage behind quota/admin beta until costs are understood.

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
  provider text not null check (provider in ('gemini', 'openai')),
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
| 2 | `supabase/functions/ai-chat/index.ts` | NEW | Edge Function: auth, quota, RAG, provider dispatch, persistence |
| 3 | `supabase/functions/ai-chat/ai-providers.ts` | NEW | Provider interface + Gemini/OpenAI implementations |
| 4 | `supabase/functions/ai-chat/prompt.ts` | NEW | Prompt builder and bounded history/RAG formatter |
| 5 | `src/types/chat.types.ts` | NEW | `ChatSession`, `ChatMessage`, request/response DTOs |
| 6 | `src/services/supabase/chat.service.ts` | NEW | Service object: sessions/messages/invoke Edge Function |
| 7 | `src/stores/useChatStore.ts` | NEW | Zustand store cho active session, sidebar, drafts |
| 8 | `src/pages/chat/ChatPage.tsx` | NEW | Main AI Tutor UI |
| 9 | `src/pages/chat/ChatPage.test.tsx` | NEW | Vitest tests cho UI flows |
| 10 | `src/app/routes.tsx` | EDIT | Lazy-load `ChatPage` bằng `lazyWithChunkRecovery()` |
| 11 | `src/components/layout/Header.tsx` | EDIT | Thêm nav item trong `mainNavItems` hoặc `moreDropdownItems` với icon `Bot` |
| 12 | `src/i18n/index.ts` | EDIT | Thêm `nav.aiTutor`/`chat.*` keys cho `vi` và `en` |
| 13 | `scripts/sync-secrets.mjs` | EDIT | Allowlist `AI_PROVIDER`, `GEMINI_API_KEY`, `GEMINI_CHAT_MODEL`, `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL` |
| 14 | `.env.example` | EDIT | Thêm provider env vars và ghi rõ Gemini/Google Cloud trial path |
| 15 | `CLAUDE.md` | EDIT | Sau khi triển khai, cập nhật Edge Functions count và AI Tutor behavior |

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
  },
  "usage": {
    "provider": "gemini",
    "model": "configured-model",
    "inputTokens": 800,
    "outputTokens": 180
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
| `AI_SERVICE_UNAVAILABLE` | 503 | Configured AI provider failed or timed out |

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

### AI provider interface

Keep provider calls server-side and hidden behind one interface:

```ts
export type AiProviderName = 'gemini' | 'openai'

export interface AiChatInput {
  systemPrompt: string
  history: Array<{ role: 'user' | 'assistant'; content: string }>
  message: string
  userId: string
}

export interface AiChatOutput {
  text: string
  model: string
  inputTokens: number
  outputTokens: number
  provider: AiProviderName
}

export interface AiProvider {
  name: AiProviderName
  generate(input: AiChatInput): Promise<AiChatOutput>
}
```

### Gemini provider (primary during Google Cloud free trial)

Use Gemini first while Google Cloud free-trial credits are available. Prefer the simplest API key path for MVP unless Vertex AI IAM is specifically needed. Store `GEMINI_API_KEY` and `GEMINI_CHAT_MODEL` as Supabase Edge Function secrets.

```ts
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        ...history.map((item) => ({
          role: item.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: item.content }],
        })),
        {
          role: 'user',
          parts: [{ text: message }],
        },
      ],
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
      },
    }),
  },
)
```

Implementation must parse `candidates[0].content.parts[].text` defensively and capture token usage metadata when the API returns it.

### OpenAI provider (fallback)

Use OpenAI Responses API only when `AI_PROVIDER=openai` or Gemini is intentionally disabled. Keep provider request server-side.

```ts
const model = Deno.env.get('OPENAI_CHAT_MODEL')
if (!model) {
  throw new Error('OPENAI_CHAT_MODEL is required when AI_PROVIDER=openai')
}

const response = await fetch('https://api.openai.com/v1/responses', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${openAiApiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model,
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

### Provider selection

```ts
const providerName = (Deno.env.get('AI_PROVIDER') ?? 'gemini').toLowerCase()
const provider = providerName === 'openai'
  ? createOpenAiProvider()
  : createGeminiProvider()
```

Do not silently fall back across providers in production if one provider fails; return `AI_SERVICE_UNAVAILABLE`. Silent fallback can hide cost spikes and complicate debugging.

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
3. If count >= limit, return 429 before calling the configured provider.
4. Insert failed usage events for provider failures with `request_status = 'failed'`, but do not decrement user quota.

### Persistence order

1. Create session if `sessionId` is null.
2. Validate existing session ownership if `sessionId` is provided.
3. Save user message.
4. Call configured AI provider.
5. Save assistant message.
6. Update `chat_sessions.message_count`, `last_message_at`, and title if default.
7. Insert usage event.

If the provider fails after user message is saved, keep the user message and return error with a retry option. UI can show unsent assistant state.

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
| `chat.demoNotice` | Gia sư AI cần kết nối Supabase và nhà cung cấp AI. | AI Tutor requires Supabase and an AI provider. |
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

Use local function tests or scripted curl with mocked provider responses if practical.

Required cases:

- Missing auth returns 401.
- Empty message returns 400.
- Message over 1000 chars returns 400.
- User cannot send to another user's session.
- Free quota exceeded returns 429 before the configured provider call.
- Configured AI provider failure returns 503 and stores failed usage event.
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
| 0 | Verify Gemini API/GCP budget alerts, optional OpenAI fallback, and Supabase CLI commands; create migration with CLI | docs/env notes | 0.25 ngày |
| 1 | DB migration + RLS + basic type definitions | migration, `chat.types.ts` | 0.75 ngày |
| 2 | Edge Function MVP: auth, validation, quota, RAG, Gemini/OpenAI provider abstraction, persistence | `ai-chat/index.ts`, `ai-providers.ts`, `prompt.ts`, `.env.example`, `sync-secrets.mjs` | 1.5 ngày |
| 3 | Service/store + React Query contracts | `chat.service.ts`, `useChatStore.ts` | 0.5 ngày |
| 4 | Chat page UI + route/nav/i18n | `ChatPage.tsx`, `routes.tsx`, `Header.tsx`, `i18n/index.ts` | 1.25 ngày |
| 5 | Tests + edge-case polish | tests, error states, demo/offline mode | 0.75 ngày |
| 6 | Deploy + remote verification | migration push, secrets sync, function deploy | 0.5 ngày |

**Tổng: ~5.25 ngày**

---

## Deployment

```bash
# 1. Create migration with real timestamp
npx supabase migration new create_ai_chat_tables

# 2. Apply schema locally/remotely only after review
npx supabase db push --project-ref brwvbpkgimhamivmaflu

# 3. Add provider secrets to .env, then sync
pnpm sync:secrets

# 4. Deploy Edge Function
npx supabase functions deploy ai-chat --project-ref brwvbpkgimhamivmaflu

# 5. Verify in app
pnpm tsc -b
pnpm test -- ChatPage
```

### Environment variables

```env
# Primary path while Google Cloud free trial is active
AI_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-api-key
GEMINI_CHAT_MODEL=gemini-flash-or-flash-lite-model-you-tested

# Optional fallback path after/alongside free trial
OPENAI_API_KEY=
OPENAI_CHAT_MODEL=
```

Update `scripts/sync-secrets.mjs` so only server-side keys are synced to Supabase Edge Function secrets. Do not prefix provider keys with `VITE_`.

### Google Cloud free-trial setup

- Create budget alerts in Google Cloud before enabling Gemini/Vertex usage.
- Prefer Gemini API key for the Supabase Edge Function MVP because it avoids running another backend just for IAM token exchange.
- If using Vertex AI instead of Gemini Developer API, document the auth path separately; do not put raw service account JSON in frontend code.
- Keep AI Tutor behind admin/beta or low Free quota until real token usage is measured.
- Track usage in `chat_usage_events` and compare it with Google Cloud billing daily during the trial.

Remote verification checklist:

- `/app/chat` loads after production deploy and does not hit stale chunk errors.
- Signed-out request to `ai-chat` returns 401.
- Signed-in Free user can send up to daily limit.
- Another user's session ID returns 404/403.
- `chat_usage_events` records provider/model/token metadata.
- `GEMINI_API_KEY`, `OPENAI_API_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are absent from frontend bundle/env output.

---

## Security & Privacy

- Never expose `GEMINI_API_KEY`, `OPENAI_API_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` to the frontend.
- Edge Function must verify user with `auth.getUser()` before service-role queries.
- Use ownership checks even when RLS exists because service role bypasses RLS.
- Do not include email, payment data, admin flags, or unrelated profile data in prompts.
- RAG context should include only vocabulary text, translation, status, POS/tags.
- Keep prompt context bounded: last 12 messages and at most 30 vocabulary terms.
- Set request timeout for each provider call, e.g. 20 seconds.
- Add quota before public release.
- Avoid logging full user messages in Edge Function logs; log request IDs/error codes only.

---

## Cost Strategy

- **During Google Cloud trial**: set `AI_PROVIDER=gemini`, keep daily quota low, and watch Google Cloud billing/usage daily.
- **After trial**: either keep Gemini with paid billing, switch to OpenAI via `AI_PROVIDER=openai`, or restrict AI Tutor to admin/Pro only.
- **Hard caps in app**: daily quota is enforced before provider calls, independent of provider-side quota.
- **Context caps**: last 12 messages and 30 vocabulary terms are maximums, not defaults; reduce to 6 messages and 10-20 terms if token usage is high.
- **No silent provider fallback**: switching providers should be a deliberate config change to avoid accidental double billing.
- **Demo mode**: offline/free public demos can use canned responses without provider calls.

---

## Future Enhancements

- Streaming response with `ReadableStream` once MVP is stable.
- Suggested vocabulary extraction with explicit user confirmation.
- Conversation modes: travel, interview, TOEIC speaking, daily chat.
- Voice practice with browser speech recognition, Gemini Live, or OpenAI Realtime API after text MVP is cost-stable.
- Pro-only advanced tutor modes with longer context and grammar summaries.
- Optional embeddings/vector search if SQL retrieval stops being enough.

---

## CV Bullet Points

- Built an AI language tutor with a provider-agnostic Gemini/OpenAI integration layer and Supabase Edge Functions, keeping provider credentials server-side and user data isolated with RLS plus explicit ownership checks.
- Designed a lightweight RAG pipeline over learner vocabulary to personalize conversation practice without introducing vector infrastructure prematurely.
- Implemented quota-aware AI usage tracking for Free/Pro subscription tiers to control LLM cost in production.
- Developed a responsive React chat interface with persisted multi-session history, robust error states, and localized Vietnamese/English UI.
