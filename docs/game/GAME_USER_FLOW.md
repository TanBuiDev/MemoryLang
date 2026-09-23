# MemoryLang Game User Flow

> Mục tiêu: mô tả toàn bộ learner journey của Mission Game, bao gồm happy path, resume, error, lock, Free/Pro và mobile behavior.

## 1. Entry points

User có thể vào Mission Game từ:

1. Sidebar / Game Hub.
2. Deck Detail nếu deck được publish cho game.
3. Dashboard “Continue learning” trong phase sau.
4. Result page → Next Mission.
5. Review page không điều hướng vào curriculum mission; Review là flow riêng.

MVP bắt buộc hỗ trợ Game Hub → Deck → Mission.

## 2. Top-level flow

~~~text
/app/games
    ↓
Select playable deck
    ↓
/app/games/mission/:deckId
    ↓
Mission Map
    ↓
Select available mission
    ↓
/app/games/mission/:deckId/:missionIndex
    ↓
Briefing
    ↓
Learn
    ↓
Matching
    ↓
Listening
    ↓
Context
    ↓
Recall
    ↓
Boss
    ↓
Result
    ↓
Next mission / Replay / Exit
~~~

Route names là đề xuất kỹ thuật và có thể điều chỉnh, nhưng URL phải encode deck + mission rõ ràng để refresh/deep-link hoạt động.

## 3. Game Hub

### 3.1. Loading

Hiển thị AppLoading hoặc skeleton theo pattern hiện tại.

Không render deck selector rỗng rồi mới nhảy layout.

### 3.2. Data

Nguồn:
- deckService.list(user.id)
- app_settings.game_hub_config
- subscription state
- mission progress

Chỉ hiển thị deck:
- allowed = true;
- user có quyền đọc deck;
- deck đủ Game Readiness;
- không bị soft-disabled bởi content/admin.

### 3.3. Parent deck

Quy tắc MVP:

- Parent deck có child decks chủ yếu là grouping/catalog.
- Chỉ deck được cấu hình explicit là playable mới có CTA “Học bằng Mission”.
- Không mặc định cộng toàn bộ descendant terms thành một curriculum game vì ordering giữa child decks có thể không ổn định.
- Nếu tương lai muốn parent playable, cần explicit child order + aggregation rule.

### 3.4. Card thông tin

Deck card hiển thị:
- name;
- description ngắn;
- term count;
- mission count;
- progress X/Y;
- Free/Pro;
- Continue/Start.

Không hiển thị XP lâu dài nếu chưa persist.

## 4. Subscription flow

### Free deck
CTA hoạt động bình thường.

### Pro deck + Free user
User click:
- không navigate vào mission content;
- mở upgrade prompt/modal theo Subscription UX hiện tại;
- giải thích deck/game cần Pro;
- cho phép đóng modal.

Không dùng window.alert hoặc window.confirm.

### Subscription thay đổi trong session
Nếu user mất entitlement trong khi đã mở mission:
- không cắt ngang câu hỏi đang active;
- kiểm tra entitlement trước khi tạo attempt mới/resume server session;
- product decision cuối cùng phải nhất quán với Subscription module.

## 5. Mission Map

### 5.1. Layout

~~~text
Deck: TEST 01
Progress: 3/8

Mission 01  Completed
Mission 02  Completed
Mission 03  Completed
Mission 04  Available
Mission 05  Locked
...
Final Boss  Locked
~~~

### 5.2. Mission status

#### locked
- Không clickable để bắt đầu.
- Có lý do: “Hoàn thành Mission 04 trước”.

#### available
- CTA “Bắt đầu”.

#### in_progress
- CTA “Tiếp tục”.
- Hiển thị stage hiện tại nếu có local/session state.

#### completed
- CTA “Chơi lại”.
- Hiển thị best score/accuracy nếu persisted.

### 5.3. New curriculum version

Nếu curriculum fingerprint hiện tại khác progress version:
- không silently dùng progress cũ để unlock.
- hiển thị progress cho version hiện tại.
- old progress vẫn giữ lịch sử nếu schema hỗ trợ.
- admin/content change phải có release note nội bộ.

## 6. Start Mission

Khi user click mission available:

1. Validate deck access.
2. Validate mission index.
3. Load ordered shared terms.
4. Validate content eligibility.
5. Build deterministic mission definition/runtime.
6. Create/resume session.
7. Navigate vào Briefing.

Nếu step 3–5 fail do content:
- không đánh dấu mission started/completed.
- hiển thị ErrorState có CTA quay lại deck.
- log/report content error.

## 7. Briefing

Hiển thị:
- mission number;
- số target terms;
- estimated activity count;
- stage icons;
- Start button.

Không show toàn bộ đáp án.

First mission có thể giải thích controls ngắn.

Replay không cần tutorial dài.

## 8. Learn Stage

### 8.1. Mỗi Learn card

Hiển thị tối thiểu:
- source_text;
- IPA nếu có;
- audio replay;
- translation;
- một example phù hợp nếu có.

Optional:
- part_of_speech;
- image.

### 8.2. Interaction

User:
- nghe audio;
- xem meaning;
- Next.

Learn exposure không tính accuracy.

### 8.3. Audio error

Nếu audio_url lỗi:
1. speak() thử cơ chế hiện có.
2. fallback TTS nếu configured.
3. SpeechSynthesis fallback.
4. Nếu toàn bộ fail: hiển thị audio unavailable, cho phép tiếp tục.

Không block mission chỉ vì audio của một term lỗi, trừ Listening Stage không còn đủ eligible questions.

## 9. Matching Stage

### 9.1. Layout

Hai cột:
- source terms;
- translations.

Tối đa số pair phù hợp màn hình, đề xuất 5.

### 9.2. Flow

1. User chọn/move pairs.
2. User bấm Check.
3. Correct pair highlight positive.
4. Wrong pair highlight error.
5. User được xem correction.
6. Continue.

Không tính một lần swap UI là answer; grading xảy ra tại Check.

### 9.3. Repeat

Nếu script yêu cầu repeat wrong:
- wrong term có thể xuất hiện ở challenge sau;
- target curriculum không đổi.

## 10. Listening Stage

Có hai presentation.

### listening_choice

1. Audio auto-play nếu setting cho phép.
2. User có replay button.
3. Chọn translation.
4. Submit.
5. Feedback.

### listening_typing

1. Play audio.
2. User nhập source text.
3. Enter/Submit.
4. Normalize answer.
5. Feedback + correction.

Audio replay count không làm giảm score ở MVP.

## 11. Context Stage

### 11.1. Cloze

Hiển thị example đã được validate:

~~~text
The company will ______ the office next month.
~~~

User nhập target term hoặc chọn option tùy script.

### 11.2. Không đủ example

Nếu target không có exact safe cloze:
- generator không tạo question.
- stage dùng term khác.
- nếu stage thiếu minimum questions, stage được skip với runtime record.
- không tạo câu “đoán” từ AI.

## 12. Recall Stage

Default:
- prompt = translation;
- answer = source_text;
- typed input.

Ví dụ:

~~~text
“nhà kho”
→ [__________]
~~~

Feedback:
- exact/normalized accepted → correct;
- wrong → hint/retry tùy script;
- sau retry vẫn sai → show answer.

Free recall có trọng số learning cao hơn recognition trong SRS adapter.

## 13. Hint flow

Hint không được biến câu hỏi thành lộ đáp án ngay.

Hint levels đề xuất:

1. First letter / word count.
2. IPA hoặc replay audio.
3. Partial reveal.

Sau hint:
- answer có thể được tính partial score;
- SRS signal không được mạnh bằng first-try correct.

## 14. Wrong-answer flow

~~~text
Answer
  ↓
Wrong
  ↓
Feedback ngắn
  ↓
Hint / retry
  ↓
Corrected?
 ├─ Yes → continue, partial result
 └─ No  → reveal answer, continue
~~~

Không dùng flow:
Wrong → reveal instantly → Next
cho mọi challenge, vì không tạo corrective retrieval.

## 15. Boss Stage

Boss là cumulative check của mission.

### UI
- Boss HP/progress bar.
- N challenge.
- Correct giảm HP.
- Wrong không hồi HP ở MVP.

### Content
Boss trộn:
- listening typing;
- recall;
- cloze;
- spelling.

Không dùng toàn MCQ.

### Completion
Boss không được block user vô hạn.
Sau khi làm hết challenge:
- mission kết thúc dù score thấp;
- result cho phép replay.

## 16. Result Screen

Hiển thị:

- Mission completed.
- Accuracy.
- Correct first try.
- Correct after retry.
- Wrong.
- Terms strengthened/reviewed.
- Best score nếu có.
- Previous best comparison nếu persisted.

CTA:
1. Next Mission.
2. Replay.
3. Back to Deck.

Không show persistent XP nếu backend chưa lưu XP.

## 17. Next Mission

Nếu current completed:
- unlock next.
- CTA next đi thẳng Briefing của mission tiếp theo.

Final standard mission:
- nếu Final Boss enabled → unlock Final Boss;
- nếu chưa có Final Boss → deck completion state.

## 18. Replay

Replay:
- không reset completed status.
- latest attempt có thể thấp hơn best attempt.
- best score không giảm.
- SRS actions chỉ được ghi theo policy đã chốt, tránh spam “know” vô hạn nếu replay nhanh liên tục; implementation có thể giới hạn signal theo question type/session policy.

Curriculum terms vẫn giống version hiện tại.

## 19. Exit flow

Nếu user đang ở active mission và bấm Back/Exit:
- mở ConfirmModal.
- lựa chọn:
  - “Tiếp tục học”
  - “Rời mission”

Nếu session state có persistence:
- “Rời” lưu progress stage/current question trước khi navigate.
- Không mark completed.

Browser refresh:
- restore active session nếu snapshot hợp lệ.

## 20. Resume flow

~~~text
Open Mission Map
  ↓
in_progress detected
  ↓
Continue Mission
  ↓
Load same curriculum fingerprint
  ↓
Restore stage/question/answers
~~~

Nếu fingerprint mismatch:
- không resume stale runtime.
- clear/archive stale local session.
- bắt đầu attempt mới trên version hiện tại.
- không mất completed history cũ nếu server đã lưu.

## 21. Network failure

### During gameplay
Question interaction tiếp tục nếu data/audio đã preload.

### During save
- UI không báo “Saved” giả.
- giữ pending result local.
- retry sync.
- completion chỉ được xác nhận server khi persistence success nếu online-only MVP.

Nếu chưa triển khai robust offline queue, MVP phải thông báo rõ “Không thể lưu tiến trình” và cho Retry.

## 22. Empty/error states

### Không có playable deck
Hiển thị EmptyState:
- “Chưa có bộ từ vựng game khả dụng.”

### Deck không đủ terms
Không render mission map giả.
Admin readiness phải ngăn publish.

### Missing deck
404-like ErrorState, không redirect silent.

### Invalid mission index
Back to deck + error.

### Corrupt local snapshot
Clear snapshot, tạo session mới và ghi console/telemetry.

## 23. Content error report

Question có CTA nhỏ “Báo lỗi nội dung” trong phase sau.

Report cần:
- deck_id;
- curriculum fingerprint;
- mission index;
- question type;
- global_term_id;
- reason category.

Không cần gửi toàn bộ user state.

## 24. Accessibility

- Tất cả actions có keyboard focus.
- Không dựa riêng vào màu để biểu thị đúng/sai.
- Audio button có accessible label.
- Boss HP có text/aria value.
- Enter submit ở typing nhưng không submit double.
- Escape chỉ đóng modal khi an toàn.
- Focus được chuyển hợp lý sau feedback.

## 25. Mobile behavior

- Không có horizontal overflow cho challenge chính.
- Matching card có touch target đủ lớn.
- Sticky actions không che content.
- Keyboard mobile mở lên vẫn nhìn thấy input + submit.
- Modal fit viewport.
- Audio controls reachable bằng một tay.

## 26. Navigation guards

Các route Mission phải nằm dưới:
- ProtectedRoute;
- FeatureGuard games_module.

Lazy pages phải dùng lazyWithChunkRecovery.

Không thêm top-level browser-specific 404 behavior phá SPA routing.

## 27. Flow acceptance criteria

User Flow được xem là implement đúng khi test được đầy đủ:

1. Free user vào Free deck.
2. Free user bị chặn đúng ở Pro deck.
3. User bắt đầu Mission 1.
4. User refresh giữa Context và resume đúng.
5. User exit qua ConfirmModal.
6. User hoàn thành mission và unlock next.
7. Replay không khóa lại mission sau.
8. Missing audio vẫn hoàn thành mission.
9. Missing context data không tạo malformed question.
10. Curriculum changed không resume snapshot cũ.
11. Invalid URL không crash.
12. Mobile + keyboard flow hoàn chỉnh.
