# Mission Content Plan

## Mục tiêu

Xây quy trình content có thể scale từ hàng nghìn lên hàng chục nghìn từ mà không yêu cầu viết tay toàn bộ bài tập.

## Ba tầng nội dung

### Tier 1 — Auto
Không cần content team viết:
- matching
- translation recall
- audio recognition
- spelling
- basic MCQ

### Tier 2 — Semi-auto
Hệ thống sinh, content team review:
- context cloze từ examples
- distractors
- hints
- mission grouping

### Tier 3 — Manual
Content team viết riêng khi cần:
- từ đa nghĩa
- phrasal verbs
- idioms
- collocations
- register/usage notes
- boss question đặc biệt

## Quy trình content

```text
Deck
↓
Validate vocabulary data
↓
Split missions
↓
Auto-generate exercises
↓
Content review
↓
Manual enrichment where needed
↓
QA
↓
Publish
```

## Tiêu chuẩn mission

- 5–10 từ mới / mission tùy deck.
- Không dùng câu hỏi mơ hồ.
- Translation phải khớp meaning đang luyện.
- Audio phải phát đúng term.
- Context phải tự nhiên và đủ ngữ cảnh.
- Boss phải kiểm tra recall, không chỉ recognition.

## Phân công

Code team:
- generator
- engine
- editor/tooling

Content team:
- curriculum
- review
- exceptions
- manual enrichment

QA:
- kiểm tra dữ liệu.
- kiểm tra gameplay.
- kiểm tra đáp án.
