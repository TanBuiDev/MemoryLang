# Mission System Design

## Mục tiêu

Chuẩn hóa cách biến một deck thành chuỗi bài học dạng game dùng chung cho mọi người học.

## Đơn vị hệ thống

```text
Deck
  └── Mission
        ├── Terms
        └── Stages
```

## Quy tắc MVP

- Mặc định 10 từ / mission.
- Thứ tự từ lấy theo thứ tự trong deck_terms.
- Deck 80 từ tạo 8 mission.
- Final Boss có thể sử dụng toàn bộ từ trong deck.
- Mission sau có thể bị khóa cho đến khi mission trước hoàn thành.

## Stage types

- learn
- matching
- listening
- context
- recall
- boss
- result

## Mission state

```text
locked
available
in_progress
completed
```

## Script mặc định

```text
STANDARD_MISSION
Learn      10 terms
Matching    5 questions
Listening   5 questions
Context     5 questions
Recall      5 questions
Boss        5 questions
Result
```

## Nguyên tắc

Mission Script chỉ quy định choreography của gameplay. Nội dung từ vựng được inject từ deck/global_terms.

Không tạo script riêng cho từng user.

## Mở rộng sau MVP

Có thể bổ sung:
- quick_mission
- listening_focus
- boss_rush
- review_battle
- custom mission do admin cấu hình
