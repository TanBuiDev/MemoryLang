# Game Data Model Plan

## Mục tiêu

Tận dụng schema MemoryLang hiện tại và chỉ thêm bảng khi thật sự cần.

## Bảng tái sử dụng

### decks
Nguồn curriculum cấp deck.

### deck_terms
Ánh xạ deck → global_terms.

### global_terms
Nguồn nội dung dùng chung:
- source_text
- translation
- ipa
- audio_url
- meanings
- examples
- image_url

### user_terms
Chỉ lưu tiến trình học cá nhân:
- correct_count
- wrong_count
- status
- SRS state
- next_review_at

### study_sessions
Lưu phiên học/game.

## MVP

Không bắt buộc thêm bảng mission nếu mission được chia tự động theo thứ tự deck_terms.

Có thể mở rộng `StudyMode` với:
- game_mission

## Khi cần persistence mission riêng

Đề xuất thêm:

```text
mission_progress
- id
- user_id
- deck_id
- mission_index
- status
- score
- accuracy
- completed_at
- updated_at
```

## Phase sau

Nếu admin cần biên tập mission thủ công:

```text
missions
mission_terms
mission_stages
```

## Nguyên tắc dữ liệu

Shared content và user progress phải tách biệt.

```text
Shared:
decks / deck_terms / global_terms / mission definitions

Personal progress:
user_terms / study_sessions / mission_progress
```

## RLS

Mọi bảng progress phải:
- bật RLS.
- user chỉ đọc/ghi row của chính mình.
- shared content chỉ admin sửa.
