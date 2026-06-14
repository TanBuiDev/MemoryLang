# Listening Module Design

> **Date:** 2026-06-15
> **Status:** Approved
> **Approach:** Module độc lập (Approach 2)

## Overview

Module Luyện Nghe TOEIC: cho phép người dùng chọn chủ đề → test → part, rồi luyện tập với 2 chế độ: Thi thử (giống TOEIC thật) và Dictation (nghe chép đục lỗ).

## Data Model

### Types (`src/types/listening.types.ts`)

```typescript
export interface ListeningTopic {
  id: string
  title: string           // "ETS 2026", "ETS 2024"
  description?: string
  order: number
}

export interface ListeningTest {
  id: string
  topicId: string
  title: string           // "Test 1", "Test 2"
  order: number
}

export interface ListeningPart {
  id: string
  testId: string
  partNumber: 1 | 2 | 3 | 4
  directions: string      // Hướng dẫn làm bài
  audioSrc: string        // /public/audio/listening/ets2026_test1_part1.mp3
  imageUrl?: string       // Chỉ Part 1
  transcript?: string     // Toàn bộ lời thoại (dùng cho dictation)
}

export interface ListeningQuestion {
  id: string
  partId: string
  order: number
  questionText: string
  options: string[]         // 3 options Part 2, 4 options Part 1/3/4
  correctIndex: number
  explanation?: string
}

// Dictation: vị trí từ cần điền trong transcript
export interface DictationBlank {
  start: number
  end: number
  answer: string
}

export type ListeningMode = 'test' | 'dictation'

export interface ListeningSession {
  partId: string
  mode: ListeningMode
  currentIndex: number
  answers: Record<number, number>       // questionIndex → selectedOption
  dictAnswers: Record<number, string>   // blankIndex → userInput
  isCompleted: boolean
  startedAt: number
  score: number
  correctCount: number
  wrongCount: number
  skippedCount: number
}
```

### Database (later phase)

Giữ nguyên cấu trúc types, ánh xạ thành Supabase tables: `listening_topics`, `listening_tests`, `listening_parts`, `listening_questions`, `listening_results`.

### Demo Data (`src/features/listening/demoData.ts`)

- 1 topic: "ETS 2026"
- 1 test: "Test 1"
- 4 part (Part 1-4) với câu hỏi mẫu
- Audio file mock: `/public/audio/listening/` (placeholder MP3)
- Part 1 có 1 ảnh mẫu

## Pages & Routing

| Route | Page | Purpose |
|-------|------|---------|
| `/app/listening` | `TopicSelectionPage` | Chọn chủ đề (ETS 2026, ETS 2024...) |
| `/app/listening/:topicId` | `TestSelectionPage` | Chọn Test trong chủ đề |
| `/app/listening/:topicId/:testId` | `PartSelectionPage` | Chọn Part + chế độ (Dictation / Thi thử) |
| `/app/listening/session/:partId/:mode` | `ListeningSessionPage` | Làm bài (dictation hoặc thi thử) |
| `/app/listening/result/:partId` | `ListeningResultPage` | Kết quả + review đáp án |

## File Structure (new files)

```
src/
  features/listening/
    demoData.ts                  // Hardcoded ETS 2026 demo
  pages/listening/
    TopicSelectionPage.tsx
    TestSelectionPage.tsx
    PartSelectionPage.tsx
    ListeningSessionPage.tsx
    ListeningResultPage.tsx
  components/listening/
    AudioPlayer.tsx
    Part1Renderer.tsx
    Part2Renderer.tsx
    Part3Renderer.tsx
    Part4Renderer.tsx
    DictationRenderer.tsx
    TestModeRenderer.tsx
    ProgressBar.tsx
  stores/
    useListeningStore.ts         // Zustand
  types/
    listening.types.ts
public/
  audio/listening/               // File audio (placeholder)
  images/listening/              // Ảnh Part 1
```

## Components

### AudioPlayer

**Props:**
- `src: string` — URL file audio
- `autoPlay?: boolean` — Phát ngay khi mount (thi thử = true)
- `allowSeek?: boolean` — Cho phép tua (dictation = true, thi thử = false)
- `allowSpeed?: boolean` — Đổi tốc độ
- `onEnd?: () => void` — Callback khi phát hết
- `onTimeUpdate?: (t: number) => void` — Mỗi giây

**Tính năng:**
- Play/Pause (Space)
- Tua -5s / +5s (← →)
- Seek bar (click/kéo)
- Tốc độ: 0.5x / 0.75x / 1x / 1.25x / 1.5x / 2x (cycle)
- Hiển thị `current / total`
- Volume slider (toggle)

**Thi thử:** Ẩn seek bar, ẩn nút tua, play 1 lần.
**Dictation:** Đầy đủ seek + tua + lặp.

### Part Renderers

#### Part 1 - Photographs
- Hiển thị ảnh (`imageUrl`)
- 4 radio button (A/B/C/D)
- Audio tự phát 1 lần (chế độ thi thử)
- Sau khi chọn: hiện đáp án đúng (xanh) + sai (đỏ)

#### Part 2 - Question & Response
- Hiển thị câu hỏi text
- 3 radio button (A/B/C)
- Audio chứa câu hỏi + response

#### Part 3 - Conversations
- Mỗi đoạn audio ~30-60s, kèm 3 câu hỏi
- Câu hỏi hiển thị sẵn trước khi nghe (như TOEIC thật)
- 4 radio button mỗi câu (A/B/C/D)
- Navigation giữa 3 câu của cùng đoạn

#### Part 4 - Talks
- Giống Part 3: mỗi bài nói + 3 câu hỏi
- 4 radio button mỗi câu

### DictationRenderer
- Hiển thị transcript với blanks (`_______`)
- Input field focus vào blank hiện tại
- Nghe → gõ từ → Enter → blank tiếp
- Audio có thể pause/tua/lặp
- Khi nộp bài: Đúng = xanh + giữ text, Sai = đỏ + hiện đáp án

## Session Flow

### Thi thử (Test Mode)
1. Hiển thị directions Part (~5-10s user đọc)
2. Audio phát 1 lần, không tua, không pause
3. Chọn đáp án (có thể chọn trong khi nghe)
4. Tự động chuyển câu sau khi chọn
5. Timer đếm ngược tổng thời gian
6. Button "Nộp bài" hoặc tự nộp khi hết giờ

### Dictation Mode
1. Hiển thị transcript với blanks
2. Audio player đầy đủ chức năng
3. Gõ từ vào blanks, Enter để qua blank tiếp
4. Có thể tua lại audio bao nhiêu lần tùy ý
5. Nộp bài để xem kết quả

## Store (`useListeningStore`)

```typescript
{
  selectedTopicId: string | null
  selectedTestId: string | null
  selectedPartId: string | null
  mode: 'test' | 'dictation'
  currentIndex: number
  answers: Record<number, number>
  dictAnswers: Record<number, string>
  isCompleted: boolean
  startedAt: number | null
  score: number
  correctCount: number
  wrongCount: number
  skippedCount: number
}
```

## Result Page

- Hiển thị điểm: correct/total, accuracy %
- Danh sách câu hỏi kèm đáp án user chọn vs đáp án đúng
- Highlight xanh/đỏ
- Nút "Làm lại" và "Về danh sách"

## Design System

Tuân thủ phong cách neobrutalist MemoryLang:
- `neo-card` cho container câu hỏi
- `neo-button` cho navigation/action
- Primary (yellow) cho câu đúng, Danger (red) cho câu sai
- Font-black cho headings, font-semibold cho text
- `brand-grid-bg` làm nền trang

## Out of MVP Scope

- Lưu kết quả lên Supabase
- Responsive mobile (ưu tiên desktop)
- Speech recognition / voice input
- Chế độ luyện tập theo từng câu riêng lẻ
- Import đề từ file ngoài
- Tính năng xã hội (bảng xếp hạng, chia sẻ)
