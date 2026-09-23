# MemoryLang Game Product Plan

> Trạng thái: Specification  
> Phạm vi: Game-based vocabulary learning  
> Định hướng: Shared curriculum, personal progress  
> Tài liệu liên quan: GAME_USER_FLOW.md, MISSION_SYSTEM_DESIGN.md, GAME_ENGINE_TECH_PLAN.md, GAME_DATA_MODEL_PLAN.md

## 1. Bối cảnh

MemoryLang hiện là nền tảng học ngôn ngữ với các năng lực đã có sẵn:

- Vocabulary dùng chung trong global_terms.
- Deck và deck_terms để tổ chức từ vựng.
- Audio có sẵn và cơ chế fallback TTS.
- Flashcard study, quiz, review và SRS.
- Game Hub và Matching Game bước đầu.
- Free/Pro gating và cấu hình game/deck từ Admin.
- User progress được lưu riêng trong user_terms và study_sessions.

Mục tiêu của Game Learning không phải xây một sản phẩm game tách biệt, cũng không phải tạo curriculum riêng cho mỗi người. Game phải trở thành một cách học chuẩn hóa trên cùng một kho nội dung của MemoryLang.

## 2. Tuyên bố sản phẩm

MemoryLang cung cấp một chương trình học chung theo deck. Mọi người học cùng một deck sẽ tiếp cận cùng một tập từ, cùng cấu trúc mission và cùng chuẩn đánh giá. Khác biệt giữa người dùng chỉ nằm ở tiến trình, kết quả, lịch sử và lịch ôn.

~~~text
SHARED LEARNING CONTENT
Deck
  ├─ Ordered terms
  ├─ Mission structure
  ├─ Question rules
  └─ Content overrides
          │
          ▼
      SAME CURRICULUM
          │
   ┌──────┴──────┐
   ▼             ▼
 User A         User B
 progress       progress
 SRS            SRS
 results        results
~~~

## 3. Mục tiêu

### 3.1. Mục tiêu học tập

1. Chuyển từ việc chỉ nhận diện nghĩa sang khả năng recall.
2. Kết hợp nhiều modality:
   - nhìn từ;
   - nghe audio;
   - nhớ nghĩa;
   - nhớ mặt chữ;
   - nhớ trong ngữ cảnh.
3. Mỗi term được gặp lại nhiều lần trong một mission ở các dạng khác nhau.
4. Kết quả mission có thể đóng góp vào dữ liệu review/SRS nhưng không làm thay đổi curriculum của mission.
5. Deck mới có thể trở thành khóa học game mà không cần viết thêm React page riêng.

### 3.2. Mục tiêu sản phẩm

- Tăng tỷ lệ hoàn thành deck.
- Tạo một learning loop rõ ràng: học → luyện → kiểm tra → hoàn thành → ôn lại.
- Tái sử dụng tối đa global_terms, audio và examples hiện tại.
- Giảm công soạn bài thủ công bằng question generator.
- Cho phép content team kiểm duyệt và override phần tự sinh mà không cần sửa code.
- Giữ Game Module tương thích với Free/Pro và Admin configuration hiện có.

## 4. Không phải mục tiêu

MVP không bao gồm:

- Open world.
- Character RPG phức tạp.
- Equipment, inventory hoặc gacha.
- PvP / leaderboard toàn hệ thống.
- AI tự quyết định mỗi user học từ nào.
- AI tạo câu hỏi runtime không qua kiểm duyệt.
- Adaptive curriculum thay đổi term của mission theo SRS.
- Story branching riêng cho từng user.
- Persistent XP economy lớn.

Các phần trên chỉ được xem xét sau khi learning engine và content pipeline ổn định.

## 5. Đối tượng sử dụng

### 5.1. Learner

Người học muốn:
- chọn một bộ từ/khóa học;
- biết mình đang ở bài nào;
- học trong các session ngắn;
- thấy tiến trình rõ ràng;
- không phải tự thiết lập thuật toán học.

### 5.2. Content/Admin

Admin cần:
- bật/tắt Game Module;
- chọn deck nào được đưa vào game;
- đặt Free/Pro;
- kiểm tra readiness của deck;
- kiểm duyệt content tự sinh;
- publish curriculum ổn định.

Admin không được yêu cầu viết JSON hoặc code trực tiếp. Mọi cấu hình tương lai phải có visual form/builder.

## 6. Nguyên tắc sản phẩm

### 6.1. Curriculum chung

Mission content không được thay đổi theo:
- correct_count;
- wrong_count;
- next_review_at;
- SRS ease factor;
- lịch sử học của user.

Những dữ liệu đó chỉ phục vụ:
- progress;
- statistics;
- review;
- SRS scheduling.

### 6.2. Gameplay chính là hoạt động học

Không thiết kế:

~~~text
Flashcard learning
→ xong
→ chơi game để nhận thưởng
~~~

Thiết kế:

~~~text
Learn
→ retrieve
→ listen
→ use context
→ recall
→ boss
~~~

Các hành động giúp thắng game chính là hành động cần thiết để ghi nhớ từ.

### 6.3. Content trước cosmetics

Ưu tiên:
1. correctness;
2. recall quality;
3. content clarity;
4. session flow;
5. game feedback;
6. cosmetics.

Không hy sinh chất lượng câu hỏi để tăng hiệu ứng game.

### 6.4. Không có “fake progression”

Nếu XP chưa persist thì không dùng XP như một progression lâu dài. MVP có thể dùng:
- score;
- accuracy;
- mission completion;
- stars.

Persistent XP chỉ được thêm khi có data model và rule rõ ràng.

## 7. Mô hình khóa học

### 7.1. Deck là đơn vị curriculum

Deck có thể đại diện:
- TOEIC Test;
- chủ đề vocabulary;
- lesson pack;
- curriculum collection.

Deck cha chủ yếu dùng làm nhóm/catalog. Deck playable nên có danh sách term trực tiếp và thứ tự rõ ràng.

### 7.2. Mission

Mặc định:

- 10 terms / mission.
- Mission cuối có thể ít hơn 10.
- Final Boss là optional ở MVP đầu, required trước public rollout đầy đủ.

Ví dụ deck 80 terms:

~~~text
Mission 01  terms 01–10
Mission 02  terms 11–20
...
Mission 08  terms 71–80
Final Boss  cumulative review
~~~

### 7.3. Mission loop chuẩn

1. Briefing.
2. Learn.
3. Matching.
4. Listening.
5. Context.
6. Recall.
7. Boss.
8. Result.

Mission System có thể bỏ qua một question type khi dữ liệu target không đủ điều kiện, nhưng không được âm thầm sinh câu hỏi chất lượng thấp.

## 8. Learning model

Mỗi term ưu tiên đi qua progression:

~~~text
Exposure
→ Recognition
→ Cued Recall
→ Free Recall
→ Contextual Recall
→ Reinforcement
~~~

Mapping MVP:

| Learning operation | Gameplay |
|---|---|
| Exposure | Learn card |
| Recognition | Matching / Listening MCQ |
| Cued recall | Context cloze |
| Free recall | Meaning → English typing |
| Auditory recall | Audio → typing |
| Reinforcement | Boss |

Không yêu cầu mọi term xuất hiện ở mọi dạng trong cùng mission, nhưng toàn mission phải bảo đảm coverage cân bằng.

## 9. Shared content và personal progress

### Shared

- decks
- deck_terms
- global_terms
- mission script definitions
- generator rules
- manual content overrides

### Personal

- user_terms
- study_sessions
- mission completion
- scores
- attempts
- review schedule

Một user có thể làm Mission 1 lần thứ ba, nhưng Mission 1 vẫn chứa cùng bộ target terms của curriculum version đó.

## 10. SRS trong Game

SRS không quyết định mission content.

SRS có thể nhận signal sau gameplay:

| Kết quả | Review action đề xuất |
|---|---|
| Sai và chưa tự sửa được | dont_know |
| Đúng sau hint/retry | difficult |
| Đúng lần đầu trong recall challenge | know |
| memorized | Không tự động gán từ game |

Việc đọc user_terms để tính review result chỉ là persistence concern. Engine không được dùng snapshot này để đổi target terms hoặc stage sequence.

## 11. Free / Pro

Game phải sử dụng Subscription system hiện có.

MVP:
- Game Mission có accessTier.
- Mỗi playable deck có accessTier.
- UI khóa nội dung phải giải thích rõ lý do.
- Không tải nội dung Pro rồi chỉ che trên UI nếu backend/RLS cần bảo vệ dữ liệu nhạy cảm.
- Shared vocabulary public vẫn tuân theo model hiện có; gating chủ yếu điều khiển feature access.

Cấu hình được mở rộng từ game_hub_config hiện tại, không tạo một hệ cấu hình song song nếu chưa cần.

## 12. UX principles

- Mobile-first.
- Mission 5–10 phút là mục tiêu trải nghiệm, không phải hard limit.
- Một màn hình chỉ có một nhiệm vụ chính.
- Feedback đúng/sai ngay nhưng không tiết lộ đáp án quá sớm ở recall.
- Sai → hint/retry → correction thay vì sai → Next ngay.
- Không dùng browser alert/confirm/select.
- Dùng Button, Select, ConfirmModal và design system hiện tại.
- Hỗ trợ keyboard với các challenge typing.
- Audio phải có trạng thái loading/error/replay rõ ràng.

## 13. Trạng thái tiến trình

Tối thiểu:

- locked
- available
- in_progress
- completed

UI có thể biểu diễn:
- chưa mở;
- tiếp tục;
- hoàn thành;
- best score.

Mission completion không bị thu hồi nếu user chơi lại và đạt điểm thấp hơn.

## 14. Scoring MVP

Score nhằm phản ánh performance của attempt, không quyết định quyền truy cập nội dung trừ khi product sau này chốt mastery gate.

Đề xuất:

- Correct first try: full points.
- Correct after hint/retry: partial points.
- Wrong: 0.
- Speed bonus: không dùng ở MVP trừ mode Speed riêng.
- Best score được lưu riêng khỏi latest score nếu có mission_progress.

Accuracy phải dựa trên graded prompts, không tính Learn exposure.

## 15. Unlock rule

MVP mặc định:
- Mission 1 available.
- Mission N available khi Mission N-1 completed.
- Replay mission completed luôn được phép.
- Final Boss available khi toàn bộ standard missions completed.

Không dùng minimum score để unlock ở MVP để tránh user bị kẹt do một câu hỏi content lỗi.

## 16. Content strategy

Dữ liệu production tại thời điểm lập kế hoạch:

- 1.910 active global_terms.
- 1.910 có audio.
- 1.909 có translation.
- 1.905 có example.

Do coverage cao, runtime AI generation không cần thiết cho core game.

Content chia ba tầng:

1. Auto:
   - matching;
   - listening;
   - spelling;
   - direct recall.
2. Semi-auto:
   - cloze;
   - distractors;
   - hints.
3. Manual:
   - polysemy;
   - idiom;
   - phrasal verb;
   - collocation;
   - ambiguous examples;
   - special boss challenge.

## 17. Success metrics

Không dùng duy nhất “time spent”.

### Learning metrics
- Mission completion rate.
- First-try recall accuracy.
- Recall accuracy theo stage.
- Wrong → corrected rate.
- Review accuracy sau khi mission hoàn thành.

### Product metrics
- Deck start → Mission 1 completion.
- Mission N → Mission N+1 continuation.
- Deck completion rate.
- Replay rate.
- Audio usage/failure rate.
- Abandon point theo stage.

### Quality metrics
- Tỷ lệ question bị content team reject.
- Tỷ lệ user report ambiguous question.
- Audio failure.
- Generator fallback rate.
- Terms không đủ điều kiện tạo context question.

Không đặt target % cụ thể trước khi có baseline production.

## 18. Analytics events tối thiểu

Nếu bổ sung event tracking:

- game_deck_opened
- mission_started
- mission_resumed
- stage_started
- question_answered
- hint_used
- mission_completed
- mission_abandoned
- content_error_reported

Không log answer text nhạy cảm không cần thiết. Không dùng analytics để suy luận năng lực ngoài phạm vi chức năng đã công bố.

## 19. Edge cases sản phẩm

### Deck < 5 terms
Không publish Mission Game hoặc dùng mini mission template riêng. MVP nên yêu cầu tối thiểu 5 valid terms.

### Deck thay đổi sau khi user đã học
Curriculum fingerprint/version thay đổi. Progress cũ không được map mù sang content mới.

### Term bị soft-delete
Không đưa vào mission mới. Curriculum đã publish phải được revalidate/version lại.

### Missing audio
Question type nghe bị skip; không block toàn mission nếu các stage khác vẫn đạt quality gate.

### Missing translation
Không dùng matching/meaning recall cho term đó.

### Missing exact cloze example
Không tự đoán. Skip hoặc manual override.

## 20. Release criteria MVP

MVP chỉ được release khi:

- Có ít nhất một playable production deck.
- Term ordering deterministic.
- Mission split deterministic.
- Mission có thể resume sau refresh.
- Matching, Listening, Context và Recall chạy được.
- Boss hoàn thành được.
- Progress persist.
- Replay không phá progress.
- SRS update không thay đổi curriculum.
- Free/Pro guard hoạt động.
- Audio fallback hoạt động.
- Mobile và keyboard QA pass.
- Không có câu hỏi ambiguous trong deck pilot.
- pnpm tsc -b pass.
- Relevant tests pass.
- Supabase RLS/advisors pass nếu có migration.

## 21. Quyết định kiến trúc đã chốt

1. Deck thay cho World.
2. Shared curriculum thay cho personalized curriculum.
3. User progress vẫn cá nhân.
4. Question generator dùng dữ liệu chuẩn có sẵn.
5. Không dùng AI runtime cho core questions.
6. SRS là downstream signal, không phải content selector.
7. Mission script là config/domain definition, không hardcode vào page.
8. Published deck cần term ordering rõ ràng.
9. Content version/fingerprint phải tồn tại trước khi rollout rộng.
10. Game engine phải dùng lại được cho deck mới mà không sửa code.

## 22. Definition of Done của Product Plan

Product Plan hoàn thành khi các tài liệu còn lại không phải tự suy đoán:
- Mission là gì.
- User học theo flow nào.
- Phần nào dùng chung.
- Phần nào cá nhân.
- SRS có quyền tác động đến đâu.
- MVP gồm gì và không gồm gì.
- Điều kiện nào cho phép public release.
