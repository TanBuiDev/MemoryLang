# Game Implementation Roadmap

> Mục tiêu: thứ tự triển khai có dependency rõ, mỗi phase có deliverable và exit criteria.  
> Không gán timeline cứng; tốc độ phụ thuộc test/content review.

## 1. Guiding sequence

Không bắt đầu từ animation/Boss UI.

Thứ tự:

~~~text
Data ordering
→ Domain model
→ Generator
→ State machine
→ Persistence
→ UI
→ SRS
→ Admin/content tooling
→ Pilot content
→ QA
→ Rollout
~~~

## 2. Phase 0 — Planning lock

### Deliverables
- GAME_PRODUCT_PLAN approved.
- GAME_USER_FLOW approved.
- MISSION_SYSTEM_DESIGN approved.
- GAME_ENGINE_TECH_PLAN approved.
- GAME_DATA_MODEL_PLAN approved.
- QUESTION_GENERATION_PLAN approved.
- MISSION_CONTENT_PLAN approved.

### Decisions cần chốt
- termsPerMission default.
- parent deck policy.
- completion rule.
- replay behavior.
- SRS aggregation rule.
- whether study_sessions counts questions or terms.

### Exit
Không còn architectural open question làm thay đổi schema/domain lớn.

## 3. Phase 1 — Curriculum ordering foundation

### Database
- Add deck_terms.order_index.
- Backfill deterministic order.
- Add partial unique index/constraint.
- Verify all target decks.

### Service
- Add direct ordered playable deck loader.
- Exclude deleted global_terms.
- Pagination/max-row handling.

### Admin
Minimum:
- readiness detects missing order.

Preferred:
- visual reorder UI.

### Tests
- backfill integrity.
- order deterministic.
- deck CRUD regression.

### Exit
Một pilot deck trả exact ordered terms ổn định.

## 4. Phase 2 — Mission domain core

### Files
- mission.types.ts.
- missionSplitter.ts.
- curriculumFingerprint.ts.
- scriptRegistry.ts.
- standardMission.ts.

### Functions
- split ordered terms.
- merge small remainder.
- canonical fingerprint input.
- stable fingerprint.
- mission identity.

### Tests
- deterministic split.
- order change changes fingerprint.
- script/generator version change changes fingerprint.
- user ID does not affect fingerprint.

### Exit
Có thể chạy pure test tạo MissionDefinition skeleton từ pilot deck.

## 5. Phase 3 — Question generation

### Implement
- answerNormalization.
- distractors.
- matchingGenerator.
- listeningChoiceGenerator.
- listeningTypingGenerator.
- meaningRecallGenerator.
- contextClozeGenerator.
- spellingGenerator.
- generatorRegistry.

### Diagnostics
- missing translation.
- missing audio.
- duplicate translation.
- no exact cloze.
- insufficient distractors.

### Tests
Full matrix trong QUESTION_GENERATION_PLAN.

### Exit
Pilot deck sinh deterministic valid questions và diagnostics.

## 6. Phase 4 — Planner + readiness

### Implement
- missionPlanner.
- missionReadiness.
- question coverage allocation.
- boss mix.

### Output
- generated stages.
- blocking diagnostics.
- warnings.
- per-term coverage.

### Admin/debug preview
Có dev/admin preview đơn giản trước full visual editor.

### Exit
Pilot deck report Ready và reviewer có thể xem toàn bộ generated questions.

## 7. Phase 5 — Mission runtime

### Implement
- missionReducer.
- missionScoring.
- runtime controller hook.
- hint/retry rules.
- stage transition.

### Tests
- reducer transitions.
- no double submit.
- completion.
- retry.
- skip optional stage.
- required stage fail.

### Exit
Mission chạy end-to-end với fake/in-memory data.

## 8. Phase 6 — Local persistence

### Dexie
- bump memorylang-study DB version.
- activeGameMissions.
- pendingGameMissionSync.

### Implement
- gameMissionLocalDb.
- snapshot Zod schema.
- resume.
- stale fingerprint reject.
- pending sync retention.

### Tests
- save/load.
- corrupt snapshot.
- stale fingerprint.
- clear on success.
- retain on sync failure.

### Exit
Refresh browser giữa mission không mất attempt.

## 9. Phase 7 — Server progress

### Migration
- create game_mission_progress.
- RLS.
- indexes.
- completion RPC nếu chọn design đó.

### Service
- gameMission.service.ts.
- load progress.
- complete mission.
- replay update.
- best score.

### Tests
- ownership.
- best score monotonic.
- attempt count.
- fingerprint isolation.

### Exit
User A/B progress isolated và mission unlock persist qua device/relogin.

## 10. Phase 8 — Learner UI

### Pages
- MissionDeckPage.
- MissionGamePage.

### Components
- Briefing.
- Progress header.
- Learn.
- Matching.
- Listening choice.
- Listening typing.
- Context.
- Recall.
- Spelling.
- Boss.
- Result.
- Error states.

### Rules
- shared Button.
- Select.
- ConfirmModal.
- Neobrutalist design.
- keyboard/mobile.

### Exit
Full pilot mission usable trên desktop + mobile.

## 11. Phase 9 — Routing + Game Hub

### Routes
- mission deck route.
- mission active route.
- lazyWithChunkRecovery.

### Game Hub
- add Mission card.
- config schema.
- Free/Pro tier.
- playable deck filter.
- progress summary.

### AdminGamesPage
- mission enable/tier.
- deck mission toggle.
- readiness state.

### Exit
User có thể đi từ Game Hub đến Mission và quay lại không dead end.

## 12. Phase 10 — SRS integration

### Implement
- load SRS snapshots for target terms.
- LearningSignal.
- aggregate per term.
- missionSrsAdapter.
- scheduleReview.
- PendingReviewAction batch.
- sync reuse apply_study_review_batch.

### Critical rule
SRS state không feed vào mission planner.

### Tests
- correct first try.
- correct after hint.
- mixed outcomes.
- new user_term creation.
- one action/term/session.

### Exit
Mission result cập nhật review state đúng, curriculum hai user vẫn giống nhau.

## 13. Phase 11 — study_sessions analytics integration

### Decision gate
Chốt semantics:
- total_cards = graded questions hay target terms.

Review dashboard/stats consumers.

### Implement
- mode game_mission.
- session create/end.
- aggregate counts.

### Regression
- Java stats API assumptions.
- dashboard summaries.

### Exit
Game activity xuất hiện đúng trong learning analytics, không làm méo metrics.

## 14. Phase 12 — Content override foundation

### MVP option
Version-controlled override artifact + Zod.

### Phase-ready option
game_question_overrides table + admin builder.

### Needs
- disable question.
- prompt override.
- accepted answer.
- distractors.
- hint.
- preview.

### Exit
Content team sửa question đặc biệt không cần code change.

## 15. Phase 13 — Pilot content

### Pilot deck
Chọn một deck khoảng 80 terms data tốt.

### Tasks
- order review.
- readiness.
- generated preview.
- content review.
- manual overrides.
- boss review.

### Exit
MISSION_CONTENT_CHECKLIST pass 100%.

## 16. Phase 14 — QA hardening

### Functional
- all stage types.
- unlock.
- replay.
- resume.
- sync retry.
- content failure.
- invalid URLs.

### Platform
- mobile.
- keyboard.
- audio.
- slow network.
- Pro lock.
- auth refresh.

### Security
- RLS.
- RPC grants.
- no cross-user progress.
- advisors.

### Build
- pnpm tsc -b.
- relevant tests.
- full suite.
- Playwright.

### Exit
Zero release blocker.

## 17. Phase 15 — Controlled rollout

### Step 1
Admin/internal only.

### Step 2
Small set of production decks.

### Step 3
Broader Free/Pro rollout.

Monitor:
- mission completion.
- abandon stage.
- question report.
- sync error.
- audio error.
- content override rate.

### Rollback
Feature flag games_module hoặc mission config disable mà không xóa progress.

## 18. Phase 16 — Content scale-up

Per deck:
- order;
- readiness;
- auto generation;
- review;
- overrides;
- QA;
- publish.

Không rollout toàn library chỉ vì generator pass technical tests.

## 19. Phase 17 — Additional modes

Sau core stable:

- Quick Mission.
- Listening Focus.
- Boss Rush.
- Review Battle.

Reuse same generator/state/persistence.

Không duplicate engine per mode.

## 20. Phase 18 — Optional game economy

Chỉ khi có product need:

- persistent XP.
- streak game-specific.
- achievements.
- cosmetics.

Trước đó:
- không hiển thị fake persistent XP.

## 21. Dependency graph

~~~text
order_index
   ↓
ordered loader
   ↓
split + fingerprint
   ↓
generators
   ↓
planner/readiness
   ↓
runtime
   ↓
local persistence
   ↓
server progress
   ↓
UI/routes
   ↓
SRS/analytics
   ↓
content tooling
   ↓
pilot
   ↓
rollout
~~~

## 22. Parallelizable work

Sau Phase 3:

### Track A — Engine
- planner;
- reducer;
- scoring.

### Track B — UI
- stage component shells using fixtures.

### Track C — Content
- pilot deck order;
- data cleanup;
- editorial guidelines.

Không parallel schema-dependent persistence trước khi data model chốt.

## 23. Risk register

### Risk: deck order unstable
Mitigation: order_index required.

### Risk: generated ambiguity
Mitigation: diagnostics + skip + manual override.

### Risk: SRS overcount
Mitigation: aggregate one action/term/session.

### Risk: mission progress invalid after content edit
Mitigation: fingerprint.

### Risk: Game Hub config JSON grows
Mitigation: Zod now, relational config later.

### Risk: local sync loss
Mitigation: Dexie pending queue.

### Risk: analytics metrics distorted
Mitigation: explicit study_sessions semantics + regression tests.

### Risk: scope explosion into RPG
Mitigation: strict MVP non-goals.

## 24. Commit strategy

Theo project rules:
- one logical feature/fix per commit.
- English conventional commit.
- build/typecheck before code commits.
- schema migrations separate from UI where appropriate.
- no unrelated refactor bundled.

Example sequence:
- feat(game): add deterministic mission curriculum
- feat(game): add vocabulary question generators
- feat(game): persist mission progress
- feat(game): add mission learner flow
- feat(game): sync mission results to SRS

## 25. MVP definition of done

MVP hoàn thành khi:

- pilot deck playable.
- mission terms deterministic.
- generator deterministic.
- progress persists.
- resume works.
- unlock works.
- replay works.
- audio works.
- content diagnostics works.
- SRS update works without content personalization.
- Free/Pro works.
- RLS isolation proven.
- content checklist pass.
- mobile/keyboard pass.
- build/test pass.

## 26. Post-MVP definition

Không chuyển sang cosmetics/economy trước khi:
- question bug rate thấp;
- sync stable;
- content workflow measurable;
- ít nhất vài deck đã publish thành công bằng cùng pipeline.
