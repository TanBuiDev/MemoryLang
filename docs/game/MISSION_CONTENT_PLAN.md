# Mission Content Plan

> Trạng thái: Content operations specification  
> Phạm vi: chuẩn bị, kiểm duyệt và publish shared vocabulary missions  
> Nguyên tắc: auto-generate phần lặp lại, con người kiểm duyệt phần mang tính ngôn ngữ/ambiguity

## 1. Mục tiêu

Content pipeline phải cho phép MemoryLang:

- đưa một deck mới vào Mission Game mà không viết code;
- tái sử dụng dữ liệu global_terms;
- không viết tay hàng nghìn câu cơ bản;
- vẫn bảo đảm câu hỏi có một đáp án đúng rõ ràng;
- kiểm soát polysemy, idiom, phrasal verb và context khó;
- version nội dung khi deck thay đổi;
- QA trước khi learner thấy.

## 2. Current content inventory

Snapshot production tại thời điểm lập kế hoạch:

- 1.910 active terms.
- 1.910 có audio.
- 1.909 có translation.
- 1.905 có examples.

Điều này cho phép phần lớn Mission MVP dựa trên content hiện có.

Không giả định mọi deck đều đạt coverage tương tự. Readiness phải tính theo deck.

## 3. Content ownership model

### Shared content team chịu trách nhiệm

- deck curriculum;
- order của terms;
- translation quality;
- example quality;
- manual overrides;
- publish readiness;
- content bug triage.

### Code team chịu trách nhiệm

- generator;
- readiness diagnostics;
- admin tooling;
- version/fingerprint;
- rendering;
- grading.

### QA chịu trách nhiệm

- functional question review;
- ambiguity;
- audio correctness;
- mobile rendering;
- regression.

Không để content team sửa React code để thay một câu hỏi.

## 4. Ba tầng content

## Tier 1 — Auto

Không cần viết tay nếu dữ liệu pass validation:

- Matching.
- Listening choice.
- Listening typing.
- Meaning recall.
- Basic spelling.

Nguồn:
- source_text;
- translation;
- audio_url.

## Tier 2 — Semi-auto

Generator tạo, content reviewer kiểm:

- Context cloze.
- Distractors.
- Hint.
- Question distribution.
- Boss mix.

Nguồn:
- examples;
- meanings;
- POS;
- mission pool.

## Tier 3 — Manual

Bắt buộc/khuyến nghị với:

- từ đa nghĩa mạnh;
- phrasal verb;
- idiom;
- collocation;
- register-sensitive term;
- false friend;
- translation dễ gây nhiều đáp án;
- morphology mismatch;
- phrase/sentence dài;
- example không chứa exact target;
- boss challenge đặc biệt.

## 5. Content lifecycle

~~~text
Deck selected
   ↓
Vocabulary data validation
   ↓
Term ordering
   ↓
Mission split preview
   ↓
Auto generation
   ↓
Readiness diagnostics
   ↓
Content review
   ↓
Manual overrides
   ↓
Regenerate / revalidate
   ↓
Functional QA
   ↓
Publish
   ↓
Monitor reports
   ↓
Fix → new fingerprint/version
~~~

## 6. Deck intake

Trước khi soạn mission, content owner xác nhận:

- deck name;
- purpose;
- source/native language;
- expected audience;
- expected level nếu có;
- parent/child relationship;
- number of terms;
- whether this deck is playable or only catalog parent.

Parent deck không tự động trở thành curriculum.

## 7. Term order

Term order là content decision.

Content team cần visual reorder UI trong phase sau.

MVP nếu import theo source:
- backfill order theo source/import order;
- reviewer kiểm sample;
- publish blocked nếu order_index thiếu.

Không dùng created_at như quyết định sư phạm lâu dài.

## 8. Mission size

Default: 10 terms.

Guideline:
- 5–10 cho beginner/dense terms.
- 10 cho standard vocabulary.
- >10 chỉ khi test chứng minh session vẫn dễ hoàn thành.

Final remainder <5:
- merge vào mission trước theo rule của Mission System;
- content preview phải show final result.

## 9. Mission naming

Default:
- Mission 01, 02, 03...

Nếu deck có semantic sections, content team có thể đặt title:
- Office Essentials;
- Travel;
- Part 1 Vocabulary.

Title không thay đổi identity của mission; identity dựa deck/fingerprint/index.

Không cần viết story riêng nếu term pool không cùng theme.

## 10. Standard mission content

Mỗi mission target:
- tất cả terms xuất hiện Learn;
- graded coverage phân phối qua Matching/Listening/Context/Recall/Boss.

Content reviewer không cần viết từng question nếu generator pass.

Reviewer tập trung:
- question có duy nhất một answer;
- context đúng meaning;
- distractors không mơ hồ;
- language natural.

## 11. Translation editorial rules

Translation dùng trong game cần:

- ngắn nhưng đủ nghĩa;
- khớp intended meaning;
- tránh slash list quá dài nếu dùng làm option;
- POS rõ khi cần phân biệt;
- không chứa answer English ngoài chủ đích;
- không dùng placeholder.

Nếu deriveTranslation tạo nhiều POS joined bằng semicolon:
- reviewer kiểm usability trong Matching/MCQ.
- có thể cần meaning-specific manual display override.

## 12. Example editorial rules

Example tốt cho cloze:

1. chứa exact target surface form;
2. đủ ngữ cảnh đoán được;
3. không quá dài;
4. không chứa thêm một blank candidate gây ambiguity;
5. đúng grammar;
6. translation example nếu hiển thị phải đúng.

Auto-cloze không được sửa morphology.

Nếu example có “renovated” nhưng target “renovate”:
- Tier 2 auto cloze skip;
- Tier 3 reviewer có thể viết curated cloze với accepted form phù hợp.

## 13. Audio editorial rules

Audio QA:
- đúng word/phrase;
- đúng source language;
- không bị cắt;
- volume nghe được;
- không đọc ký tự lạ;
- phrase stress acceptable.

Stored audio_url là source chính.

Nếu content bug là audio:
- sửa asset/source data;
- không workaround bằng question text.

## 14. Meaning/polysemy workflow

Term đa nghĩa:

1. xác định meaning đang dạy trong deck.
2. chọn translation tương ứng.
3. chọn example của meaning đó.
4. disable direct question nếu prompt không đủ phân biệt.
5. thêm manual context override nếu cần.

Không buộc game phải dạy tất cả meanings trong cùng một mission.

## 15. Phrasal verbs

Checklist:
- particle đầy đủ;
- translation theo whole phrase;
- example tự nhiên;
- typed answer yêu cầu whole phrase;
- distractor không chỉ khác particle nếu context không phân biệt.

Ưu tiên Context + Recall.

## 16. Idioms

Checklist:
- translation idiomatic, không literal nếu sai nghĩa;
- example contextual;
- không dùng direct spelling challenge quá sớm nếu phrase dài;
- hint có thể là word count;
- manual review required.

## 17. Collocations

Nếu global term là collocation:
- giữ phrase unit;
- cloze có thể blank whole collocation hoặc một component nếu manual rule rõ;
- không tự split arbitrary.

## 18. Sentence items

Sentence item cần policy riêng.

Default Mission MVP:
- Learn eligible.
- Listening typing chỉ dưới length threshold.
- Direct matching disabled nếu option quá dài.
- Meaning recall full sentence disabled mặc định.
- manual exercise recommended.

Không ép mọi item_type vào cùng generator.

## 19. Distractor editorial QA

Reviewer kiểm:
- không synonym cũng đúng;
- không duplicate;
- không khác nhau chỉ bởi punctuation vô nghĩa;
- cùng level/context đủ hợp lý;
- không offensive/out-of-scope.

Hard distractor không có nghĩa là ambiguous distractor.

## 20. Hints editorial rules

Auto hint:
- first letter;
- word count;
- IPA;
- audio replay.

Manual hint:
- short semantic cue;
- usage cue.

Không viết hint có chứa nguyên answer.

## 21. Boss content

Boss không cần custom story cho mọi mission.

Mục tiêu:
- cumulative recall;
- nhiều modality;
- ưu tiên typed response.

Default boss:
- 5 questions;
- ít nhất 3 free/typed recall.

Manual boss chỉ cần khi:
- deck mang chủ đề/certification đặc biệt;
- muốn context sát source exam;
- auto questions thiếu quality.

## 22. Content readiness scorecard

Per playable deck report:

### Required
- ordered term coverage 100%.
- source_text 100%.
- unique global_term_id 100%.
- minimum terms.
- no deleted terms in playable set.

### Stage readiness
- translation coverage.
- audio coverage.
- exact-cloze coverage.
- recall eligibility.
- distractor sufficiency.

### Diagnostics
- blocking count.
- warning count.
- manual overrides count.

Không gộp thành một score “85/100” nếu score che mất blocking issue. UI nên có Ready/Warning/Blocked.

## 23. Publish gate

Deck Mission chỉ publish khi:

- zero blocking diagnostics;
- manual review pass;
- audio spot/full QA theo policy;
- generated preview pass;
- term order pass;
- mission split pass;
- access tier configured;
- script configured;
- QA sign-off.

## 24. Pilot rollout

Không QA 1.910 terms cùng lúc trước khi engine được chứng minh.

Đề xuất:

### Pilot 1
Một deck ~80 terms có data tốt.

Mục tiêu:
- validate engine;
- validate generator;
- estimate manual override rate.

### Pilot 2
Một deck khó hơn:
- phrases;
- polysemy;
- edge cases.

### Batch rollout
Sau khi override rate/QA process ổn định:
- review theo deck.

## 25. Review sampling policy

Tier 1:
- có thể batch review UI nhưng still inspect generated output.

Tier 2:
- 100% cloze/distractors của pilot.
- sau proven quality có thể risk-based sampling + diagnostic-driven full review.

Tier 3:
- 100% manual.

Public education content cần conservative policy ở giai đoạn đầu.

## 26. Content artifact

Trong MVP trước admin editor đầy đủ, manual overrides có thể ở:
- version-controlled JSON/TS data artifact;
- validated schema.

Không đặt raw content override rải trong component.

Khi content workflow ổn:
- migrate sang DB/admin visual builder.

## 27. Override fields

Content team cần UI fields kiểu:

- target term;
- question type;
- prompt;
- accepted answer;
- distractors;
- hint;
- enabled/disabled;
- reviewer note.

Không textarea JSON.

## 28. Roles

### Content Author
- đề xuất order.
- review generated content.
- viết overrides.

### Content Reviewer
- approve/reject.
- check language/ambiguity.

### QA
- test rendered interaction.

### Admin Publisher
- publish deck/config.

Một người có thể kiêm role ở team nhỏ, nhưng checklist/sign-off vẫn tách logic.

## 29. Severity model

### Blocker
- wrong answer.
- more than one correct answer.
- broken route/mission.
- missing required content khiến stage crash.
- wrong audio target.

### Major
- unnatural/incorrect example.
- misleading translation.
- broken hint.
- unreadable long option.

### Minor
- punctuation/display.
- wording polish.
- cosmetic inconsistency.

Blocker/Major phải fix trước publish pilot.

## 30. Content bug workflow

Report:
- deck.
- fingerprint.
- mission index.
- question ID.
- target term.
- issue category.
- screenshot optional.
- expected correction.

Fix shared source nếu bug thuộc global term.

Fix override nếu bug chỉ thuộc presentation/question.

Sau content identity change:
- fingerprint/version update theo system rule.

## 31. Localization

Current primary audience Vietnamese-English.

Content fields vẫn tôn trọng:
- source_language;
- native_language.

Generator không hardcode “English/Vietnamese” trong domain.

UI copy dùng i18n.

Question content lấy correct language pair.

## 32. Content analytics

Theo dõi:
- question report rate;
- skip/fallback rate;
- retry rate bất thường;
- audio failure;
- per-question incorrect outlier.

High wrong rate không tự chứng minh question sai; dùng làm signal review.

## 33. Batch content plan cho current library

1. Inventory decks.
2. Chọn playable decks.
3. Add/review term order.
4. Run readiness.
5. Fix shared data issues.
6. Generate missions.
7. Review diagnostics.
8. Add overrides.
9. QA.
10. Publish theo deck.

Không publish “all vocabulary” như một curriculum mission khổng lồ.

## 34. Definition of Done

Một deck content hoàn thành khi:

- order locked cho version hiện tại;
- mission split approved;
- no blocking diagnostics;
- required generated questions reviewed theo policy;
- Tier 3 terms curated;
- audio checked;
- boss coverage acceptable;
- manual overrides validated;
- QA checklist pass;
- publisher bật deck Mission;
- fingerprint recorded/visible trong diagnostics.
