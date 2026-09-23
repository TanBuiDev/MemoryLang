# Game Data Model Plan

> Trạng thái: Database design specification  
> Backend: Supabase PostgreSQL  
> Nguyên tắc: shared curriculum tách khỏi personal progress

## 1. Mục tiêu

Data model phải hỗ trợ:

- curriculum chung cho mọi user;
- term ordering deterministic;
- curriculum version/fingerprint;
- mission completion;
- replay;
- best score;
- resume/pending sync;
- SRS downstream;
- Free/Pro config hiện có;
- không duplicate toàn bộ vocabulary content.

## 2. Current schema liên quan

### decks

Current fields chính:
- id uuid PK
- user_id uuid
- name text
- description text
- source_language text
- native_language text
- color text
- icon text
- visibility text
- parent_id uuid
- created_at
- updated_at

### deck_terms

Current model:
- deck_id uuid
- global_term_id uuid
- created_at timestamptz
- PK (deck_id, global_term_id)
- FK deck_id → decks ON DELETE CASCADE
- FK global_term_id → global_terms ON DELETE CASCADE

Current game-critical issue:
- chưa có semantic order_index.

### global_terms

Shared vocabulary:
- source_text
- normalized_text
- language
- item_type
- part_of_speech
- ipa
- audio_url
- image_url
- meanings jsonb
- examples jsonb
- translation
- note
- tags
- deleted_at

### user_terms

Personal current-state learning record:
- user_id
- global_term_id
- status
- view_count
- correct_count
- wrong_count
- audio_play_count
- last_reviewed_at
- next_review_at
- srs_repetition
- srs_interval_days
- srs_ease_factor
- flagged
- deleted_at

Unique:
- (user_id, global_term_id)

### study_sessions

- id
- user_id
- deck_id
- mode
- total_cards
- viewed_cards
- remembered_count
- difficult_count
- started_at
- ended_at

RLS ownership hiện có.

### app_settings

game_hub_config hiện chứa game tier và allowed deck configuration.

## 3. Shared vs personal boundary

~~~text
SHARED
decks
deck_terms
global_terms
game config
question overrides

PERSONAL
user_terms
study_sessions
game_mission_progress
local pending sync
~~~

Không thêm user_id vào shared mission content.

## 4. Required schema change: deck term ordering

### 4.1. Requirement

Thêm:

~~~text
deck_terms.order_index integer
~~~

Lý do:
- created_at không phải curriculum contract;
- reorder phải explicit;
- Mission 1 phải giữ cùng target terms cho cùng curriculum.

### 4.2. Backfill

Conceptual:
- partition theo deck_id;
- sort created_at ASC, global_term_id ASC;
- assign 0-based hoặc 1-based index.

Khuyến nghị DB dùng 0-based hoặc 1-based đều được, nhưng phải chốt toàn hệ thống. Đề xuất DB 0-based để align code mission.

### 4.3. Constraint

Sau backfill:
- NOT NULL cho published/playable data.
- unique (deck_id, order_index).

Nếu muốn cho draft deck chưa ordered:
- order_index có thể nullable;
- readiness block game publish nếu null;
- unique partial index WHERE order_index IS NOT NULL.

Khuyến nghị cách nullable + publish validation để không phá CRUD hiện tại.

### 4.4. Reorder

Admin reorder phải transaction-safe.

Không update tuần tự order_index trực tiếp nếu unique conflict. Có thể:
- temporary offset;
- RPC reorder;
- hoặc deferred strategy.

Implementation cần test concurrent/reorder.

## 5. Direct terms cho playable deck

Mission curriculum dùng direct deck_terms.

Không recursive descendant mặc định.

Lý do:
- parent/child ordering không có contract;
- duplicate term giữa children;
- parent thường là catalog.

Nếu future parent curriculum:
- cần child_order_index;
- aggregation mode;
- explicit schema/design riêng.

## 6. Curriculum fingerprint

Không nhất thiết thêm curriculum_version column nếu fingerprint derived.

Fingerprint canonical inputs:

- deck_id
- ordered active global_term_ids
- terms_per_mission
- script_key
- script_version
- generator_version
- override_version/hash

Persist fingerprint trong progress row.

Ưu:
- tự đổi khi content thay;
- không phụ thuộc admin nhớ bump version.

Nhược:
- cần canonical serialization ổn định.

Fingerprint algorithm phải test và version nếu đổi serialization.

## 7. Mission progress table — required

Đề xuất:

~~~text
game_mission_progress
---------------------
id uuid PK default gen_random_uuid()
user_id uuid NOT NULL FK profiles(id) ON DELETE CASCADE
deck_id uuid NOT NULL FK decks(id) ON DELETE CASCADE
curriculum_fingerprint text NOT NULL
mission_index integer NOT NULL
status text NOT NULL
attempt_count integer NOT NULL default 0
best_score numeric nullable
best_accuracy numeric nullable
latest_score numeric nullable
latest_accuracy numeric nullable
first_started_at timestamptz nullable
last_started_at timestamptz nullable
completed_at timestamptz nullable
updated_at timestamptz NOT NULL default now()
~~~

## 8. Progress constraints

- mission_index >= 0.
- attempt_count >= 0.
- status IN ('in_progress', 'completed').
- score 0..100.
- accuracy 0..100.
- best/latest nullable trước first completed attempt.

Unique:

~~~text
(user_id, deck_id, curriculum_fingerprint, mission_index)
~~~

Không unique chỉ user+deck+mission vì curriculum có thể đổi.

## 9. Progress semantics

### Start first attempt

- insert/upsert row.
- status = in_progress.
- attempt_count = 1.
- first_started_at set.
- last_started_at set.

### Resume same attempt

Không increment attempt_count nếu chỉ reload/resume local attempt.

### Replay completed mission

- attempt_count + 1.
- completed vẫn giữ completed.
- latest score cập nhật sau finish.
- best score = greatest(previous, latest).
- completed_at nên là first completion hoặc latest completion?

Khuyến nghị:
- completed_at = first completion, stable.
- updated_at = latest.
- nếu cần replay history, thêm attempts table phase sau.

## 10. Study session relationship

MVP không bắt buộc FK game_mission_progress → study_sessions.

study_sessions dùng cho aggregate learning activity.

Mission progress dùng unlock/best score.

Một mission attempt có thể tạo một study_session với:
- deck_id;
- mode = game_mission.

Nếu cần trace exact relation phase sau:
- thêm study_session_id nullable vào attempt history table, không nhất thiết progress row.

## 11. Do we need game attempt table?

### MVP
Không bắt buộc nếu:
- local attempt state trong Dexie;
- server chỉ cần completion/progress;
- study_sessions đủ aggregate.

### Phase 2
Thêm game_mission_attempts nếu cần:
- detailed history;
- abandon analysis;
- server resume cross-device;
- anti-cheat/leaderboard;
- exact stage analytics.

Possible fields:
- id;
- user_id;
- deck_id;
- fingerprint;
- mission_index;
- attempt_number;
- status;
- score;
- accuracy;
- first_try_accuracy;
- started_at;
- completed_at;
- duration_ms.

Không thêm trước khi product cần vì tăng write volume.

## 12. Per-answer storage

MVP không lưu raw per-answer server-side.

Lý do:
- giảm data volume;
- giảm privacy/data retention surface;
- không cần cho unlock.

Nếu cần analytics:
- event platform hoặc compact answer event table phase sau.

Không lưu typed answer nếu không có use case rõ.

## 13. SRS storage

Không tạo game-specific SRS table.

Reuse user_terms.

Mission adapter tính aggregated action và gọi existing batch RPC.

Nếu user_term chưa tồn tại:
- existing apply_study_review_batch hiện có logic tạo từ global_term_id.

Cần bảo đảm term ID gửi vào RPC là:
- user_term id hoặc global_term id theo contract hiện có;
- Mission nên chuẩn hóa dùng global_term_id.

## 14. Important RPC caveat

apply_study_review_batch:
- tìm row user_terms theo auth.uid();
- match id hoặc global_term_id;
- insert nếu chưa có;
- update SRS;
- update study session summary.

Mission implementation phải:
- không gửi arbitrary UUID không phải accessible global term;
- aggregate action per term;
- test RLS/auth behavior.

Nếu RPC được sửa, audit SECURITY mode + execute grants theo Supabase rules.

## 15. Game config MVP

Giữ app_settings.game_hub_config để giảm schema churn.

Extend conceptual:

~~~json
{
  "games": {
    "matching": { "accessTier": "free" },
    "mission": { "accessTier": "free" }
  },
  "allowedDecks": [
    {
      "deckId": "...",
      "allowed": true,
      "accessTier": "free",
      "missionEnabled": true,
      "termsPerMission": 10,
      "scriptKey": "standard"
    }
  ]
}
~~~

Admin UI phải visual.

## 16. Config validation

Hiện code cast JSON trực tiếp.

Khi mở rộng mission config:
- tạo Zod schema;
- parse;
- default invalid optional fields;
- fail safe: deck không mission-enabled nếu config malformed.

Không trust app_settings JSON bằng type assertion.

## 17. Scaling config

Nếu số deck/game config lớn hoặc nhiều admin edit concurrent, phase sau migrate sang:

~~~text
game_deck_configs
- deck_id PK
- enabled
- access_tier
- terms_per_mission
- script_key
- updated_by
- updated_at
~~~

MVP chưa cần nếu app_settings vẫn manageable.

## 18. Manual content override — Phase 2

Nếu content team cần sửa question cụ thể, đề xuất relational table:

~~~text
game_question_overrides
-----------------------
id uuid PK
deck_id uuid
global_term_id uuid
question_type text
override_key text
prompt jsonb/text
accepted_answers jsonb
options jsonb
disabled boolean
version integer
status text
updated_by uuid
updated_at timestamptz
~~~

Không lưu React/HTML arbitrary nếu không sanitize.

Có thể dùng versioned artifact trước khi xây admin editor.

## 19. Override publication

Draft override không được learner query.

Options:
- status published;
- RLS/view chỉ expose published.

Admin update có audit log.

Curriculum fingerprint phải include published override version/hash.

## 20. RLS: game_mission_progress

Enable RLS.

Policies recommended:

### SELECT
TO authenticated
USING ((select auth.uid()) = user_id)

### INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id)

### UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id)

### DELETE
Có thể không grant learner delete nếu product không cần reset.

Không chỉ dùng TO authenticated mà thiếu ownership predicate.

## 21. RLS: shared config/overrides

Learner:
- read published/allowed shared content only theo product model.

Admin:
- update qua admin role/RBAC service.

Không dùng user_metadata để xác định admin.

Follow project is_admin/RBAC pattern hiện có.

## 22. Indexes

### deck_terms

~~~text
unique/deck order:
(deck_id, order_index) where order_index is not null

existing PK:
(deck_id, global_term_id)
~~~

### game_mission_progress

~~~text
unique(user_id, deck_id, curriculum_fingerprint, mission_index)
index(user_id, deck_id, curriculum_fingerprint, status)
index(user_id, updated_at desc)
~~~

Không tạo index dư thừa nếu unique index đã cover query.

## 23. Trigger updated_at

Dùng project convention nếu đã có generic updated_at trigger.

Nếu không, update explicit trong service/RPC.

Không tạo nhiều trigger khác nhau không cần thiết.

## 24. Progress write API

### Option A direct upsert
Frontend Supabase upsert với RLS.

### Option B RPC
Atomic complete mission + best score + attempt count.

Khuyến nghị RPC cho completion vì:
- best score race-safe;
- attempt_count atomic;
- unlock data consistent.

Ví dụ conceptual:

~~~text
complete_game_mission(
  p_deck_id,
  p_fingerprint,
  p_mission_index,
  p_score,
  p_accuracy
)
~~~

RPC:
- auth.uid required;
- không nhận user_id từ client;
- validate ranges;
- upsert own row;
- return normalized progress.

Nếu SECURITY DEFINER không cần, dùng INVOKER/default.

## 25. Starting/replay write

Có thể:
- direct upsert start row;
- hoặc start_game_mission RPC.

MVP có thể chỉ persist completion server-side và giữ in-progress local.

Nếu muốn cross-device resume, server attempt table required.

## 26. Curriculum change

Deck membership/order change → fingerprint change.

Behavior:
- old progress rows remain keyed old fingerprint.
- new Mission Map queries current fingerprint only.
- optional historical cleanup later.

Không update old rows sang new fingerprint tự động.

## 27. Deck deletion

FK ON DELETE CASCADE của progress hợp lý nếu deck thật sự bị delete.

Nếu cần historical analytics sau deck delete, dùng soft delete/history design phase sau.

Current decks CRUD may hard delete; plan phải chấp nhận hoặc thay policy riêng.

## 28. Term deletion

global_terms soft-delete:
- playable query excludes deleted_at.
- fingerprint changes.
- readiness recompute.

Current deck_terms FK ON DELETE CASCADE nếu hard delete global term.

## 29. Data migration plan

### Migration A
Add deck_terms.order_index + index/constraint + backfill.

### Migration B
Create game_mission_progress + RLS + indexes.

### Migration C
Optional complete_game_mission RPC.

Không gộp unrelated schema nếu rollout cần isolate.

## 30. Backfill verification

Sau order backfill:

- count deck_terms trước/sau bằng nhau.
- no duplicate order_index per deck.
- no missing order_index cho target playable decks.
- sample TOEIC deck order review.
- deckService existing behavior không regress.

## 31. Supabase migration workflow

Theo project/Supabase rules:

1. iterate SQL bằng execute_sql/local.
2. test.
3. run advisors.
4. review RLS/security.
5. generate versioned migration.
6. verify migration list.
7. apply controlled.
8. run smoke queries.

Không dùng service_role trên frontend.

## 32. Data quality snapshot

Tại thời điểm lập plan:
- active global terms: 1.910
- with audio: 1.910
- with translation: 1.909
- with examples: 1.905

Snapshot không thay thế readiness validation mỗi deck.

## 33. Acceptance criteria

Data model hoàn thành khi:

- playable deck có explicit deterministic order.
- progress không phụ thuộc created_at.
- progress keyed current curriculum fingerprint.
- replay không giảm best score.
- user không đọc/ghi progress của user khác.
- deck content shared không bị duplicate per user.
- SRS tiếp tục dùng user_terms.
- app_settings mission config parse bằng schema.
- curriculum change không silently reuse old completion.
- migration/RLS tests pass.
