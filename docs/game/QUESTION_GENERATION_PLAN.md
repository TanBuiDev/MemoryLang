# Question Generation Plan

## Mục tiêu

Sinh phần lớn bài tập tự động từ dữ liệu vocabulary hiện có để tránh phải viết tay hàng nghìn câu.

## Input

Mỗi VocabularyItem có thể cung cấp:
- source_text
- translation
- audio_url
- examples
- part_of_speech
- meanings
- ipa

## Generator 1: Matching

```text
source_text ↔ translation
```

Distractors lấy từ các term khác trong cùng mission.

## Generator 2: Listening Choice

Phát audio của target term.

Các lựa chọn:
- 1 translation đúng
- 3 distractor từ mission

## Generator 3: Listening Typing

Phát audio.

User nhập source_text.

## Generator 4: Meaning Recall

```text
translation → source_text
```

## Generator 5: Context Cloze

Dùng example có target term.

```text
The company will renovate the office.
→
The company will ______ the office.
```

Chỉ generate khi có thể xác định target text an toàn.

## Generator 6: Spelling

Hiển thị meaning hoặc audio và yêu cầu nhập chính tả.

## Distractor rules

- Không dùng chính target.
- Ưu tiên cùng mission.
- Loại duplicate translation.
- Tránh lựa chọn quá giống nhau gây mơ hồ.
- Với từ đa nghĩa, ưu tiên meaning đang được dùng trong câu hỏi.

## Fallback

Nếu thiếu example:
- bỏ context stage cho term đó hoặc dùng example từ meanings.

Nếu thiếu translation:
- term không tham gia dạng matching/meaning MCQ.

## QA

Generator phải có test cho:
- duplicate.
- empty content.
- multi-word phrase.
- idiom.
- sentence item.
- punctuation/case normalization.
