# AI Tutor Grounded Tools and Curriculum RAG Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make AI Tutor answer learner-specific questions from verified Supabase data first, then add citation-backed vector retrieval for accessible curriculum content.

**Architecture:** Phase 1 adds a server-side tool loop to `ai-chat`: Gemini chooses a read-only learning-data tool, the Edge Function executes it for the authenticated user, then Gemini receives the result and writes a grounded answer. Phase 2 adds a normalized curriculum document/chunk store, embeddings, and filtered vector retrieval; retrieved chunks are evidence for lesson questions, never a substitute for learner statistics.

**Tech Stack:** React 19, TypeScript, Supabase PostgreSQL/RLS/RPC/Edge Functions, Gemini function calling, `pgvector`, Supabase Edge Runtime embeddings (`gte-small`, subject to deployment spike), Vitest, Deno tests.

## Implementation Status (2026-07-19)

- [x] Chunk 1 deployed: six JWT-scoped, read-only SQL tools; Gemini native function-calling; bounded two-tool loop; persisted evidence metadata; and evidence badges in chat.
- [x] Supabase migrations `20260719082407_ai_tutor_grounding.sql` and `20260719083507_add_ai_chat_message_metadata.sql` applied to production; `ai-chat` and Cloudflare Pages deployed.
- [ ] Phase gate remains: run the listed factual acceptance prompts with real Free and Pro accounts, compare results with direct database data, and collect latency/token usage across at least 20 grounded production turns.
- [ ] Chunk 2 vector RAG has not started. It remains intentionally blocked by the Phase 1 gate.

---

## Why This Plan Exists

The current AI Tutor only injects the 30 most recently reviewed vocabulary items into a prompt. It does not query aggregate learning statistics, due-review queues, or grammar lessons for a specific question. The model can therefore make plausible but unsupported claims such as a vocabulary count or the absence of grammar content.

This plan makes a hard distinction between two data classes:

| Data class | Examples | Grounding mechanism |
|---|---|---|
| Personal, transactional data | learned-word count, due reviews, difficult terms, owned decks | authenticated SQL tools/RPCs; never vector search |
| Curriculum knowledge | grammar explanations, lesson blocks, TOEIC guidance | vector RAG with source citations after Phase 1 |

`grammar_topics` and `lesson_blocks` represent available curriculum content, not completion history. Until a dedicated learner-grammar-progress model exists, the assistant must not claim that a user completed, mastered, or skipped a grammar lesson.

## Product Contract

### Grounding rules

1. Any user-specific number, status, review date, vocabulary list, deck list, or grammar availability claim must be returned by a server tool in the same response turn.
2. The assistant must not infer a count from the number of prompt items.
3. The final response persists a compact evidence payload in `chat_messages.metadata` and the UI renders human-readable source labels.
4. If a tool returns no rows, the answer states that no matching data is available; it does not invent an explanation.
5. RAG chunks are only used for curriculum explanations and must be filtered by the caller's current content entitlement before reaching the model.

### Supported Phase 1 questions

| Tool | Verified answer scope |
|---|---|
| `get_learning_overview` | total, memorized, difficult, due counts; deck count; quiz count; average accuracy |
| `get_review_queue` | bounded due/difficult vocabulary with source text, translation, status, next review |
| `search_my_vocabulary` | bounded exact/ILIKE lookup over the user's active vocabulary |
| `get_deck_overview` | owned decks and vocabulary counts |
| `list_grammar_topics` | grammar topics currently published and accessible to this user; no completion claims |
| `get_grammar_topic` | one accessible topic's title, category, level, and block summary |

## Deliberate Non-Goals

- No GraphRAG, knowledge graph extraction, entity community summaries, or LLM-Wiki in this plan.
- No model permission to mutate vocabulary, SRS, decks, or lessons.
- No learner grammar-completion claim until a future `user_grammar_progress` feature exists.
- No embedding/indexing of personal user data.
- No automatic embeddings for arbitrary uploads; only admin-managed Grammar content is indexed in Phase 2.

## File Map

| File | Change | Responsibility |
|---|---|---|
| `supabase/migrations/<generated>_ai_tutor_grounding.sql` | Create | read-only RPCs, grants, and security tests/fixtures where applicable |
| `supabase/functions/ai-chat/tool-definitions.ts` | Create | Gemini-compatible tool declarations and strict argument schemas |
| `supabase/functions/ai-chat/learning-tools.ts` | Create | authenticated, bounded tool executors and evidence DTOs |
| `supabase/functions/ai-chat/grounding.ts` | Create | model tool-call loop, allowlist dispatch, evidence collection, maximum-call guard |
| `supabase/functions/ai-chat/index.ts` | Modify | invoke the grounding loop and persist evidence metadata |
| `supabase/functions/ai-chat/ai-providers.ts` | Modify | Gemini response parsing for function calls/function responses; preserve OpenAI fallback behavior |
| `supabase/functions/ai-chat/prompt.ts` | Modify | factuality policy and curriculum citation policy |
| `supabase/functions/ai-chat/*.test.ts` | Create | Deno/Vitest-compatible unit tests for tool dispatch and fact-grounding behavior |
| `src/types/chat.types.ts` | Modify | typed assistant evidence/source DTOs |
| `src/services/supabase/chat.service.ts` | Modify | return persisted metadata without client-side privileged queries |
| `src/pages/chat/ChatPage.tsx` | Modify | render compact evidence labels below grounded assistant messages |
| `src/pages/chat/ChatPage.test.tsx` | Modify | verify evidence rendering and no-data behavior |
| `supabase/migrations/<generated>_add_curriculum_rag.sql` | Create later | `vector` extension, documents/chunks, indexes, RLS, retrieval RPC |
| `supabase/functions/index-curriculum-embeddings/index.ts` | Create later | admin-only/batched curriculum embedding generation and retries |
| `supabase/functions/ai-chat/curriculum-rag.ts` | Create later | query embedding generation, retrieval, citation DTO conversion |
| `src/components/chat/MessageEvidence.tsx` | Create later | reusable evidence/citation presentation |

---

## Chunk 1: Verified Personal Learning Tools

### Task 1: Define the grounding protocol and tests

**Files:**
- Create: `supabase/functions/ai-chat/tool-definitions.ts`
- Create: `supabase/functions/ai-chat/grounding.test.ts`
- Modify: `supabase/functions/ai-chat/prompt.ts`

- [ ] **Step 1: Write failing tests for each accepted tool name and malformed tool arguments.**

```ts
expect(validateToolCall({ name: 'get_learning_overview', args: {} })).toEqual({ ok: true })
expect(validateToolCall({ name: 'delete_all_terms', args: {} })).toMatchObject({ ok: false })
```

- [ ] **Step 2: Run the focused test and confirm it fails because the grounding module does not exist.**

Run: `pnpm test -- grounding`

- [ ] **Step 3: Add a fixed allowlist of the six read-only tools and JSON schemas with bounded arguments.**

Use one `ToolCall` DTO with `name`, `args`, and a unique model call ID. `search_my_vocabulary` accepts only a trimmed query of 1..80 characters; queue/list operations accept a capped `limit` of 1..10.

- [ ] **Step 4: Add prompt policy that user-specific facts require a tool and that unavailable data must be stated plainly.**

Do not describe tools as able to change data. Do not put raw database errors in the prompt.

- [ ] **Step 5: Run the focused test and confirm it passes.**

Run: `pnpm test -- grounding`

- [ ] **Step 6: Commit the protocol and tests.**

```bash
git add supabase/functions/ai-chat/tool-definitions.ts supabase/functions/ai-chat/grounding.test.ts supabase/functions/ai-chat/prompt.ts
git commit -m "feat: define ai tutor grounding tools"
```

### Task 2: Add bounded, authenticated learning-data RPCs

**Files:**
- Create: `supabase/migrations/<generated>_ai_tutor_grounding.sql`
- Test: Supabase SQL Editor or local migration tests with two test users

- [ ] **Step 1: Create the migration with the Supabase CLI.**

Run: `npx supabase migration new ai_tutor_grounding`

- [ ] **Step 2: Write failing SQL verification queries for an owner and a second user.**

The test matrix must prove that every RPC reads `auth.uid()` internally, ignores any client-supplied user ID, returns no deleted vocabulary, and never leaks Pro curriculum to a Free user.

- [ ] **Step 3: Implement `get_ai_learning_overview()`.**

Return one JSON object built with count queries, not client-side arrays: total active vocabulary, memorized, difficult, review due at `now()`, deck count, quiz count, and average quiz accuracy. Define the function as `SECURITY INVOKER`; do not use service-role-only assumptions or a user ID parameter.

- [ ] **Step 4: Implement `get_ai_review_queue(p_kind text, p_limit int)`.**

Allow only `due` and `difficult`, clamp `p_limit` to 10, return only `source_text`, `translation`, `status`, and `next_review_at` from the caller's active `user_terms` joined to `global_terms`.

- [ ] **Step 5: Implement `search_ai_vocabulary(p_query text, p_limit int)` and `get_ai_deck_overview(p_limit int)`.**

Use case-insensitive matching against `source_text` and `translation`, clamp all limits, and return only the caller's non-deleted rows. Add indexes only after `EXPLAIN ANALYZE` demonstrates a need.

- [ ] **Step 6: Implement `list_ai_grammar_topics(p_limit int)` and `get_ai_grammar_topic(p_topic_id uuid)`.**

Use the authenticated caller and the existing access-tier/RLS rules. Return title/category/level/teaser-safe summary for list results. Return block text only for an accessible topic; never return exercises, listening transcripts, or Pro blocks to a Free caller.

- [ ] **Step 7: Revoke `EXECUTE` from `PUBLIC`, grant only to `authenticated`, and add `SET search_path = public` where required.**

This protects the RPC surface and prevents search-path hijacking. Verify every function handles a null `auth.uid()` by returning no data or raising a controlled authorization error.

- [ ] **Step 8: Apply the migration to a local/linked test database and execute owner/other-user queries.**

Run: `npx supabase db push --linked --dry-run`

Expected: only the new grounding migration is listed. Apply only after reviewing the generated SQL and test evidence.

- [ ] **Step 9: Commit the migration.**

```bash
git add supabase/migrations/<generated>_ai_tutor_grounding.sql
git commit -m "feat: add ai tutor learning data rpc tools"
```

### Task 3: Execute tools safely from the Edge Function

**Files:**
- Create: `supabase/functions/ai-chat/learning-tools.ts`
- Create: `supabase/functions/ai-chat/grounding.ts`
- Modify: `supabase/functions/ai-chat/index.ts`
- Test: `supabase/functions/ai-chat/learning-tools.test.ts`

- [ ] **Step 1: Write failing executor tests using a mocked authenticated Supabase user client.**

Cover valid dispatch, unknown tool rejection, maximum limit enforcement, tool error sanitization, and an evidence record for every successful tool.

- [ ] **Step 2: Implement a tool dispatcher with no dynamic SQL and no client-provided table or user ID.**

The dispatcher maps each allowlisted tool to `supabaseUser.rpc(...)`. It uses the authenticated user client constructed with the incoming JWT, not the service-role client, so existing RLS/content gating remains active.

- [ ] **Step 3: Implement an evidence DTO.**

```ts
type ChatEvidence = {
  kind: 'learning_overview' | 'review_queue' | 'vocabulary' | 'decks' | 'grammar_catalog' | 'grammar_topic'
  label: string
  retrievedAt: string
  itemCount?: number
  topicId?: string
}
```

Tool payloads go to Gemini only. Persist the DTO, not full private tool results, in `chat_messages.metadata.grounding`.

- [ ] **Step 4: Add a maximum of two read-only tool calls per message turn.**

Reject repeated calls, unrecognized calls, and oversized model arguments. If a tool fails, provide Gemini a structured `unavailable` tool result; never silently substitute guessed facts.

- [ ] **Step 5: Integrate the dispatcher after message validation and before assistant-message persistence.**

The existing user message remains persisted before a provider call failure. Use the verified `user.id` and the user-scoped client only for grounding RPCs.

- [ ] **Step 6: Run unit tests and lint the edited Edge Function files.**

Run: `pnpm test -- learning-tools grounding`

Expected: PASS.

- [ ] **Step 7: Commit the safe executor.**

```bash
git add supabase/functions/ai-chat/index.ts supabase/functions/ai-chat/learning-tools.ts supabase/functions/ai-chat/grounding.ts supabase/functions/ai-chat/learning-tools.test.ts
git commit -m "feat: ground ai tutor with learning tools"
```

### Task 4: Add Gemini tool-call round trips and OpenAI-safe behavior

**Files:**
- Modify: `supabase/functions/ai-chat/ai-providers.ts`
- Modify: `supabase/functions/ai-chat/grounding.ts`
- Test: `supabase/functions/ai-chat/ai-providers.test.ts`

- [ ] **Step 1: Write failing provider tests with Gemini responses containing text, one function call, malformed function call, and an empty candidate.**

- [ ] **Step 2: Extend the Gemini request with the Phase 1 function declarations.**

Parse every candidate part, not only `parts[0]`. Preserve model-generated call IDs so function responses can be correlated correctly.

- [ ] **Step 3: Implement the two-pass turn.**

First Gemini call uses `AUTO` mode. When it returns an allowed tool call, execute it, append a `functionResponse` part to the same conversation, then make one final Gemini call. The final call must be text-only; reject a second tool request after the two-call ceiling.

- [ ] **Step 4: Preserve non-tool conversational behavior.**

When Gemini returns normal text, use the existing one-call flow. Do not add tool declarations to the OpenAI path until a separate provider-compatibility task is planned; when `AI_PROVIDER=openai`, inject only the existing bounded vocabulary context and add a capability flag in the response metadata.

- [ ] **Step 5: Add a regression test for “How many words have I learned?”**

Mock `get_ai_learning_overview()` with a count that differs from any vocabulary prompt sample. Assert the final model prompt contains the RPC result and the persisted evidence has `kind: 'learning_overview'`.

- [ ] **Step 6: Run focused tests.**

Run: `pnpm test -- ai-providers grounding`

- [ ] **Step 7: Commit the Gemini tool-loop support.**

```bash
git add supabase/functions/ai-chat/ai-providers.ts supabase/functions/ai-chat/grounding.ts supabase/functions/ai-chat/ai-providers.test.ts
git commit -m "feat: add gemini tool calling for ai tutor"
```

### Task 5: Surface evidence and verify factual answers end to end

**Files:**
- Modify: `src/types/chat.types.ts`
- Modify: `src/services/supabase/chat.service.ts`
- Modify: `src/pages/chat/ChatPage.tsx`
- Modify: `src/pages/chat/ChatPage.test.tsx`

- [ ] **Step 1: Write failing UI tests for a grounded assistant message and an assistant message without evidence.**

The grounded message displays a compact source label such as “Nguồn: Tiến độ học tập”. A normal conversation response does not display an empty badge.

- [ ] **Step 2: Add types for message metadata and evidence.**

Treat metadata as untrusted data from the API: narrow it with a type guard before rendering.

- [ ] **Step 3: Render evidence labels below assistant messages using existing `Badge` styles.**

Do not display raw counts, internal RPC names, UUIDs, or provider tool payloads. A grammar evidence label links to the accessible grammar topic only when a topic ID is present.

- [ ] **Step 4: Add end-to-end acceptance cases with a real test account.**

Verify these answers against the dashboard/database:

| User prompt | Required evidence | Expected result |
|---|---|---|
| “Tôi đã học bao nhiêu từ?” | learning overview | exact active vocabulary count |
| “Hôm nay tôi cần ôn gì?” | review queue | only due terms, or explicit none-due response |
| “Có bài grammar nào không?” | grammar catalog | accessible published topics only |
| unknown grammar topic | grammar catalog/topic | explicit no matching content; no invented lesson |

- [ ] **Step 5: Run frontend verification.**

Run: `pnpm test -- ChatPage chat.service && pnpm tsc -b && pnpm build`

Expected: PASS.

- [ ] **Step 6: Deploy and verify production after migration review.**

Run:

```bash
npx supabase db push --linked --dry-run
npx supabase db push --linked
npx supabase functions deploy ai-chat --project-ref brwvbpkgimhamivmaflu --use-api
```

Verify the same four acceptance prompts on the deployed app with a Free user and a Pro user. Confirm a second account cannot receive another user's fact results.

- [ ] **Step 7: Commit the UI evidence surface.**

```bash
git add src/types/chat.types.ts src/services/supabase/chat.service.ts src/pages/chat/ChatPage.tsx src/pages/chat/ChatPage.test.tsx
git commit -m "feat: show ai tutor grounding evidence"
```

---

## Phase Gate: Do Not Start Vector RAG Until These Pass

- Every personal-data acceptance prompt has an evidence label and matches a direct database query.
- No user-specific claim is produced in tests without a successful tool result.
- Tool calls remain read-only, bounded, authenticated, and are capped at two per message.
- Free users cannot receive Pro grammar content through a tool result.
- Median tool-grounded response latency and token usage are recorded for at least 20 production test turns.

## Chunk 2: Curriculum Vector RAG

Start this chunk only when the app has enough published grammar/TOEIC content that keyword search is inadequate. Do not use RAG to answer personal-statistics questions.

### Task 6: Validate the embedding runtime and establish the source model

**Files:**
- Create: `supabase/functions/index-curriculum-embeddings/index.ts`
- Create: `supabase/functions/index-curriculum-embeddings/index.test.ts`
- Create: `docs/plans/ai-tutor-rag-evaluation.md`

- [ ] **Step 1: Create a throwaway local Edge Function test for `Supabase.ai.Session('gte-small')`.**

Confirm the deployed runtime can create a normalized 384-dimension embedding without an external API key. If it cannot, stop and document the fallback provider, its dimensions, and incremental cost before schema work.

- [ ] **Step 2: Define canonical curriculum source extraction.**

For each published grammar topic, concatenate only title, category, level, explanation, and allowed `lesson_blocks.content`. Exclude answer keys, admin-only drafts, payment data, and inaccessible Pro payloads.

- [ ] **Step 3: Define deterministic chunking.**

Use stable chunk IDs based on source type, source UUID, block UUID/order, content hash, and chunk ordinal. Target 400-700 tokens with 80-token overlap. A content hash decides whether re-embedding is necessary.

- [ ] **Step 4: Write a relevance evaluation set before indexing.**

Create 20 Vietnamese and English questions, expected topic IDs, and prohibited topic IDs. Include synonyms, paraphrases, empty corpus, Free user vs Pro topic, and a question requiring a direct “not found” response.

- [ ] **Step 5: Commit the evaluation dataset and runtime decision.**

```bash
git add docs/plans/ai-tutor-rag-evaluation.md supabase/functions/index-curriculum-embeddings
git commit -m "test: define ai tutor curriculum rag evaluation"
```

### Task 7: Add protected curriculum documents, chunks, and retrieval RPC

**Files:**
- Create: `supabase/migrations/<generated>_add_curriculum_rag.sql`
- Test: migration SQL and RPC owner/tier tests

- [ ] **Step 1: Create the migration with the Supabase CLI.**

Run: `npx supabase migration new add_curriculum_rag`

- [ ] **Step 2: Enable `vector` in the `extensions` schema and create canonical document/chunk tables.**

Create `curriculum_documents` with `source_type`, `source_id`, title, access tier, language, content hash, and timestamps. Create `curriculum_chunks` with document ID, chunk ordinal, text content, `embedding extensions.vector(384)`, token count, metadata, and a unique `(document_id, chunk_ordinal)` constraint.

- [ ] **Step 3: Add RLS policies derived from source access.**

Authenticated callers can select chunks only when the parent document maps to published content they are permitted to view under existing Free/Pro/admin rules. Only admins can insert/update/delete documents or chunks. Never grant writes to the generic authenticated role.

- [ ] **Step 4: Add `match_curriculum_chunks(query_embedding, match_count)` as a `SECURITY INVOKER` RPC.**

Use cosine distance, clamp `match_count` to 5, return source metadata, content, and similarity. Let RLS filter inaccessible chunks; do not accept `user_id` or a client-supplied access tier.

- [ ] **Step 5: Add the HNSW index only after the corpus reaches a useful size.**

For the initial small curriculum corpus, validate exact cosine search first. Add `hnsw (embedding vector_cosine_ops)` when retrieval latency or corpus size warrants it, and record the threshold choice in the migration comment.

- [ ] **Step 6: Verify policy and retrieval behavior with Free, Pro, and admin test users.**

Confirm the same embedding returns no Pro chunk to a Free user, and that a published Free chunk returns its matching source metadata.

- [ ] **Step 7: Commit the schema.**

```bash
git add supabase/migrations/<generated>_add_curriculum_rag.sql
git commit -m "feat: add protected curriculum vector search"
```

### Task 8: Build idempotent embedding indexing

**Files:**
- Modify: `supabase/functions/index-curriculum-embeddings/index.ts`
- Create: `scripts/index-curriculum-rag.mjs`
- Test: `supabase/functions/index-curriculum-embeddings/index.test.ts`

- [ ] **Step 1: Write failing tests for unchanged content, changed blocks, failed embeddings, and retry-safe upserts.**

- [ ] **Step 2: Implement an admin-authenticated indexing endpoint.**

Authenticate with the incoming user JWT, then verify `profiles.is_admin` before using service-role queries. The endpoint accepts only a topic UUID or a bounded batch request; it does not accept arbitrary raw text from the browser.

- [ ] **Step 3: Extract, chunk, embed, and upsert idempotently.**

Generate embeddings in batches with explicit size limits. Delete stale chunks only after all replacement chunks for the same document are written successfully. Record errors without storing provider credentials or learner chat content.

- [ ] **Step 4: Add a local admin script that invokes the endpoint in bounded batches.**

The script reads no secret from source control, prints source IDs/counts only, and supports a dry-run mode.

- [ ] **Step 5: Run the evaluation set and record retrieval metrics.**

Measure Recall@3, inaccessible-content leakage (must be zero), no-result accuracy, indexing duration, and query latency. Do not deploy the RAG UI if expected source is not in the top three for at least 18 of 20 evaluation queries.

- [ ] **Step 6: Commit the indexer and evaluation result.**

```bash
git add supabase/functions/index-curriculum-embeddings scripts/index-curriculum-rag.mjs docs/plans/ai-tutor-rag-evaluation.md
git commit -m "feat: index curriculum embeddings"
```

### Task 9: Retrieve curriculum evidence in AI Tutor

**Files:**
- Create: `supabase/functions/ai-chat/curriculum-rag.ts`
- Modify: `supabase/functions/ai-chat/grounding.ts`
- Modify: `supabase/functions/ai-chat/prompt.ts`
- Create: `src/components/chat/MessageEvidence.tsx`
- Modify: `src/pages/chat/ChatPage.tsx`
- Test: `supabase/functions/ai-chat/curriculum-rag.test.ts`, `src/components/chat/MessageEvidence.test.tsx`

- [ ] **Step 1: Write failing retrieval tests for relevant chunks, no result, duplicate chunks, and an inaccessible Pro chunk.**

- [ ] **Step 2: Generate a query embedding and call `match_curriculum_chunks` using the authenticated user client.**

Use at most three chunks, a documented similarity threshold chosen from the evaluation set, and a fixed context-token budget. Do not retry with a lower threshold when no source is found.

- [ ] **Step 3: Attach retrieved chunks only for curriculum-question tool calls.**

Personal-data questions continue through SQL tools. A mixed question first gets verified personal facts, then up to three accessible curriculum chunks.

- [ ] **Step 4: Require source-bound final answers.**

The prompt must label each chunk with source title/topic ID and instruct the assistant to answer “I could not find this in the available lessons” when no chunk is returned. Store only source IDs/title/score in message metadata.

- [ ] **Step 5: Render source citations.**

`MessageEvidence` renders accessible lesson titles as links to the existing grammar route. It must not expose raw chunk text, similarity scores, source UUIDs, or inaccessible content.

- [ ] **Step 6: Run all curriculum retrieval and UI tests.**

Run: `pnpm test -- curriculum-rag MessageEvidence ChatPage && pnpm tsc -b && pnpm build`

- [ ] **Step 7: Deploy only after the RAG evaluation gate passes.**

Run:

```bash
npx supabase db push --linked --dry-run
npx supabase db push --linked
npx supabase functions deploy index-curriculum-embeddings --project-ref brwvbpkgimhamivmaflu --use-api
npx supabase functions deploy ai-chat --project-ref brwvbpkgimhamivmaflu --use-api
```

- [ ] **Step 8: Commit the RAG integration.**

```bash
git add supabase/functions/ai-chat/curriculum-rag.ts supabase/functions/ai-chat/grounding.ts supabase/functions/ai-chat/prompt.ts src/components/chat/MessageEvidence.tsx src/pages/chat/ChatPage.tsx
git commit -m "feat: ground ai tutor curriculum answers with rag"
```

---

## Security and Cost Controls

- Provider keys and service-role keys remain Supabase Edge Function secrets only; no `VITE_` prefix.
- Tool declarations contain no write operations and no user ID arguments.
- All personal tools execute through an authenticated user client and `auth.uid()`-derived RPCs.
- All tool payloads are capped; no unbounded vocabulary, messages, lesson blocks, or vectors are sent to Gemini.
- Keep existing assistant reply cap (500 output tokens), 20-second provider timeout, daily quotas, and usage events.
- Use Supabase-native `gte-small` only after the runtime spike confirms it works. If a paid embedding provider is selected instead, add its API key to the secret allowlist, document per-document cost, and create a new approval plan before implementation.
- Run `npx supabase db advisors` after each schema migration and resolve new security findings before deployment.

## Completion Criteria

### Phase 1 complete

- “How many words have I learned?” exactly matches `get_ai_learning_overview()` in automated and production tests.
- “What should I review today?” contains only data returned by `get_ai_review_queue()` or explicitly reports none due.
- Grammar availability replies are derived from accessible `grammar_topics`, never model memory.
- A second account cannot access personal facts, review queues, decks, or inaccessible curriculum via the assistant.
- Every grounded response renders a source label and stores compact evidence metadata.

### Phase 2 complete

- Evaluation Recall@3 is at least 90% and inaccessible-content leakage is zero.
- A curriculum answer includes one or more accessible source citations, or clearly states that no source was found.
- Personal statistics are still resolved through SQL tools, never by embeddings.
- Indexing is idempotent and only re-embeds changed curriculum content.

## References

- [Gemini function calling](https://ai.google.dev/gemini-api/docs/function-calling)
- [Supabase semantic search and pgvector](https://supabase.com/docs/guides/ai/semantic-search)
- [Supabase Edge Function semantic search example](https://supabase.com/docs/guides/functions/examples/semantic-search)
- [Supabase pgvector extension](https://supabase.com/docs/guides/database/extensions/pgvector)
