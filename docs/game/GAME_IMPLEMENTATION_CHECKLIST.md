# Game Implementation Checklist

> Checklist giao việc kỹ thuật.  
> Mỗi mục chỉ tick khi code + test + integration liên quan đã hoàn thành.

## A. Planning gates

- [ ] GAME_PRODUCT_PLAN được duyệt.
- [ ] GAME_USER_FLOW được duyệt.
- [ ] MISSION_SYSTEM_DESIGN được duyệt.
- [ ] GAME_ENGINE_TECH_PLAN được duyệt.
- [ ] GAME_DATA_MODEL_PLAN được duyệt.
- [ ] QUESTION_GENERATION_PLAN được duyệt.
- [ ] MISSION_CONTENT_PLAN được duyệt.
- [ ] Chốt termsPerMission default.
- [ ] Chốt final remainder rule.
- [ ] Chốt SRS aggregation rule.
- [ ] Chốt study_sessions metric semantics.

## B. Database: deck ordering

- [ ] Tạo migration qua Supabase workflow chuẩn.
- [ ] Add deck_terms.order_index.
- [ ] Backfill deterministic theo deck.
- [ ] Add index/unique constraint phù hợp.
- [ ] Không làm mất deck_terms row.
- [ ] Verify sample production decks.
- [ ] Existing deck CRUD vẫn hoạt động.
- [ ] Existing deckService.listTerms regression test pass.
- [ ] RLS không bị nới rộng.
- [ ] Supabase advisors pass.

## C. Database: mission progress

- [ ] Create game_mission_progress.
- [ ] PK/FK đúng.
- [ ] curriculum_fingerprint required.
- [ ] mission_index constraint.
- [ ] status constraint.
- [ ] score/accuracy range.
- [ ] unique user/deck/fingerprint/index.
- [ ] ownership RLS SELECT.
- [ ] ownership RLS INSERT.
- [ ] ownership RLS UPDATE USING.
- [ ] ownership RLS UPDATE WITH CHECK.
- [ ] indexes cho Mission Map query.
- [ ] user A không đọc user B.
- [ ] user A không update user B.
- [ ] anon không write.
- [ ] migration test pass.

## D. Optional completion RPC

- [ ] Quyết định direct upsert hay RPC.
- [ ] Nếu RPC: không nhận user_id từ client.
- [ ] auth.uid() required.
- [ ] validate score ranges.
- [ ] best score monotonic.
- [ ] attempt count atomic.
- [ ] no SECURITY DEFINER unless justified.
- [ ] revoke PUBLIC execute nếu tạo routine.
- [ ] grant only intended roles.
- [ ] RLS/security test pass.

## E. Game config

- [ ] Extract GameHubConfig type khỏi page.
- [ ] Add mission game access tier.
- [ ] Add missionEnabled per deck.
- [ ] Add termsPerMission config/default.
- [ ] Add scriptKey config/default.
- [ ] Zod schema cho game_hub_config.
- [ ] Invalid JSON fails safe.
- [ ] AdminGamesPage visual controls.
- [ ] Không textarea JSON.
- [ ] Free/Pro behavior test.

## F. Shared game term loader

Target file:
- [ ] src/services/supabase/gameMission.service.ts

Requirements:
- [ ] Load only readable deck.
- [ ] Direct terms by default.
- [ ] Exclude deleted global_terms.
- [ ] order_index explicit.
- [ ] No recursive parent aggregation by default.
- [ ] Pagination/row-limit safe.
- [ ] Return shared DTO, không synthetic user status.
- [ ] Missing order diagnostics.
- [ ] Service tests.

## G. Domain types

Target:
- [ ] mission.types.ts
- [ ] game types nếu shared

Types:
- [ ] MissionStageType.
- [ ] MissionQuestionType.
- [ ] GameTerm.
- [ ] MissionScript.
- [ ] MissionDefinition.
- [ ] GeneratedStage.
- [ ] QuestionDefinition.
- [ ] AnswerRecord.
- [ ] LearningSignal.
- [ ] MissionAttemptState.
- [ ] Diagnostics.

- [ ] Không chứa JSX trong serializable domain types.
- [ ] Không import Supabase client vào types/domain.

## H. Mission splitter

Target:
- [ ] missionSplitter.ts

Tests:
- [ ] exactly 10.
- [ ] 80 → 8 missions.
- [ ] remainder >=5.
- [ ] remainder <5 merge rule.
- [ ] no input mutation.
- [ ] same input same output.
- [ ] empty deck rejected.
- [ ] min term rule.

## I. Curriculum fingerprint

Target:
- [ ] curriculumFingerprint.ts

Inputs:
- [ ] deck ID.
- [ ] ordered term IDs.
- [ ] termsPerMission.
- [ ] script key/version.
- [ ] generator version.
- [ ] override version/hash.

Tests:
- [ ] same input same fingerprint.
- [ ] order change changes fingerprint.
- [ ] term add/remove changes.
- [ ] script version changes.
- [ ] generator version changes.
- [ ] user ID absent.

## J. Script registry

- [ ] scriptRegistry.ts.
- [ ] standardMission.ts.
- [ ] finalBoss.ts optional MVP.
- [ ] Script version explicit.
- [ ] Unknown script fails typed.
- [ ] No DB-stored executable code.

## K. Answer normalization

Target:
- [ ] generators/answerNormalization.ts

Tests:
- [ ] trim.
- [ ] whitespace collapse.
- [ ] case normalization.
- [ ] smart apostrophe.
- [ ] hyphen preserve.
- [ ] accent preserve.
- [ ] phrase.
- [ ] sentence policy.

## L. Distractors

Target:
- [ ] generators/distractors.ts

- [ ] Remove target.
- [ ] Remove duplicate normalized translation.
- [ ] Deterministic seed.
- [ ] Same mission pool first.
- [ ] POS ranking optional.
- [ ] Known ambiguity exclusions.
- [ ] Insufficient pool diagnostic.
- [ ] Unit tests.

## M. Matching generator

- [ ] Eligibility.
- [ ] 5-pair default.
- [ ] Unique translations.
- [ ] Stable question IDs.
- [ ] Options serializable.
- [ ] Deterministic.
- [ ] Tests duplicate/short pool.

## N. Listening Choice generator

- [ ] Audio eligibility.
- [ ] Translation eligibility.
- [ ] Distractors.
- [ ] Replay independent grading.
- [ ] Stable question ID.
- [ ] Tests no audio/no translation.

## O. Listening Typing generator

- [ ] Audio eligibility.
- [ ] source length threshold.
- [ ] normalized grading.
- [ ] phrase support.
- [ ] long sentence exclude.
- [ ] tests.

## P. Meaning Recall generator

- [ ] translation prompt.
- [ ] source answer.
- [ ] ambiguity detection.
- [ ] same translation collision skip.
- [ ] tests.

## Q. Context Cloze generator

- [ ] exact boundary match.
- [ ] case-insensitive safe match.
- [ ] multi-word target.
- [ ] punctuation adjacency.
- [ ] multiple occurrence policy.
- [ ] inflected-only example skip.
- [ ] stable sourceExampleIndex.
- [ ] tests.

## R. Spelling generator

- [ ] prompt source priority.
- [ ] source answer.
- [ ] duplicate modality control via planner.
- [ ] tests.

## S. Generator registry/version

- [ ] generatorRegistry.ts.
- [ ] GENERATOR_VERSION.
- [ ] version included fingerprint.
- [ ] all generator diagnostics normalized.
- [ ] unknown type fails typed.

## T. Mission planner

Target:
- [ ] missionPlanner.ts

- [ ] Learn covers all terms.
- [ ] Graded exposure target.
- [ ] Distribute modalities.
- [ ] Avoid excessive same-term repetition.
- [ ] Boss >=50% typed/free recall.
- [ ] No user progress input.
- [ ] Seed deterministic.
- [ ] Undercoverage diagnostics.
- [ ] Unit tests.

## U. Readiness validator

Target:
- [ ] missionReadiness.ts

Report:
- [ ] playable.
- [ ] blocking.
- [ ] warnings.
- [ ] translation coverage.
- [ ] audio coverage.
- [ ] cloze coverage.
- [ ] recall coverage.

- [ ] Used by admin preview.
- [ ] Used before learner start.
- [ ] Blocking issue prevents start.
- [ ] Warnings don't crash.
- [ ] Tests.

## V. Scoring

Target:
- [ ] missionScoring.ts

- [ ] first try full.
- [ ] retry/hint partial.
- [ ] wrong zero.
- [ ] Learn excluded.
- [ ] mission accuracy defined.
- [ ] firstTryAccuracy separate.
- [ ] tests.

## W. Reducer/state machine

Target:
- [ ] missionReducer.ts

Actions:
- [ ] start.
- [ ] stage start.
- [ ] answer.
- [ ] hint.
- [ ] retry.
- [ ] complete question.
- [ ] complete stage.
- [ ] next stage.
- [ ] pause/resume.
- [ ] complete mission.
- [ ] sync state.

Tests:
- [ ] legal transitions.
- [ ] illegal double submit ignored/rejected.
- [ ] required stage order.
- [ ] completion only once.
- [ ] replay reset runtime only.

## X. Dexie persistence

- [ ] Review existing studyLocalDb version.
- [ ] Add next Dexie schema version.
- [ ] activeGameMissions table.
- [ ] pendingGameMissionSync table.
- [ ] gameMissionLocalDb.ts.
- [ ] snapshot key includes user/deck/fingerprint/index.
- [ ] snapshot Zod validation.
- [ ] save after meaningful transitions.
- [ ] restore.
- [ ] stale fingerprint cleanup.
- [ ] corrupt snapshot cleanup.
- [ ] pending sync survives reload.
- [ ] tests with fake-indexeddb.

## Y. Mission sync service

- [ ] gameMissionSync.service.ts.
- [ ] complete progress sync.
- [ ] SRS pending actions sync.
- [ ] study session patch if applicable.
- [ ] retry.
- [ ] do not clear local before success.
- [ ] idempotency/retry behavior tested.

## Z. Mission Deck Page

Target:
- [ ] MissionDeckPage.tsx.

- [ ] React Query load deck.
- [ ] load ordered terms.
- [ ] compute fingerprint.
- [ ] split missions.
- [ ] load current progress.
- [ ] locked/available/in_progress/completed.
- [ ] Start.
- [ ] Continue.
- [ ] Replay.
- [ ] Free/Pro guard.
- [ ] Empty/Error state.
- [ ] Mobile layout.
- [ ] component tests.

## AA. Mission Game Page

Target:
- [ ] MissionGamePage.tsx.

- [ ] route params validation.
- [ ] mission definition load.
- [ ] active snapshot restore.
- [ ] reducer controller.
- [ ] stage renderer map.
- [ ] exit ConfirmModal.
- [ ] sync error Retry.
- [ ] completion navigation.
- [ ] stop audio cleanup.
- [ ] invalid mission handling.
- [ ] tests.

## AB. Briefing component

- [ ] Mission number.
- [ ] target term count.
- [ ] activity preview.
- [ ] Start button.
- [ ] accessible.
- [ ] replay tutorial not noisy.

## AC. Learn Stage

- [ ] source_text.
- [ ] IPA.
- [ ] translation.
- [ ] example.
- [ ] audio replay.
- [ ] missing optional fields graceful.
- [ ] no graded score.

## AD. Matching Stage UI

- [ ] 5 pairs desktop/mobile.
- [ ] touch.
- [ ] keyboard if feasible.
- [ ] Check action.
- [ ] correct/wrong feedback.
- [ ] correction.
- [ ] no browser buttons/raw styles violating project rule.

## AE. Listening Stage UI

- [ ] audio controls.
- [ ] choice renderer.
- [ ] typing renderer.
- [ ] Enter submit.
- [ ] replay.
- [ ] unavailable audio fallback.
- [ ] double submit guard.

## AF. Context Stage UI

- [ ] cloze render.
- [ ] input.
- [ ] hint.
- [ ] retry.
- [ ] answer correction.
- [ ] long sentence mobile wrap.

## AG. Recall Stage UI

- [ ] translation prompt.
- [ ] typed answer.
- [ ] hint.
- [ ] retry.
- [ ] correction.

## AH. Boss Stage UI

- [ ] HP/progress.
- [ ] mixed question renderer reuse.
- [ ] correct damage.
- [ ] accessible progress text.
- [ ] no infinite fail lock.

## AI. Result

- [ ] completion.
- [ ] accuracy.
- [ ] first try stats.
- [ ] wrong/retry.
- [ ] best score.
- [ ] Next.
- [ ] Replay.
- [ ] Back to deck.
- [ ] no fake persistent XP.

## AJ. Routing

- [ ] MissionDeckPage lazyWithChunkRecovery.
- [ ] MissionGamePage lazyWithChunkRecovery.
- [ ] games_module FeatureGuard.
- [ ] protected routes.
- [ ] deep-link refresh.
- [ ] stale chunk pattern respected.

## AK. Game Hub integration

- [ ] Mission card.
- [ ] deck progress.
- [ ] Start/Continue CTA.
- [ ] allowed deck filter.
- [ ] Pro lock.
- [ ] config schema.
- [ ] no vocabularyService.list just to count if avoidable.
- [ ] loading/error states.

## AL. AdminGames integration

- [ ] Mission Free/Pro.
- [ ] per-deck mission enabled.
- [ ] termsPerMission.
- [ ] scriptKey.
- [ ] readiness status.
- [ ] blocked publish.
- [ ] visual controls.
- [ ] audit log.
- [ ] no raw JSON editor.

## AM. SRS adapter

Target:
- [ ] missionSrsAdapter.ts.

- [ ] neutral LearningSignal.
- [ ] aggregate per globalTermId.
- [ ] wrong → dont_know policy.
- [ ] retry/hint → difficult policy.
- [ ] strong first-try recall → know policy.
- [ ] no automatic memorized.
- [ ] one pending action per term/session.
- [ ] load current SRS snapshot.
- [ ] new term default snapshot.
- [ ] scheduleReview reuse.
- [ ] tests mixed outcomes.

## AN. study_sessions

- [ ] Add game_mission StudyMode.
- [ ] Decide metric semantics.
- [ ] create session.
- [ ] end session.
- [ ] analytics regression.
- [ ] Java stats API impact reviewed if relevant.
- [ ] dashboard not distorted.

## AO. Audio

- [ ] use speak().
- [ ] pass audioUrl.
- [ ] pass globalTermId.
- [ ] pass source language.
- [ ] stop on unmount.
- [ ] broken audio fallback.
- [ ] no bulk TTS generation.
- [ ] audio test.

## AP. Accessibility

- [ ] focus visible.
- [ ] no color-only correctness.
- [ ] audio aria labels.
- [ ] progress aria values.
- [ ] keyboard typing flow.
- [ ] modal focus trap via shared component.
- [ ] screen-size testing.

## AQ. Mobile

- [ ] no horizontal overflow.
- [ ] matching touch targets.
- [ ] fixed/sticky controls don't cover content.
- [ ] mobile keyboard safe.
- [ ] long translation wraps.
- [ ] landscape sanity.

## AR. Error handling

- [ ] typed domain errors.
- [ ] content error UI.
- [ ] network error UI.
- [ ] access error.
- [ ] invalid route.
- [ ] sync retry.
- [ ] no raw SQL/backend error leaked.

## AS. Security

- [ ] service_role absent frontend.
- [ ] RLS enabled new table.
- [ ] own-row policies.
- [ ] no user_metadata authorization.
- [ ] RPC execute privileges explicit.
- [ ] advisors.
- [ ] cross-user tests.

## AT. Performance

- [ ] no unbounded >1000 select.
- [ ] only selected mission generated.
- [ ] query counts efficiently.
- [ ] audio dedup/cache.
- [ ] avoid full vocabulary load.
- [ ] React render profiling if needed.

## AU. Unit tests

- [ ] splitter.
- [ ] fingerprint.
- [ ] normalization.
- [ ] distractors.
- [ ] every generator.
- [ ] planner.
- [ ] readiness.
- [ ] scoring.
- [ ] reducer.
- [ ] SRS adapter.
- [ ] local persistence.

## AV. Component tests

- [ ] Learn.
- [ ] Matching.
- [ ] Listening.
- [ ] Context.
- [ ] Recall.
- [ ] Boss.
- [ ] Result.
- [ ] Mission Map.

## AW. E2E

- [ ] Start Free mission.
- [ ] Block Pro.
- [ ] Complete.
- [ ] Unlock next.
- [ ] Replay.
- [ ] Refresh/resume.
- [ ] Exit confirm.
- [ ] Missing audio.
- [ ] Invalid mission URL.
- [ ] sync retry scenario.
- [ ] mobile viewport.

## AX. Build/release gates

For every implementation commit:
- [ ] inspect git status.
- [ ] inspect diff.
- [ ] sensitive data scan.
- [ ] pnpm tsc -b exit 0.
- [ ] relevant tests pass.

Release:
- [ ] pnpm test.
- [ ] pnpm build.
- [ ] Playwright relevant suite.
- [ ] Supabase migration verified.
- [ ] advisors pass.
- [ ] content pilot checklist pass.
- [ ] feature flag rollback tested.

## AY. Documentation

- [ ] Update CLAUDE.md khi architecture thực tế được implement.
- [ ] Update README nếu feature public-facing.
- [ ] Document migration.
- [ ] Document content override workflow.
- [ ] Document admin publish process.

## AZ. Final MVP sign-off

- [ ] Engineering sign-off.
- [ ] Content sign-off.
- [ ] QA sign-off.
- [ ] Security/RLS sign-off.
- [ ] Product flow sign-off.
- [ ] Pilot deck published.
