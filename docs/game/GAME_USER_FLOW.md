# MemoryLang Game User Flow

## Luồng chính

```text
Game Hub
  ↓
Chọn Deck
  ↓
Deck Detail / Mission Map
  ↓
Chọn Mission
  ↓
Mission Intro
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
Mission Progress
```

## 1. Game Hub

User nhìn thấy các deck được phép chơi theo cấu hình hiện có trong app_settings.

Thông tin hiển thị:
- Tên deck.
- Số từ.
- Tiến trình mission.
- Free / Pro.
- CTA tiếp tục mission gần nhất.

## 2. Deck Detail

Ví dụ deck 80 từ:

```text
Mission 01  ✓
Mission 02  ✓
Mission 03  ▶
Mission 04  🔒
...
Mission 08  🔒
Final Boss  🔒
```

## 3. Mission

Một mission mặc định dùng 10 từ theo curriculum cố định.

Các stage:
- Learn: giới thiệu từ, IPA, translation, audio, example.
- Matching: ghép source_text với translation.
- Listening: nghe audio và chọn/nhập đáp án.
- Context: cloze từ example.
- Recall: translation → source_text.
- Boss: tổng hợp nhiều dạng recall.

## 4. Result

Hiển thị:
- Accuracy.
- Correct / wrong.
- Thời gian.
- Từ cần xem lại.
- Mission completed.
- CTA tiếp tục mission kế.

## 5. Review

Review là luồng riêng khỏi curriculum mission. SRS có thể dùng user_terms để quyết định từ nào cần ôn nhưng không thay đổi nội dung mission chuẩn.
