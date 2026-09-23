# Mission System Design

> Mục tiêu: định nghĩa domain model và state machine cho Mission Game sao cho curriculum dùng chung, deterministic, versionable và độc lập với UI.

## 1. Design constraints

Mission System phải thỏa:

1. Cùng deck + cùng curriculum version → cùng target terms.
2. User progress không được thay đổi target terms.
3. Question set có thể sinh từ shared vocabulary.
4. Runtime có thể resume.
5. Deck update không được âm thầm thay content của attempt cũ.
6. Engine không phụ thuộc trực tiếp vào component React.
7. Một script có thể dùng lại cho nhiều deck.
8. Question type thiếu dữ liệu phải degrade an toàn.

## 2. Domain hierarchy

~~~text
Playable Deck
  ├─ OrderedTerm[]
  ├─ CurriculumFingerprint
  └─ MissionDefinition[]
       ├─ targetTermIds[]
       ├─ scriptKey
       └─ StageDefinition[]
            └─ QuestionDefinition[]
~~~

Runtime:

~~~text
MissionDefinition
      ↓
MissionAttempt
      ↓
StageRuntime
      ↓
QuestionRuntime
      ↓
AttemptResult
~~~

## 3. Playable Deck

Không phải mọi deck đều tự động playable.

Một deck chỉ playable nếu:

- admin allowed;
- subscription rules hợp lệ;
- có minimum valid terms;
- term ordering deterministic;
- shared content vượt quality gate;
- curriculum fingerprint được tạo thành công.

Parent deck có descendants không mặc định playable.

## 4. Ordered terms

### 4.1. Vấn đề hiện tại

deckService.listTerms() đang order deck_terms theo created_at. created_at là chronological metadata, không phải curriculum ordering contract.

Ngoài ra listTerms() hiện có behavior:
- lấy deck + descendants;
- dedupe global terms bằng Map.

Behavior này phù hợp browse/study hiện tại nhưng không đủ rõ cho shared game curriculum.

### 4.2. Requirement

Game cần API riêng:

~~~text
listPlayableDeckTerms(deckId)
→ direct terms only by default
→ active global_terms only
→ deterministic order
~~~

Data Model Plan đề xuất thêm order_index cho deck_terms.

Không dùng array order từ query không có explicit ORDER BY.

## 5. Mission split algorithm

Input:

- orderedTermIds
- termsPerMission, default 10

Algorithm:

~~~text
Mission 0 = terms[0..9]
Mission 1 = terms[10..19]
...
~~~

Rules:

- không shuffle target terms trước split;
- final mission nhận remainder;
- duplicate global_term_id trong cùng deck không được phép bởi current PK;
- soft-deleted term bị loại trước fingerprint/split;
- nếu valid term count < minimum, deck không playable.

Function phải pure và testable.

Ví dụ API:

~~~ts
splitIntoMissions(terms, {
  termsPerMission: 10,
  minTermsPerMission: 5,
})
~~~

Nếu final mission có quá ít term:
- mặc định vẫn giữ remainder nếu >= 1 và deck đã publish như vậy;
- content policy có thể merge với mission trước để bảo đảm chất lượng;
- algorithm cuối cùng phải deterministic và được chốt trước rollout.

Khuyến nghị MVP: merge remainder < 5 vào mission trước.

## 6. Curriculum fingerprint

Fingerprint bảo vệ progress khỏi thay đổi curriculum.

Input tối thiểu:

~~~text
deck_id
ordered active global_term_ids
terms_per_mission
script_key
script_version
generator_version
manual_override_version/hash
~~~

Output:
- stable hash string.

Ví dụ conceptual:

~~~text
sha256(canonicalJson(input))
~~~

Không đưa user_id, score hoặc SRS vào fingerprint.

### Khi fingerprint đổi

- attempt local cũ không resume.
- progress của fingerprint cũ không unlock version mới.
- old records có thể giữ để audit/history.
- UI bắt đầu curriculum version mới.

## 7. Mission identity

Không dùng chỉ missionIndex làm identity.

Logical key:

~~~text
deck_id
+ curriculum_fingerprint
+ mission_index
~~~

Mission index nên 0-based trong code, có thể hiển thị 1-based trong UI.

## 8. Script

Script là reusable config/domain constant.

Ví dụ TypeScript conceptual:

~~~ts
interface MissionScript {
  key: string
  version: number
  stages: StageDefinition[]
}

interface StageDefinition {
  type: MissionStageType
  questionCount?: number
  required?: boolean
  grading?: GradingPolicy
  retry?: RetryPolicy
}
~~~

Không lưu callback/function trong DB.

## 9. Standard MVP script

~~~text
briefing
learn       target terms
matching    5 prompts
listening   5 prompts
context     5 prompts
recall      5 prompts
boss        5 prompts
result
~~~

Question counts là defaults. Generator có thể giảm count nếu eligibility không đủ nhưng phải report diagnostics.

## 10. Stage types

Domain enum:

- learn
- matching
- listening_choice
- listening_typing
- context_cloze
- meaning_recall
- spelling
- boss

UI có thể nhóm nhiều question types thành một visual “Listening Stage”.

Result không cần được model như graded stage nếu chỉ là presentation.

## 11. Stage eligibility

Mỗi generator trả:

~~~ts
type GenerationResult =
  | { kind: 'generated'; questions: QuestionDefinition[] }
  | { kind: 'insufficient-data'; diagnostics: Diagnostic[] }
~~~

Runtime:
- required stage thiếu data → mission readiness fail trước khi start.
- optional stage thiếu data → skip và log reason.

Không throw ngẫu nhiên giữa session vì một term thiếu example.

## 12. Coverage planner

Question generator không chỉ random N term.

Planner cần:
1. target mọi term xuất hiện trong Learn.
2. ưu tiên mỗi term có ít nhất 2 graded exposures toàn mission.
3. phân phối modality.
4. tránh cùng term lặp liên tiếp quá nhiều.
5. Boss ưu tiên terms chưa được free-recall ở stage trước nếu có.

Planner dùng shared content eligibility, không dùng personal accuracy.

## 13. Determinism

Underlying question definitions phải reproducible cho QA.

Dùng seed từ:

~~~text
curriculumFingerprint
+ missionIndex
+ generatorVersion
~~~

Seed quyết định:
- term selection;
- distractor set;
- cloze selection.

Per-attempt UI có thể shuffle option order bằng attempt seed riêng nếu muốn, nhưng correct answer/question identity không thay đổi.

## 14. Question identity

Mỗi generated question có stable ID, ví dụ hash:

~~~text
missionKey
+ questionType
+ targetTermId
+ sourceExampleId/index
+ generatorVersion
~~~

Dùng cho:
- debugging;
- content report;
- overrides;
- analytics.

## 15. Manual override

Manual content không được hardcode trong component.

Conceptual override:

~~~ts
interface QuestionOverride {
  questionId?: string
  deckId: string
  curriculumFingerprint?: string
  targetTermId: string
  questionType: MissionQuestionType
  prompt?: string
  acceptedAnswers?: string[]
  distractorTermIds?: string[]
  disabled?: boolean
}
~~~

Storage cụ thể có thể là DB table ở phase content tooling hoặc versioned artifact trước đó.

Override được apply sau auto-generation, trước readiness validation.

## 16. Mission state machine

~~~text
idle
  ↓ START
loading
  ├─ ERROR → error
  └─ READY → briefing
              ↓
            active
              │
        ┌─────┴──────┐
        ▼            ▼
    stage_active   paused
        │            │
        └────RESUME──┘
        ↓
   stage_complete
        ↓
 next stage / boss
        ↓
   mission_complete
        ↓
      syncing
       ├─ fail → sync_error
       └─ ok   → completed
~~~

UI phase names có thể khác nhưng transition logic phải explicit.

## 17. Attempt runtime model

Conceptual:

~~~ts
interface MissionAttemptState {
  attemptId: string
  deckId: string
  curriculumFingerprint: string
  missionIndex: number
  scriptKey: string
  scriptVersion: number

  stageIndex: number
  questionIndex: number

  answers: AnswerRecord[]
  startedAt: string
  updatedAt: string
  status: 'in_progress' | 'completed'
}
~~~

Không persist toàn VocabularyItem duplicate nếu có thể rebuild từ fingerprint + IDs, nhưng local snapshot có thể cache content để offline-ish resume.

## 18. Answer record

~~~ts
interface AnswerRecord {
  questionId: string
  targetTermId: string
  type: MissionQuestionType

  attempts: number
  hintLevel: number
  isCorrect: boolean
  firstTryCorrect: boolean
  score: number

  answeredAt: string
}
~~~

Raw userAnswer chỉ persist nếu thực sự cần product/debugging và đã xem xét privacy. MVP có thể không persist server-side raw text.

## 19. Grading policies

### Recognition
- correct option → correct.
- no fuzzy semantic grading.

### Typed source_text
Normalizer theo QUESTION_GENERATION_PLAN.

### Retry
Script định nghĩa max attempts.

Default:
- max 2 attempts;
- hint trước retry thứ hai;
- sau max attempt → reveal.

## 20. Scoring

Per question conceptual:

- first try correct = 100%.
- correct after retry/hint = 50%.
- wrong after max retries = 0%.

Stage score = sum / max.

Mission accuracy:
- số first/ultimately correct tùy metric phải ghi rõ.
- UI nên dùng finalCorrect / total cho “Accuracy”.
- Analytics giữ riêng firstTryAccuracy.

Không cộng Learn cards vào denominator.

## 21. Completion rule

MVP:
- user đi hết required stages → completed.
- không có pass threshold.
- score thấp vẫn completed.
- replay allowed.

Lý do:
- tránh content bug khóa curriculum;
- tách completion khỏi mastery.

Nếu tương lai cần mastery gate, phải là product change riêng.

## 22. Unlock rule

~~~text
Mission 0 → available
Mission N → available iff Mission N-1 completed
Final Boss → available iff all standard missions completed
~~~

Completed status keyed theo current curriculum fingerprint.

## 23. Boss system

Boss không phải domain riêng phức tạp.

Boss = stage compositor có:
- target HP = total questions;
- mỗi correct = damage;
- visual state.

Boss question distribution default:
- >= 50% typed/free recall.
- <= 50% recognition.
- không toàn matching/MCQ.

Boss result đóng góp vào mission score.

## 24. SRS adapter boundary

Mission Engine phát ra neutral learning signals:

~~~ts
interface LearningSignal {
  globalTermId: string
  questionType: MissionQuestionType
  firstTryCorrect: boolean
  eventuallyCorrect: boolean
  hintUsed: boolean
}
~~~

missionSrsAdapter chuyển signal → ReviewAction.

Engine không import trực tiếp spacedRepetition nếu có thể tránh; adapter chịu trách nhiệm integration.

### Progress snapshot

Để scheduleReview chính xác, persistence layer có thể load user_terms snapshot cho target terms.

Điều cấm:
- dùng snapshot để đổi term/question set.

## 25. Multiple signals cho một term

Một term có thể xuất hiện nhiều challenge.

Không nên gọi SRS update 4 lần trong cùng mission như 4 ngày review.

Adapter cần aggregate term-level signal.

Ví dụ:

~~~text
2 correct first try + 1 wrong
→ difficult

all recall challenges first try correct
→ know

never graded / only Learn exposure
→ no SRS action
~~~

Aggregation policy phải unit test.

## 26. Session persistence

MVP options:

### Preferred
Reuse local-first patterns của Study bằng Dexie/pending sync.

### Minimum viable
sessionStorage:
- runtime snapshot;
- restore cùng browser/tab scope;
- Supabase sync ở completion.

Nếu dùng sessionStorage, tài liệu release phải ghi rõ limitation; không gọi đây là offline support.

## 27. Preload

Trước active stage:
- preload question definitions;
- có thể preload audio URLs/cache best effort.

Không gọi Edge Function generate audio hàng loạt không cần thiết khi audio_url đã có.

## 28. Readiness validation

Trước publish deck:

- ordered terms valid.
- minimum term count.
- translation coverage đủ cho required recognition stage.
- audio coverage đủ cho Listening.
- cloze eligibility đủ cho Context.
- no ambiguous duplicate answers vượt threshold.
- generator diagnostics không có blocking issue.

Trước start mission vẫn revalidate fingerprint/content availability để phòng dữ liệu thay đổi.

## 29. Error model

Domain errors nên typed:

- DeckNotPlayableError
- MissionNotFoundError
- CurriculumChangedError
- InsufficientContentError
- AccessDeniedError
- SessionSyncError

UI map error → user-friendly message.

Không show raw Supabase/Postgres error cho user.

## 30. Testing invariants

Bắt buộc test:

1. split deterministic.
2. fingerprint deterministic.
3. fingerprint đổi khi term order đổi.
4. fingerprint đổi khi script/generator version đổi.
5. same user progress không ảnh hưởng definition.
6. different users nhận same target term IDs.
7. deleted term không vào new mission.
8. duplicate distractor không sinh.
9. insufficient optional stage skip an toàn.
10. required stage insufficient → readiness fail.
11. resume fingerprint mismatch bị reject.
12. replay không reset completion.
13. SRS aggregates one action/term/session theo policy.

## 31. Definition of Done

Mission System Design được coi là implement đúng khi:
- domain types tồn tại độc lập UI;
- shared curriculum deterministic;
- term ordering explicit;
- version/fingerprint hoạt động;
- state machine có test;
- generator/planner có diagnostics;
- progress keyed theo curriculum;
- SRS integration không cá nhân hóa curriculum;
- deck mới pass readiness có thể chơi mà không thay engine.
