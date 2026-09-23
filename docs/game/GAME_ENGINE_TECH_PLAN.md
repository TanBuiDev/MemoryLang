# Game Engine Technical Plan

> Trạng thái: Technical specification  
> Phạm vi: Frontend engine + Supabase integration + local persistence  
> Không bao gồm: implementation code

## 1. Mục tiêu kỹ thuật

Xây Mission Game như một domain engine có thể:

- nhận một playable deck;
- lấy ordered shared terms;
- tạo deterministic mission;
- sinh question từ global_terms;
- chạy state machine độc lập UI;
- persist progress;
- resume;
- ghi learning signals về SRS;
- tái sử dụng audio, subscription, feature flag và design system hiện có.

Một deck mới đạt readiness phải chơi được mà không sửa MissionGamePage.

## 2. Current-state inventory

### Đã có

- React 19 + TypeScript.
- React Router.
- TanStack React Query.
- Zustand.
- Dexie local-first study DB.
- Supabase Auth/RLS.
- deckService.
- vocabularyService.
- studyService.
- studyLocalDb + studySyncService.
- spacedRepetition.ts.
- audio.ts / speak().
- GameHubPage.
- MatchingGamePage.
- AdminGamesPage.
- games_module FeatureGuard.
- Free/Pro Subscription state.
- lazyWithChunkRecovery.

### Khoảng trống

- Mission domain types.
- Ordered curriculum contract.
- Mission fingerprint.
- Mission splitter/planner.
- Question generator registry.
- Mission state machine.
- Mission progress persistence.
- SRS aggregation adapter cho nhiều graded exposure/term.
- Mission-specific local snapshot.
- Content readiness diagnostics.
- Route cho deck mission map và active mission.

## 3. Nguyên tắc kiến trúc

### 3.1. UI không chứa business rules

Không để MissionGamePage quyết định:
- mission split;
- question eligibility;
- distractors;
- scoring;
- SRS action;
- fingerprint.

Page chỉ:
- load data;
- render stage;
- dispatch action;
- navigate.

### 3.2. Pure functions trước

Các module sau nên pure:
- split;
- fingerprint canonical input builder;
- generator;
- scoring;
- signal aggregation;
- readiness validation.

Điều này giúp test nhanh không cần Supabase/browser.

### 3.3. Shared data và user state tách biệt

Shared content loader:
- deck config;
- ordered global terms;
- script.

Personal loader:
- progress;
- SRS snapshot;
- active local attempt.

Không để personal loader feed vào question planning ngoài persistence metadata.

## 4. Proposed module tree

~~~text
src/
  features/
    games/
      mission/
        mission.types.ts
        curriculum.ts
        curriculumFingerprint.ts
        missionSplitter.ts
        missionPlanner.ts
        missionReducer.ts
        missionScoring.ts
        missionReadiness.ts
        missionSrsAdapter.ts
        missionSessionPersistence.ts
        scriptRegistry.ts
        scripts/
          standardMission.ts
          finalBoss.ts
        generators/
          generator.types.ts
          generatorRegistry.ts
          matchingGenerator.ts
          listeningChoiceGenerator.ts
          listeningTypingGenerator.ts
          contextClozeGenerator.ts
          meaningRecallGenerator.ts
          spellingGenerator.ts
          distractors.ts
          answerNormalization.ts
        components/
          MissionBriefing.tsx
          MissionProgressHeader.tsx
          LearnStage.tsx
          MatchingStage.tsx
          ListeningChoiceStage.tsx
          ListeningTypingStage.tsx
          ContextClozeStage.tsx
          MeaningRecallStage.tsx
          SpellingStage.tsx
          BossStage.tsx
          MissionResult.tsx
          MissionErrorState.tsx

  pages/
    games/
      MissionDeckPage.tsx
      MissionGamePage.tsx

  services/
    supabase/
      gameMission.service.ts
    local/
      gameMissionLocalDb.ts
      gameMissionSync.service.ts

  types/
    game.types.ts
~~~

Có thể giảm file count ở implementation đầu, nhưng domain boundary không được nhập ngược vào page.

## 5. Core types

Conceptual:

~~~ts
type MissionStageType =
  | 'learn'
  | 'matching'
  | 'listening_choice'
  | 'listening_typing'
  | 'context_cloze'
  | 'meaning_recall'
  | 'spelling'
  | 'boss'

interface PlayableDeckTerm {
  globalTermId: string
  orderIndex: number
  sourceText: string
  translation: string | null
  ipa: string | null
  audioUrl: string | null
  meanings: Meaning[]
  examples: ExampleSentence[]
  itemType: VocabularyItemType
  partOfSpeech: string | null
}

interface MissionDefinition {
  deckId: string
  curriculumFingerprint: string
  missionIndex: number
  targetTermIds: string[]
  scriptKey: string
  scriptVersion: number
  stages: GeneratedStage[]
}
~~~

Không reuse VocabularyItem một cách mù quáng nếu type đó bắt buộc user-specific fields. Nên có shared game term DTO rõ ràng.

## 6. Curriculum loader

Không dùng trực tiếp deckService.listTerms() cho Mission production vì:

- hiện include descendants;
- order dựa created_at;
- trả VocabularyItem synthetic status = new.

Đề xuất thêm API riêng:

~~~ts
gameMissionService.listPlayableDeckTerms(deckId)
~~~

Responsibility:
- validate deck readable;
- direct terms only;
- active global_terms only;
- explicit order_index;
- pagination nếu count có thể > Supabase max rows;
- trả shared DTO.

Không query toàn global_terms rồi filter client.

## 7. Deck hierarchy policy

Game Mission default:
- child/leaf deck = playable curriculum;
- parent deck = collection.

Nếu admin explicit bật parent playable:
- backend/service phải có aggregation rule riêng;
- child deck order phải explicit;
- không reuse recursive listTerms() rồi coi created_at là curriculum.

MVP nên disable parent playable.

## 8. React Query

Suggested keys:

~~~text
['game-deck', deckId]
['game-deck-terms', deckId, fingerprintInputsVersion]
['game-mission-progress', userId, deckId, curriculumFingerprint]
['game-mission', deckId, curriculumFingerprint, missionIndex]
~~~

Shared generated MissionDefinition có thể memo/cache client vì deterministic.

Personal progress phải invalidate sau completion.

## 9. Routing

Trong routes.tsx:

~~~text
/app/games
/app/games/mission/:deckId
/app/games/mission/:deckId/:missionIndex
~~~

Pages lazy-load bằng lazyWithChunkRecovery.

Cả hai nằm dưới:
- ProtectedRoute;
- FeatureGuard flag="games_module".

Không import React.lazy trực tiếp.

## 10. Game Hub integration

Current GameHubConfig có:
- matching;
- speed;
- puzzle;
- listening;
- allowedDecks.

MVP options:

### Option A — Extend current config
Thêm mission access tier.

Ưu:
- ít schema change;
- AdminGamesPage đã có pattern.

Nhược:
- config JSON sẽ lớn dần.

Chọn Option A cho MVP.

Extract interfaces khỏi GameHubPage/AdminGamesPage vào shared type để tránh duplicate.

Ví dụ:

~~~ts
interface GameHubConfig {
  games: {
    matching: GameAccessConfig
    mission: GameAccessConfig
    ...
  }
  allowedDecks: AllowedDeckConfig[]
}
~~~

## 11. Mission Deck Page

Responsibility:

- load deck;
- load ordered terms;
- compute fingerprint;
- split missions;
- load progress;
- derive lock/unlock;
- render map.

Không generate toàn bộ question của mọi mission upfront.

Generate selected mission khi user mở để giảm CPU/memory.

## 12. Mission Game Page

Responsibility:

1. parse route.
2. load mission definition.
3. load/resume attempt.
4. own reducer.
5. render stage by type.
6. persist snapshot after meaningful transition.
7. complete/sync.
8. navigate result/map.

Không chứa Supabase query inline nếu service đã tồn tại.

## 13. State management

### Server state
React Query.

### Session runtime
useReducer hoặc dedicated mission hook.

Không cần global Zustand cho active mission nếu state chỉ tồn tại trong route/session.

### User preferences
Nếu sau này có:
- autoplay;
- sound;
- difficulty display;
thì dùng existing sound/settings stores hoặc dedicated persisted preference store.

## 14. Reducer

Actions conceptual:

~~~ts
START_ATTEMPT
START_STAGE
ANSWER
USE_HINT
RETRY
COMPLETE_QUESTION
COMPLETE_STAGE
NEXT_STAGE
PAUSE
RESUME
COMPLETE_MISSION
SYNC_START
SYNC_SUCCESS
SYNC_ERROR
RESET_ATTEMPT
~~~

Reducer phải:
- immutable;
- deterministic;
- không gọi async;
- không gọi Supabase/audio.

Effects nằm trong controller hook/page.

## 15. Local persistence

Project đã có Dexie database memorylang-study với:
- cachedVocabulary;
- activeSessions;
- pendingStudy;
- audioCache;
- pending mutations.

Mission nên theo cùng pattern thay vì sessionStorage-only như MatchingGame hiện tại.

### Đề xuất

Version tiếp của Dexie thêm:

~~~text
activeGameMissions
pendingGameMissionSync
~~~

Record key:

~~~text
userId:deckId:curriculumFingerprint:missionIndex
~~~

activeGameMissions lưu:
- runtime state;
- updatedAt;
- definition fingerprint;
- minimal cached question data.

pendingGameMissionSync lưu:
- mission progress patch;
- aggregated SRS actions;
- study session summary nếu cần.

Không share một pending row per user nếu mission mutation cần độc lập với Study flow.

## 16. Sync strategy

~~~text
Answer locally
→ save active attempt snapshot
→ mission complete
→ enqueue server mutations
→ call Supabase
→ success:
     clear pending
     clear active
     invalidate progress
→ failure:
     keep pending
     show Retry
~~~

Không clear local completion trước khi server persistence thành công.

## 17. study_sessions integration

Current studyService.createSession() có:
- user_id;
- mode;
- deck_id;
- total_cards.

study_sessions.mode ở DB hiện không có check constraint khóa enum, nhưng TypeScript StudyMode cần mở rộng nếu reuse API.

Đề xuất:
- thêm 'game_mission' vào StudyMode;
- tạo study session khi mission bắt đầu hoặc khi attempt được server register;
- update totals khi hoàn tất.

Mapping:
- total_cards = graded questions hoặc target terms phải được chốt nhất quán.
- recommendation: total_cards = graded questions; viewed_cards = answered graded questions; remembered_count = first/final correct theo analytics contract cần thống nhất.

Nếu analytics hiện coi card là vocabulary exposure, có thể thay bằng target term count. Cần tránh làm méo dashboard. Đây là implementation decision phải test với stats consumer trước merge.

## 18. SRS integration

Không gọi studyService.applyReviewAction cho từng question.

Flow:

~~~text
AnswerRecord[]
→ LearningSignal[]
→ aggregate by globalTermId
→ missionSrsAdapter
→ scheduleReview(snapshot)
→ PendingReviewAction[]
→ apply_study_review_batch
~~~

### Snapshot loader

gameMissionService có thể fetch user_terms chỉ cho target global_term_ids.

Fields:
- id;
- global_term_id;
- correct_count;
- wrong_count;
- srs_repetition;
- srs_interval_days;
- srs_ease_factor.

Nếu chưa có user_term:
- default snapshot;
- RPC hiện có có thể tạo user_term khi flush.

Không expose snapshot vào planner.

## 19. Important SRS rule

Current studyLocalDb.mergeReviewActions() giữ action cuối cùng per term.

Mission adapter phải aggregate trước khi enqueue để không phụ thuộc thứ tự challenge.

Không enqueue 5 actions cho một term trong cùng mission.

## 20. Audio

Reuse speak():

~~~ts
speak(term.sourceText, {
  audioUrl: term.audioUrl,
  globalTermId: term.globalTermId,
  lang: term.sourceLanguage,
})
~~~

Stage component không tự fetch TTS.

Audio controls:
- replay;
- loading feedback nếu cần;
- stop on route/stage cleanup;
- latest-request-wins behavior từ audio.ts.

Listening stage cần khóa submit đủ ngắn để tránh double input nhưng không khóa audio replay.

## 21. Preloading

Khi mission definition ready:
- browser có thể warm audio cache cho next N prompts nếu không gây request burst.
- ưu tiên existing static audio_url.
- không auto-generate audio cho toàn mission nếu URL đã có.

MVP có thể không prefetch blob, chỉ preload metadata.

## 22. Question generation boundary

Generator API:

~~~ts
generateQuestions({
  terms,
  targetTermIds,
  count,
  seed,
  overrides,
})
~~~

Output không chứa React node.

~~~ts
interface QuestionDefinition {
  id: string
  type: MissionQuestionType
  targetTermId: string
  prompt: SerializablePrompt
  acceptedAnswers: string[]
  options?: QuestionOption[]
  metadata: GenerationMetadata
}
~~~

Serializable giúp local persistence.

## 23. Validation

Dùng Zod cho:
- persisted local snapshot;
- DB progress row mapping nếu useful;
- manual override config;
- app_settings config migration.

Không trust JSON từ app_settings bằng TypeScript cast như hiện tại nếu config bắt đầu phức tạp.

## 24. Error handling

### Network
Typed service error → retry UI.

### Content
Diagnostic + MissionErrorState.

### Invalid local snapshot
Zod parse fail:
- delete snapshot;
- restart;
- do not crash.

### Audio
Graceful fallback.

### Access
Redirect/upgrade prompt.

Không show err.message trực tiếp nếu có thể chứa backend detail.

## 25. Content readiness service

Pure validator:

~~~ts
evaluateMissionReadiness(terms, script)
~~~

Output:

~~~ts
{
  playable: boolean
  blocking: Diagnostic[]
  warnings: Diagnostic[]
  coverage: {
    audio: number
    translation: number
    cloze: number
  }
}
~~~

Admin UI và learner loader dùng cùng core validator để tránh rule lệch.

## 26. Performance

- Không gọi vocabularyService.list(user.id) để chỉ lấy count cho Game Hub nếu có thể dùng count/view.
- Tuân thủ PostgREST 1000-row limit.
- Playable deck loader paginate hoặc query giới hạn rõ.
- Chỉ generate selected mission.
- Memoize deterministic definition.
- Dedupe audio requests.
- Avoid re-render toàn mission state nếu input keystroke có thể localize.

## 27. Security

- service_role không bao giờ ở frontend.
- Progress rows RLS ownership.
- New SECURITY DEFINER RPC chỉ dùng khi thật sự cần; default SECURITY INVOKER/direct table with RLS.
- Nếu tạo RPC, revoke PUBLIC execute và grant role rõ.
- Không dùng user_metadata cho authorization.
- Free/Pro client gating không thay thế backend authorization nếu dữ liệu/action cần bảo vệ.

## 28. UI implementation constraints

Theo project rules:

- Button component cho actions.
- Select component, không native select.
- ConfirmModal cho exit/reset.
- Không window.alert/confirm/prompt.
- Không textarea JSON cho admin script.
- Neobrutalist utilities hiện có.
- Admin content tooling phải visual.

## 29. Admin tooling MVP

AdminGamesPage mở rộng:
- enable Mission game;
- tier;
- playable deck toggle.

Readiness badge:
- Ready.
- Warning.
- Blocked.

Blocked deck không publish Mission.

Phase sau:
- term ordering UI;
- content override editor;
- preview mission.

## 30. Existing Matching Game strategy

Không refactor MatchingGamePage vào Mission Engine trước MVP nếu gây scope lớn.

Tái sử dụng:
- UX learnings;
- sound effects;
- pairing behavior;
- audio calls.

Có thể extract MatchingStage sau khi Mission MVP stable.

Không để Mission phụ thuộc vào internal state của MatchingGamePage.

## 31. Testing strategy

### Unit
- splitter.
- fingerprint.
- answer normalization.
- each generator.
- distractor selection.
- readiness.
- reducer.
- scoring.
- SRS aggregation.

### Component
- each stage keyboard/touch.
- feedback.
- hint.
- audio error.
- ConfirmModal exit.

### Service
Mock Supabase:
- progress fetch/upsert.
- target SRS snapshot.
- failure retry.

### E2E
- start deck.
- complete mission.
- refresh/resume.
- network save retry if testable.
- Pro lock.
- unlock next.

## 32. Build gates

Trước mỗi code commit:
- inspect changes.
- pnpm tsc -b.
- relevant Vitest tests.
- full test/build ở release gate.

Supabase migration:
- apply in controlled environment;
- get advisors;
- RLS tests;
- verify query.

## 33. Implementation order

1. Data ordering prerequisite.
2. Types + script.
3. Split/fingerprint.
4. Generators + tests.
5. Planner/readiness.
6. Reducer/scoring.
7. Service loaders.
8. Local persistence.
9. Mission Deck Page.
10. Stage components.
11. Mission Game Page.
12. Progress persistence.
13. SRS adapter.
14. Admin readiness/config.
15. E2E + rollout.

## 34. Technical Definition of Done

- Không có business rule quan trọng hardcode trong page.
- Same input tạo same mission.
- Same deck cho hai user có targetTermIds giống nhau.
- Progress cá nhân vẫn độc lập.
- Refresh resume được.
- Offline/save failure không mất completed attempt chưa sync.
- Audio dùng shared stack.
- Supabase RLS bảo vệ progress.
- Generator không sinh malformed question.
- Route dùng lazyWithChunkRecovery.
- TypeScript/build/tests pass.
