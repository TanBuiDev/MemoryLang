# Game Engine Technical Plan

## Mục tiêu kỹ thuật

Xây một game engine tái sử dụng được cho nhiều deck và nhiều loại mission mà không hardcode từ vựng vào page.

## Thành phần chính

```text
src/features/games/mission/
├── mission.types.ts
├── missionEngine.ts
├── missionScoring.ts
├── missionSrsAdapter.ts
├── missionSession.ts
├── questionGenerators/
└── components/
```

## Trách nhiệm

### Mission Engine
- Nhận deck terms.
- Nhận mission script.
- Tạo stage runtime.
- Điều phối chuyển stage.

### Question Generators
Sinh câu hỏi từ dữ liệu global_terms:
- matching
- listening
- cloze
- meaning recall
- spelling

### Session State
Lưu tạm:
- current stage
- current question
- answers
- correct/wrong
- elapsed time
- pending review actions

### Persistence
Tái sử dụng:
- study_sessions
- user_terms
- apply_study_review_batch

## Audio

Tái sử dụng `speak()` hiện có:
1. audio_url
2. generate-audio
3. SpeechSynthesis fallback

## Routing đề xuất

```text
/app/games
/app/games/mission/:deckId
/app/games/mission/:deckId/:missionIndex
```

## Nguyên tắc implementation

- Page chỉ orchestration.
- Logic game nằm trong feature modules.
- Question generation là pure functions khi có thể.
- Có unit test cho generator/scoring.
- Không update Supabase mỗi click; batch khi stage/mission hoàn tất.
