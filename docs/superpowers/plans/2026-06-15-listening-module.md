# Listening Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete TOEIC Listening practice module with 2 modes (test + dictation), covering all 4 Parts, with AudioPlayer and result review.

**Architecture:** Independent module following existing project conventions (Zustand store, neobrutalist UI, page-per-route). Zero dependency on study/quiz modules.

**Tech Stack:** React 19, TypeScript, Zustand, Tailwind v4, lucide-react, react-router-dom v7

---

### Task 1: Types + i18n

**Files:**
- Create: `src/types/listening.types.ts`
- Modify: `src/i18n/index.ts`

- [ ] **Step 1: Write types file**

```typescript
// src/types/listening.types.ts

export interface ListeningTopic {
  id: string
  title: string
  description?: string
  order: number
}

export interface ListeningTest {
  id: string
  topicId: string
  title: string
  order: number
}

export interface ListeningPart {
  id: string
  testId: string
  partNumber: 1 | 2 | 3 | 4
  directions: string
  audioSrc: string
  imageUrl?: string
  transcript?: string
}

export interface ListeningQuestion {
  id: string
  partId: string
  order: number
  questionText: string
  options: string[]
  correctIndex: number
  explanation?: string
}

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
  answers: Record<number, number>
  dictAnswers: Record<number, string>
  isCompleted: boolean
  startedAt: number
  score: number
  correctCount: number
  wrongCount: number
  skippedCount: number
}
```

- [ ] **Step 2: Run type check**

```bash
pnpm tsc -b --noEmit
```
Expected: no errors.

- [ ] **Step 3: Add i18n keys for listening**

Add to `src/i18n/index.ts` — in both `en` and `vi` sections, before `'loading.eyebrow'`:

```
en:
    'listening.title': 'Listening',
    'listening.selectTopic': 'Select a topic',
    'listening.selectTest': 'Select a test',
    'listening.selectPart': 'Select a part',
    'listening.mode': 'Mode',
    'listening.testMode': 'Test mode',
    'listening.dictationMode': 'Dictation',
    'listening.startSession': 'Start',
    'listening.submit': 'Submit',
    'listening.retry': 'Retry',
    'listening.backToList': 'Back to list',
    'listening.correct': 'Correct',
    'listening.wrong': 'Wrong',
    'listening.skipped': 'Skipped',
    'listening.score': 'Score',
    'listening.accuracy': 'Accuracy',
    'listening.question': 'Question {n}',
    'listening.directions': 'Directions',
    'listening.part': 'Part {n}',
    'listening.part1': 'Part 1: Photographs',
    'listening.part2': 'Part 2: Question-Response',
    'listening.part3': 'Part 3: Conversations',
    'listening.part4': 'Part 4: Talks',

vi:
    'listening.title': 'Nghe',
    'listening.selectTopic': 'Chọn chủ đề',
    'listening.selectTest': 'Chọn đề thi',
    'listening.selectPart': 'Chọn phần',
    'listening.mode': 'Chế độ',
    'listening.testMode': 'Thi thử',
    'listening.dictationMode': 'Nghe chép',
    'listening.startSession': 'Bắt đầu',
    'listening.submit': 'Nộp bài',
    'listening.retry': 'Làm lại',
    'listening.backToList': 'Về danh sách',
    'listening.correct': 'Đúng',
    'listening.wrong': 'Sai',
    'listening.skipped': 'Bỏ qua',
    'listening.score': 'Điểm',
    'listening.accuracy': 'Độ chính xác',
    'listening.question': 'Câu {n}',
    'listening.directions': 'Hướng dẫn',
    'listening.part': 'Part {n}',
    'listening.part1': 'Part 1: Mô tả tranh',
    'listening.part2': 'Part 2: Hỏi - Đáp',
    'listening.part3': 'Part 3: Hội thoại',
    'listening.part4': 'Part 4: Bài nói',
```

- [ ] **Step 4: Type check + lint**

```bash
pnpm tsc -b --noEmit && pnpm eslint src/types/listening.types.ts src/i18n/index.ts
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/types/listening.types.ts src/i18n/index.ts
git commit -m "feat: add listening types and i18n keys"
```

---

### Task 2: Zustand Store

**Files:**
- Create: `src/stores/useListeningStore.ts`

- [ ] **Step 1: Write store**

```typescript
// src/stores/useListeningStore.ts
import { create } from 'zustand'
import type { ListeningMode } from '@/types/listening.types'

interface ListeningState {
  selectedTopicId: string | null
  selectedTestId: string | null
  selectedPartId: string | null
  mode: ListeningMode
  setTopic: (id: string) => void
  setTest: (id: string) => void
  setPart: (id: string) => void
  setMode: (mode: ListeningMode) => void
  reset: () => void
}

export const useListeningStore = create<ListeningState>((set) => ({
  selectedTopicId: null,
  selectedTestId: null,
  selectedPartId: null,
  mode: 'test',
  setTopic: (id) => set({ selectedTopicId: id, selectedTestId: null, selectedPartId: null }),
  setTest: (id) => set({ selectedTestId: id, selectedPartId: null }),
  setPart: (id) => set({ selectedPartId: id }),
  setMode: (mode) => set({ mode }),
  reset: () => set({ selectedTopicId: null, selectedTestId: null, selectedPartId: null, mode: 'test' }),
}))
```

- [ ] **Step 2: Type check**

```bash
pnpm tsc -b --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/stores/useListeningStore.ts
git commit -m "feat: add listening store"
```

---

### Task 3: Demo Data

**Files:**
- Create: `src/features/listening/demoData.ts`

- [ ] **Step 1: Write demo data**

```typescript
// src/features/listening/demoData.ts
import type { ListeningTopic, ListeningTest, ListeningPart, ListeningQuestion } from '@/types/listening.types'

export const demoTopic: ListeningTopic = {
  id: 'ets2026',
  title: 'ETS 2026',
  description: 'Bộ đề TOEIC Listening ETS 2026',
  order: 1,
}

export const demoTest: ListeningTest = {
  id: 'ets2026-test1',
  topicId: 'ets2026',
  title: 'Test 1',
  order: 1,
}

export const demoParts: ListeningPart[] = [
  {
    id: 'ets2026-test1-part1',
    testId: 'ets2026-test1',
    partNumber: 1,
    directions: 'For each question, you will hear four statements about a picture. Select the statement that best describes the picture.',
    audioSrc: '/audio/listening/part1-sample.mp3',
    imageUrl: 'https://placehold.co/600x400/1c293c/fbfbf9?text=Part+1+Sample',
  },
  {
    id: 'ets2026-test1-part2',
    testId: 'ets2026-test1',
    partNumber: 2,
    directions: 'You will hear a question and three responses. Choose the best response.',
    audioSrc: '/audio/listening/part2-sample.mp3',
    transcript: "Who is in charge of the marketing project?\nMr. Thompson has been leading it since January.\nThe deadline is next Friday.",
  },
  {
    id: 'ets2026-test1-part3',
    testId: 'ets2026-test1',
    partNumber: 3,
    directions: 'You will hear conversations between two or three people. Answer three questions about each conversation.',
    audioSrc: '/audio/listening/part3-sample.mp3',
    transcript: "W: Hello, I'd like to inquire about the conference room booking.\nM: Certainly. Which date are you looking at?\nW: March 15th, for the whole afternoon.\nM: Let me check... Yes, Room 302 is available. Would you like me to reserve it?\nW: Yes, please. And could you arrange for a projector as well?",
  },
  {
    id: 'ets2026-test1-part4',
    testId: 'ets2026-test1',
    partNumber: 4,
    directions: 'You will hear short talks. Answer three questions about each talk.',
    audioSrc: '/audio/listening/part4-sample.mp3',
    transcript: "Good morning everyone. This is your captain speaking. We are currently flying at 35,000 feet and expect to arrive in Tokyo at approximately 3:30 PM local time. The weather in Tokyo is partly cloudy with a temperature of 18 degrees Celsius. The cabin crew will be serving refreshments shortly. Thank you for flying with us.",
  },
]

export const demoQuestions: ListeningQuestion[] = [
  // Part 1 (6 questions)
  {
    id: 'p1q1', partId: 'ets2026-test1-part1', order: 1,
    questionText: 'Look at the picture.',
    options: ['The man is reading a book', 'The woman is typing on a laptop', 'They are having a meeting', 'The people are standing in line'],
    correctIndex: 2,
    explanation: 'The picture shows people sitting around a table having a meeting.',
  },
  {
    id: 'p1q2', partId: 'ets2026-test1-part1', order: 2,
    questionText: 'Look at the picture.',
    options: ['The car is parked on the street', 'The car is being repaired', 'The car is driving on the highway', 'The car is in the showroom'],
    correctIndex: 0,
  },
  // Part 2 (sample - 25 in real test)
  {
    id: 'p2q1', partId: 'ets2026-test1-part2', order: 1,
    questionText: 'Who is in charge of the marketing project?',
    options: ['Last month', 'Mr. Thompson', 'In the conference room'],
    correctIndex: 1,
  },
  {
    id: 'p2q2', partId: 'ets2026-test1-part2', order: 2,
    questionText: 'When will the report be ready?',
    options: ['By Friday afternoon', 'Yes, I have it', 'At the front desk'],
    correctIndex: 0,
  },
  {
    id: 'p2q3', partId: 'ets2026-test1-part2', order: 3,
    questionText: "Where is the manager's office?",
    options: ['On the third floor', 'Her name is Sarah', 'At 3 o\'clock'],
    correctIndex: 0,
  },
  // Part 3 (3 questions per conversation)
  {
    id: 'p3q1', partId: 'ets2026-test1-part3', order: 1,
    questionText: 'What does the woman want to do?',
    options: ['Book a conference room', 'Cancel a reservation', 'Order lunch', 'Schedule a flight'],
    correctIndex: 0,
  },
  {
    id: 'p3q2', partId: 'ets2026-test1-part3', order: 2,
    questionText: 'Which date is she looking at?',
    options: ['March 5th', 'March 10th', 'March 15th', 'March 20th'],
    correctIndex: 2,
  },
  {
    id: 'p3q3', partId: 'ets2026-test1-part3', order: 3,
    questionText: 'What extra equipment does she request?',
    options: ['A microphone', 'A projector', 'A whiteboard', 'A television'],
    correctIndex: 1,
  },
  // Part 4 (3 questions per talk)
  {
    id: 'p4q1', partId: 'ets2026-test1-part4', order: 1,
    questionText: 'What is the current altitude?',
    options: ['25,000 feet', '30,000 feet', '35,000 feet', '40,000 feet'],
    correctIndex: 2,
  },
  {
    id: 'p4q2', partId: 'ets2026-test1-part4', order: 2,
    questionText: 'What is the destination?',
    options: ['Seoul', 'Tokyo', 'Beijing', 'Bangkok'],
    correctIndex: 1,
  },
  {
    id: 'p4q3', partId: 'ets2026-test1-part4', order: 3,
    questionText: 'What is the temperature at the destination?',
    options: ['15 degrees', '18 degrees', '21 degrees', '25 degrees'],
    correctIndex: 1,
  },
]

export function getDemoPartById(partId: string): ListeningPart | undefined {
  return demoParts.find((p) => p.id === partId)
}

export function getDemoQuestionsByPartId(partId: string): ListeningQuestion[] {
  return demoQuestions.filter((q) => q.partId === partId)
}
```

- [ ] **Step 2: Type check**

```bash
pnpm tsc -b --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/listening/demoData.ts
git commit -m "feat: add listening demo data"
```

---

### Task 4: AudioPlayer Component

**Files:**
- Create: `src/components/listening/AudioPlayer.tsx`

- [ ] **Step 1: Write AudioPlayer**

```typescript
// src/components/listening/AudioPlayer.tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, SkipBack, SkipForward, Volume2 } from 'lucide-react'
import { cn } from '@/utils/cn'

const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

interface AudioPlayerProps {
  src: string
  autoPlay?: boolean
  allowSeek?: boolean
  allowSpeed?: boolean
  onEnd?: () => void
  onTimeUpdate?: (t: number) => void
}

export function AudioPlayer({ src, autoPlay = false, allowSeek = true, allowSpeed = true, onEnd, onTimeUpdate }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speedIdx, setSpeedIdx] = useState(2) // 1x
  const [showVolume, setShowVolume] = useState(false)
  const [volume, setVolume] = useState(1)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (autoPlay) audio.play().catch(() => {})
  }, [autoPlay])

  const onLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration)
  }

  const onTimeUpdateHandler = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
      onTimeUpdate?.(audioRef.current.currentTime)
    }
  }

  const onEndedHandler = () => {
    setPlaying(false)
    onEnd?.()
  }

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      audio.play().catch(() => {})
    }
    setPlaying(!playing)
  }, [playing])

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds))
  }, [])

  const seekTo = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!allowSeek || !audioRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    audioRef.current.currentTime = ratio * duration
  }, [allowSeek, duration])

  const cycleSpeed = () => {
    const next = (speedIdx + 1) % speeds.length
    setSpeedIdx(next)
    if (audioRef.current) audioRef.current.playbackRate = speeds[next]
  }

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-2 py-2">
      <audio
        ref={audioRef}
        src={src}
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={onTimeUpdateHandler}
        onEnded={onEndedHandler}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {allowSeek && (
        <button onClick={() => seek(-5)} className="neo-button min-h-0 p-1.5 rounded-md border-2 border-border bg-card active:neo-button-active transition shadow-[2px_2px_0_var(--border)]">
          <SkipBack size={16} />
        </button>
      )}

      <button onClick={togglePlay} className="neo-button min-h-0 p-1.5 rounded-md border-2 border-border bg-card active:neo-button-active transition shadow-[2px_2px_0_var(--border)]">
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>

      {allowSeek && (
        <button onClick={() => seek(5)} className="neo-button min-h-0 p-1.5 rounded-md border-2 border-border bg-card active:neo-button-active transition shadow-[2px_2px_0_var(--border)]">
          <SkipForward size={16} />
        </button>
      )}

      <span className="text-xs font-mono font-bold tabular-nums min-w-[4.5rem] text-center">
        {formatTime(currentTime)}/{formatTime(duration)}
      </span>

      <div
        onClick={seekTo}
        className={cn('flex-1 h-2 rounded-full border border-border bg-muted cursor-pointer overflow-hidden', !allowSeek && 'pointer-events-none opacity-50')}
      >
        <div className="h-full bg-primary rounded-full transition-all duration-100" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
      </div>

      {allowSpeed && (
        <button onClick={cycleSpeed} className="neo-button min-h-0 px-2 py-0.5 rounded-md border-2 border-border bg-card text-xs font-black active:neo-button-active transition shadow-[2px_2px_0_var(--border)]">
          {speeds[speedIdx]}x
        </button>
      )}

      <div className="relative">
        <button onClick={() => setShowVolume(!showVolume)} className="neo-button min-h-0 p-1.5 rounded-md border-2 border-border bg-card active:neo-button-active transition shadow-[2px_2px_0_var(--border)]">
          <Volume2 size={16} />
        </button>
        {showVolume && (
          <div className="absolute bottom-full right-0 mb-2 neo-card p-2 z-50">
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => {
                const v = parseFloat(e.target.value)
                setVolume(v)
                if (audioRef.current) audioRef.current.volume = v
              }}
              className="w-24 accent-primary"
            />
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type check + lint**

```bash
pnpm tsc -b --noEmit && pnpm eslint src/components/listening/AudioPlayer.tsx
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/listening/AudioPlayer.tsx
git commit -m "feat: add AudioPlayer component"
```

---

### Task 5: ProgressBar + Part Rendering Shell

**Files:**
- Create: `src/components/listening/ProgressBar.tsx`

- [ ] **Step 1: Write ProgressBar**

```typescript
// src/components/listening/ProgressBar.tsx

interface ProgressBarProps {
  current: number
  total: number
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold">{current}/{total}</span>
      <div className="flex-1 h-2 rounded-full border border-border bg-muted overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(current / total) * 100}%` }} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type check**

```bash
pnpm tsc -b --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/listening/ProgressBar.tsx
git commit -m "feat: add listening ProgressBar component"
```

---

### Task 6: Part Renderers (Part1 - Part4)

**Files:**
- Create: `src/components/listening/Part1Renderer.tsx`
- Create: `src/components/listening/Part2Renderer.tsx`
- Create: `src/components/listening/Part3Renderer.tsx`
- Create: `src/components/listening/Part4Renderer.tsx`

- [ ] **Step 1: Write Part1Renderer**

```typescript
// src/components/listening/Part1Renderer.tsx
import type { ListeningPart, ListeningQuestion } from '@/types/listening.types'

interface Props {
  part: ListeningPart
  question: ListeningQuestion
  selectedAnswer?: number
  showResult?: boolean
  onAnswer: (questionOrder: number, answerIndex: number) => void
}

export function Part1Renderer({ part, question, selectedAnswer, showResult, onAnswer }: Props) {
  return (
    <div className="grid gap-4">
      {part.imageUrl && (
        <div className="neo-card p-2">
          <img src={part.imageUrl} alt="Part 1" className="w-full max-h-64 object-contain rounded-md" />
        </div>
      )}
      <div className="grid gap-2">
        {question.options.map((option, idx) => {
          const letter = String.fromCharCode(65 + idx)
          const isSelected = selectedAnswer === idx
          const isCorrect = question.correctIndex === idx
          let bgClass = 'bg-card hover:bg-muted'
          if (showResult) {
            if (isCorrect) bgClass = 'bg-success/20 border-success'
            else if (isSelected && !isCorrect) bgClass = 'bg-danger/20 border-danger'
          } else if (isSelected) {
            bgClass = 'bg-primary text-primary-foreground'
          }

          return (
            <button
              key={idx}
              onClick={() => !showResult && onAnswer(question.order, idx)}
              disabled={showResult}
              className={`neo-button min-h-0 p-3 rounded-md border-2 border-border text-sm font-semibold text-left transition active:neo-button-active ${bgClass}`}
            >
              <span className="font-black mr-2">{letter}.</span>
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write Part2Renderer**

```typescript
// src/components/listening/Part2Renderer.tsx
import type { ListeningQuestion } from '@/types/listening.types'

interface Props {
  question: ListeningQuestion
  selectedAnswer?: number
  showResult?: boolean
  onAnswer: (questionOrder: number, answerIndex: number) => void
}

export function Part2Renderer({ question, selectedAnswer, showResult, onAnswer }: Props) {
  return (
    <div className="grid gap-4">
      <p className="text-lg font-black">{question.questionText}</p>
      <div className="grid gap-2">
        {question.options.map((option, idx) => {
          const letter = String.fromCharCode(65 + idx)
          const isSelected = selectedAnswer === idx
          const isCorrect = question.correctIndex === idx
          let bgClass = 'bg-card hover:bg-muted'
          if (showResult) {
            if (isCorrect) bgClass = 'bg-success/20 border-success'
            else if (isSelected && !isCorrect) bgClass = 'bg-danger/20 border-danger'
          } else if (isSelected) {
            bgClass = 'bg-primary text-primary-foreground'
          }

          return (
            <button
              key={idx}
              onClick={() => !showResult && onAnswer(question.order, idx)}
              disabled={showResult}
              className={`neo-button min-h-0 p-3 rounded-md border-2 border-border text-sm font-semibold text-left transition active:neo-button-active ${bgClass}`}
            >
              <span className="font-black mr-2">{letter}.</span>
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write Part3Renderer**

```typescript
// src/components/listening/Part3Renderer.tsx
import type { ListeningQuestion } from '@/types/listening.types'

interface Props {
  questions: ListeningQuestion[]
  currentIndex: number
  answers: Record<number, number>
  showResult?: boolean
  onAnswer: (questionOrder: number, answerIndex: number) => void
  onNavigate: (index: number) => void
}

export function Part3Renderer({ questions, currentIndex, answers, showResult, onAnswer, onNavigate }: Props) {
  const q = questions[currentIndex]
  if (!q) return null

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-1.5">
        {questions.map((qItem, idx) => {
          const answered = answers[qItem.order] !== undefined
          return (
            <button
              key={qItem.id}
              onClick={() => onNavigate(idx)}
              className={`neo-button min-h-0 px-2.5 py-1 rounded-md border-2 text-xs font-black transition ${
                idx === currentIndex
                  ? 'border-border bg-primary text-primary-foreground shadow-[2px_2px_0_var(--border)]'
                  : answered
                    ? 'border-border bg-muted'
                    : 'border-border bg-card hover:bg-muted'
              }`}
            >
              {qItem.order}
            </button>
          )
        })}
      </div>

      <p className="text-lg font-black">{q.questionText}</p>

      <div className="grid gap-2">
        {q.options.map((option, idx) => {
          const letter = String.fromCharCode(65 + idx)
          const isSelected = answers[q.order] === idx
          const isCorrect = q.correctIndex === idx
          let bgClass = 'bg-card hover:bg-muted'
          if (showResult) {
            if (isCorrect) bgClass = 'bg-success/20 border-success'
            else if (isSelected && !isCorrect) bgClass = 'bg-danger/20 border-danger'
          } else if (isSelected) {
            bgClass = 'bg-primary text-primary-foreground'
          }

          return (
            <button
              key={idx}
              onClick={() => !showResult && onAnswer(q.order, idx)}
              disabled={showResult}
              className={`neo-button min-h-0 p-3 rounded-md border-2 border-border text-sm font-semibold text-left transition active:neo-button-active ${bgClass}`}
            >
              <span className="font-black mr-2">{letter}.</span>
              {option}
            </button>
          )
        })}
      </div>

      {showResult && q.explanation && (
        <p className="text-xs text-muted-foreground border-t-2 border-border pt-2">{q.explanation}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Write Part4Renderer**

```typescript
// src/components/listening/Part4Renderer.tsx
import type { ListeningQuestion } from '@/types/listening.types'

interface Props {
  questions: ListeningQuestion[]
  currentIndex: number
  answers: Record<number, number>
  showResult?: boolean
  onAnswer: (questionOrder: number, answerIndex: number) => void
  onNavigate: (index: number) => void
}

export function Part4Renderer({ questions, currentIndex, answers, showResult, onAnswer, onNavigate }: Props) {
  const q = questions[currentIndex]
  if (!q) return null

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-1.5">
        {questions.map((qItem, idx) => {
          const answered = answers[qItem.order] !== undefined
          return (
            <button
              key={qItem.id}
              onClick={() => onNavigate(idx)}
              className={`neo-button min-h-0 px-2.5 py-1 rounded-md border-2 text-xs font-black transition ${
                idx === currentIndex
                  ? 'border-border bg-primary text-primary-foreground shadow-[2px_2px_0_var(--border)]'
                  : answered
                    ? 'border-border bg-muted'
                    : 'border-border bg-card hover:bg-muted'
              }`}
            >
              {qItem.order}
            </button>
          )
        })}
      </div>

      <p className="text-lg font-black">{q.questionText}</p>

      <div className="grid gap-2">
        {q.options.map((option, idx) => {
          const letter = String.fromCharCode(65 + idx)
          const isSelected = answers[q.order] === idx
          const isCorrect = q.correctIndex === idx
          let bgClass = 'bg-card hover:bg-muted'
          if (showResult) {
            if (isCorrect) bgClass = 'bg-success/20 border-success'
            else if (isSelected && !isCorrect) bgClass = 'bg-danger/20 border-danger'
          } else if (isSelected) {
            bgClass = 'bg-primary text-primary-foreground'
          }

          return (
            <button
              key={idx}
              onClick={() => !showResult && onAnswer(q.order, idx)}
              disabled={showResult}
              className={`neo-button min-h-0 p-3 rounded-md border-2 border-border text-sm font-semibold text-left transition active:neo-button-active ${bgClass}`}
            >
              <span className="font-black mr-2">{letter}.</span>
              {option}
            </button>
          )
        })}
      </div>

      {showResult && q.explanation && (
        <p className="text-xs text-muted-foreground border-t-2 border-border pt-2">{q.explanation}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Type check**

```bash
pnpm tsc -b --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/listening/Part1Renderer.tsx src/components/listening/Part2Renderer.tsx src/components/listening/Part3Renderer.tsx src/components/listening/Part4Renderer.tsx
git commit -m "feat: add Part1-4 renderers"
```

---

### Task 7: DictationRenderer + TestModeRenderer

**Files:**
- Create: `src/components/listening/DictationRenderer.tsx`
- Create: `src/components/listening/TestModeRenderer.tsx`

- [ ] **Step 1: Write DictationRenderer**

```typescript
// src/components/listening/DictationRenderer.tsx
import { useState } from 'react'
import { useI18n } from '@/i18n'

interface DictationRendererProps {
  transcript: string
  dictAnswers: Record<number, string>
  showResult?: boolean
  correctAnswers?: string[]
  onDictAnswer: (blankIndex: number, value: string) => void
}

export function DictationRenderer({ transcript, dictAnswers, showResult, correctAnswers, onDictAnswer }: DictationRendererProps) {
  const { t } = useI18n()
  const [currentBlank, setCurrentBlank] = useState(0)

  // Split transcript into words for fill-in-blank exercise
  // In MVP, show full transcript with input fields below for each sentence
  const sentences = transcript.split('\n').filter(Boolean)
  const totalBlanks = sentences.length

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (idx < totalBlanks - 1) setCurrentBlank(idx + 1)
    }
  }

  return (
    <div className="grid gap-4">
      <p className="text-xs font-black uppercase text-muted-foreground">{t('listening.dictationMode')}</p>
      {sentences.map((sentence, idx) => {
        const userAnswer = dictAnswers[idx] ?? ''
        const isCorrect = showResult && correctAnswers ? userAnswer.trim().toLowerCase() === (correctAnswers[idx] ?? '').toLowerCase() : null

        return (
          <div key={idx} className={`neo-card p-3 ${showResult ? (isCorrect ? 'border-success' : 'border-danger') : ''}`}>
            <p className="text-sm font-semibold mb-2">{sentence}</p>
            <div className="flex items-center gap-2">
              <input
                value={userAnswer}
                onChange={(e) => onDictAnswer(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                onFocus={() => setCurrentBlank(idx)}
                placeholder="Nhập câu bạn nghe được..."
                className={`flex-1 neo-card min-h-0 px-3 py-2 rounded-md border-2 border-border bg-card text-sm font-semibold focus:outline-none focus:border-secondary ${
                  showResult ? (isCorrect ? 'bg-success/10' : 'bg-danger/10') : idx === currentBlank ? 'border-secondary' : ''
                }`}
              />
              {showResult && (
                <span className={`text-xs font-black ${isCorrect ? 'text-success' : 'text-danger'}`}>
                  {isCorrect ? '✓' : '✗'}
                </span>
              )}
            </div>
            {showResult && !isCorrect && correctAnswers?.[idx] && (
              <p className="mt-1 text-xs text-success font-semibold">Đáp án: {correctAnswers[idx]}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Write TestModeRenderer**

```typescript
// src/components/listening/TestModeRenderer.tsx
import type { ListeningPart, ListeningQuestion } from '@/types/listening.types'
import { Part1Renderer } from '@/components/listening/Part1Renderer'
import { Part2Renderer } from '@/components/listening/Part2Renderer'
import { Part3Renderer } from '@/components/listening/Part3Renderer'
import { Part4Renderer } from '@/components/listening/Part4Renderer'

interface TestModeRendererProps {
  part: ListeningPart
  questions: ListeningQuestion[]
  currentIndex: number
  answers: Record<number, number>
  showResult?: boolean
  onAnswer: (questionOrder: number, answerIndex: number) => void
  onNavigate: (index: number) => void
}

export function TestModeRenderer({ part, questions, currentIndex, answers, showResult, onAnswer, onNavigate }: TestModeRendererProps) {
  if (questions.length === 0) {
    return <p className="text-sm text-muted-foreground">No questions available.</p>
  }

  if (part.partNumber === 1) {
    return (
      <Part1Renderer
        part={part}
        question={questions[currentIndex]}
        selectedAnswer={answers[questions[currentIndex]?.order]}
        showResult={showResult}
        onAnswer={onAnswer}
      />
    )
  }

  if (part.partNumber === 2) {
    return (
      <Part2Renderer
        question={questions[currentIndex]}
        selectedAnswer={answers[questions[currentIndex]?.order]}
        showResult={showResult}
        onAnswer={onAnswer}
      />
    )
  }

  if (part.partNumber === 3) {
    return (
      <Part3Renderer
        questions={questions}
        currentIndex={currentIndex}
        answers={answers}
        showResult={showResult}
        onAnswer={onAnswer}
        onNavigate={onNavigate}
      />
    )
  }

  return (
    <Part4Renderer
      questions={questions}
      currentIndex={currentIndex}
      answers={answers}
      showResult={showResult}
      onAnswer={onAnswer}
      onNavigate={onNavigate}
    />
  )
}
```

- [ ] **Step 3: Type check**

```bash
pnpm tsc -b --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/listening/DictationRenderer.tsx src/components/listening/TestModeRenderer.tsx
git commit -m "feat: add Dictation and TestMode renderers"
```

---

### Task 8: Selection Pages (Topic, Test, Part)

**Files:**
- Create: `src/pages/listening/TopicSelectionPage.tsx`
- Create: `src/pages/listening/TestSelectionPage.tsx`
- Create: `src/pages/listening/PartSelectionPage.tsx`

- [ ] **Step 1: Write TopicSelectionPage**

```typescript
// src/pages/listening/TopicSelectionPage.tsx
import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { demoTopic } from '@/features/listening/demoData'
import { useListeningStore } from '@/stores/useListeningStore'
import { Card, CardTitle } from '@/components/ui/card'

export function TopicSelectionPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const setTopic = useListeningStore((s) => s.setTopic)

  const handleSelect = (topicId: string) => {
    setTopic(topicId)
    navigate(`/app/listening/${topicId}`)
  }

  return (
    <div>
      <h1 className="text-2xl font-black mb-4">{t('listening.selectTopic')}</h1>
      <Card className="hover:bg-muted cursor-pointer transition" onClick={() => handleSelect(demoTopic.id)}>
        <CardTitle>{demoTopic.title}</CardTitle>
        {demoTopic.description && <p className="text-sm text-muted-foreground mt-1">{demoTopic.description}</p>}
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Write TestSelectionPage**

```typescript
// src/pages/listening/TestSelectionPage.tsx
import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { demoTest } from '@/features/listening/demoData'
import { useListeningStore } from '@/stores/useListeningStore'
import { Card, CardTitle } from '@/components/ui/card'

export function TestSelectionPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const setTest = useListeningStore((s) => s.setTest)

  const handleSelect = (testId: string) => {
    setTest(testId)
    navigate(`${testId}`)
  }

  return (
    <div>
      <h1 className="text-2xl font-black mb-4">{t('listening.selectTest')}</h1>
      <Card className="hover:bg-muted cursor-pointer transition" onClick={() => handleSelect(demoTest.id)}>
        <CardTitle>{demoTest.title}</CardTitle>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Write PartSelectionPage**

```typescript
// src/pages/listening/PartSelectionPage.tsx
import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { demoParts } from '@/features/listening/demoData'
import { useListeningStore } from '@/stores/useListeningStore'
import { Card, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import type { ListeningMode } from '@/types/listening.types'

const partLabels: Record<number, string> = {
  1: 'listening.part1',
  2: 'listening.part2',
  3: 'listening.part3',
  4: 'listening.part4',
}

export function PartSelectionPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { mode, setPart, setMode } = useListeningStore()

  const handleStart = (partId: string) => {
    setPart(partId)
    navigate(`/app/listening/session/${partId}/${mode}`)
  }

  return (
    <div>
      <h1 className="text-2xl font-black mb-4">{t('listening.selectPart')}</h1>

      <div className="grid gap-3 mb-6">
        <p className="text-xs font-black uppercase text-muted-foreground">{t('listening.mode')}</p>
        <div className="flex gap-2">
          {(['test', 'dictation'] as ListeningMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                'neo-button min-h-0 px-4 py-2 rounded-md border-2 text-sm font-bold transition',
                mode === m
                  ? 'border-border bg-primary text-primary-foreground shadow-[2px_2px_0_var(--border)]'
                  : 'border-border bg-card hover:bg-muted shadow-[2px_2px_0_var(--border)]',
              )}
            >
              {m === 'test' ? t('listening.testMode') : t('listening.dictationMode')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        {demoParts.map((part) => (
          <Card key={part.id} className="grid gap-2">
            <CardTitle>{t(partLabels[part.partNumber])}</CardTitle>
            <p className="text-xs text-muted-foreground">{part.directions}</p>
            <Button onClick={() => handleStart(part.id)}>{t('listening.startSession')}</Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Type check**

```bash
pnpm tsc -b --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/listening/TopicSelectionPage.tsx src/pages/listening/TestSelectionPage.tsx src/pages/listening/PartSelectionPage.tsx
git commit -m "feat: add listening selection pages"
```

---

### Task 9: ListeningSessionPage

**Files:**
- Create: `src/pages/listening/ListeningSessionPage.tsx`

- [ ] **Step 1: Write ListeningSessionPage**

```typescript
// src/pages/listening/ListeningSessionPage.tsx
import { useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AudioPlayer } from '@/components/listening/AudioPlayer'
import { TestModeRenderer } from '@/components/listening/TestModeRenderer'
import { DictationRenderer } from '@/components/listening/DictationRenderer'
import { ProgressBar } from '@/components/listening/ProgressBar'
import { useI18n } from '@/i18n'
import { getDemoPartById, getDemoQuestionsByPartId } from '@/features/listening/demoData'

export function ListeningSessionPage() {
  const { partId, mode } = useParams<{ partId: string; mode: 'test' | 'dictation' }>()
  const { t } = useI18n()
  const navigate = useNavigate()
  const isTest = mode === 'test'
  const isDictation = mode === 'dictation'

  const part = getDemoPartById(partId ?? '')
  const allQuestions = getDemoQuestionsByPartId(partId ?? '')

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [dictAnswers, setDictAnswers] = useState<Record<number, string>>({})
  const [showResult, setShowResult] = useState(false)

  const handleAnswer = useCallback((questionOrder: number, answerIndex: number) => {
    if (showResult) return
    setAnswers((prev) => ({ ...prev, [questionOrder]: answerIndex }))
  }, [showResult])

  const handleDictAnswer = useCallback((blankIndex: number, value: string) => {
    if (showResult) return
    setDictAnswers((prev) => ({ ...prev, [blankIndex]: value }))
  }, [showResult])

  const goTo = (idx: number) => {
    if (idx >= 0 && idx < allQuestions.length) setCurrentIndex(idx)
  }

  const handleSubmit = () => {
    setShowResult(true)
  }

  const handleRetry = () => {
    setCurrentIndex(0)
    setAnswers({})
    setDictAnswers({})
    setShowResult(false)
  }

  const handleBack = () => {
    navigate(-1)
  }

  if (!part) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-black">Part not found</p>
        <Button onClick={handleBack} className="mt-4">{t('listening.backToList')}</Button>
      </div>
    )
  }

  const scored = allQuestions.length > 0
    ? allQuestions.filter((q) => answers[q.order] === q.correctIndex).length
    : 0

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={handleBack} className="neo-button min-h-0 p-2 rounded-md border-2 border-border bg-card active:neo-button-active transition shadow-[2px_2px_0_var(--border)]">
          <ChevronLeft size={16} />
        </button>
        <h1 className="text-lg font-black">{t(part.partNumber === 1 ? 'listening.part1' : part.partNumber === 2 ? 'listening.part2' : part.partNumber === 3 ? 'listening.part3' : 'listening.part4')}</h1>
        {!isDictation && <ProgressBar current={currentIndex + 1} total={allQuestions.length} />}
      </div>

      <AudioPlayer
        src={part.audioSrc}
        autoPlay={isTest}
        allowSeek={isDictation}
        allowSpeed={isDictation}
      />

      <div className="mt-4">
        {isDictation && part.transcript ? (
          <DictationRenderer
            transcript={part.transcript}
            dictAnswers={dictAnswers}
            showResult={showResult}
            correctAnswers={part.transcript.split('\n').filter(Boolean)}
            onDictAnswer={handleDictAnswer}
          />
        ) : (
          <TestModeRenderer
            part={part}
            questions={allQuestions}
            currentIndex={currentIndex}
            answers={answers}
            showResult={showResult}
            onAnswer={handleAnswer}
            onNavigate={setCurrentIndex}
          />
        )}
      </div>

      <div className="flex items-center justify-between mt-6">
        <Button variant="ghost" onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}>
          <ChevronLeft size={16} />
        </Button>
        <span className="text-sm font-bold">{currentIndex + 1} / {allQuestions.length}</span>
        <Button variant="ghost" onClick={() => goTo(currentIndex + 1)} disabled={currentIndex >= allQuestions.length - 1}>
          <ChevronRight size={16} />
        </Button>
      </div>

      <div className="flex justify-center gap-3 mt-6">
        {!showResult ? (
          <Button onClick={handleSubmit}>{t('listening.submit')}</Button>
        ) : (
          <>
            <div className="neo-card px-4 py-2 text-center">
              <p className="text-xs font-black uppercase text-muted-foreground">{t('listening.score')}</p>
              <p className="text-xl font-black">{scored}/{allQuestions.length}</p>
            </div>
            <Button onClick={handleRetry} variant="secondary">{t('listening.retry')}</Button>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type check**

```bash
pnpm tsc -b --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/listening/ListeningSessionPage.tsx
git commit -m "feat: add ListeningSessionPage"
```

---

### Task 10: ListeningResultPage

**Files:**
- Create: `src/pages/listening/ListeningResultPage.tsx`

- [ ] **Step 1: Write ListeningResultPage**

```typescript
// src/pages/listening/ListeningResultPage.tsx
import { useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { getDemoQuestionsByPartId } from '@/features/listening/demoData'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'

export function ListeningResultPage() {
  const { partId } = useParams<{ partId: string }>()
  const { t } = useI18n()
  const navigate = useNavigate()
  const questions = getDemoQuestionsByPartId(partId ?? '')

  // In future: read answers from session/localStorage
  const mockAnswers: Record<number, number> = {}
  const total = questions.length
  const correct = questions.filter((q) => mockAnswers[q.order] === q.correctIndex).length

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-black mb-4">{t('listening.score')}</h1>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="text-center">
          <p className="text-3xl font-black">{correct}/{total}</p>
          <p className="text-xs font-bold text-muted-foreground mt-1">{t('listening.score')}</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-black">{total > 0 ? Math.round((correct / total) * 100) : 0}%</p>
          <p className="text-xs font-bold text-muted-foreground mt-1">{t('listening.accuracy')}</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-black">{total - correct}</p>
          <p className="text-xs font-bold text-muted-foreground mt-1">{t('listening.wrong')}</p>
        </Card>
      </div>

      <div className="grid gap-2 mb-6">
        {questions.map((q, idx) => {
          const answered = mockAnswers[q.order]
          const isCorrect = answered === q.correctIndex
          return (
            <div key={q.id} className={`neo-card p-3 flex items-center justify-between gap-3 ${isCorrect ? 'border-success' : 'border-danger'}`}>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{idx + 1}. {q.questionText}</p>
                {answered !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    {t('listening.correct')}: {q.options[q.correctIndex]}
                  </p>
                )}
              </div>
              <span className={`text-sm font-black shrink-0 ${isCorrect ? 'text-success' : 'text-danger'}`}>
                {isCorrect ? '✓' : '✗'}
              </span>
            </div>
          )
        })}
      </div>

      <div className="flex gap-3">
        <Button onClick={() => navigate(-1)} variant="secondary">{t('listening.retry')}</Button>
        <Button onClick={() => navigate('/app/listening')} variant="ghost">{t('listening.backToList')}</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type check**

```bash
pnpm tsc -b --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/listening/ListeningResultPage.tsx
git commit -m "feat: add ListeningResultPage"
```

---

### Task 11: Routes + Navigation Integration

**Files:**
- Modify: `src/app/routes.tsx`

- [ ] **Step 1: Add imports to routes.tsx**

Add these imports at the top of `src/app/routes.tsx`, after the existing page imports:

```typescript
import { TopicSelectionPage } from '@/pages/listening/TopicSelectionPage'
import { TestSelectionPage } from '@/pages/listening/TestSelectionPage'
import { PartSelectionPage } from '@/pages/listening/PartSelectionPage'
import { ListeningSessionPage } from '@/pages/listening/ListeningSessionPage'
import { ListeningResultPage } from '@/pages/listening/ListeningResultPage'
```

- [ ] **Step 2: Add routes**

Inside the `children` array of the `/app` route (AppLayout), add these before the `statistics` redirect:

```typescript
{ path: 'listening', element: <TopicSelectionPage /> },
{ path: 'listening/:topicId', element: <TestSelectionPage /> },
{ path: 'listening/:topicId/:testId', element: <PartSelectionPage /> },
{ path: 'listening/session/:partId/:mode', element: <ListeningSessionPage /> },
{ path: 'listening/result/:partId', element: <ListeningResultPage /> },
```

- [ ] **Step 3: Type check + lint**

```bash
pnpm tsc -b --noEmit && pnpm eslint src/app/routes.tsx
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/routes.tsx
git commit -m "feat: add listening routes"
```

---

### Task 12: Header Nav Link

**Files:**
- Modify: `src/components/layout/Header.tsx`

- [ ] **Step 1: Update the "Nghe" nav item link**

In `Header.tsx`, the `mainNavItems` already has `{ labelKey: 'header.listening', to: '/app/listening', icon: Headphones }`. This is already correct — no change needed.

Verify with:
```bash
grep "listening" src/components/layout/Header.tsx
```
Expected output:
```
{ labelKey: 'header.listening', to: '/app/listening', icon: Headphones },
```

- [ ] **Step 2: Build + full test**

```bash
pnpm build && pnpm vitest run
```
Expected: build success, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: complete listening module integration"
```
```

## Self-Review Checklist

1. **Spec coverage:**
   - [x] Data model (types) → Task 1
   - [x] AudioPlayer → Task 4
   - [x] 4 Part renderers → Task 6
   - [x] Dictation mode → Task 7
   - [x] Test mode → Task 7
   - [x] Selection pages → Task 8
   - [x] Session page → Task 9
   - [x] Result page → Task 10
   - [x] Routes → Task 11
   - [x] i18n → Task 1

2. **Placeholder scan:** No TBDs, TODOs, or vague instructions.

3. **Type consistency:** Types from Task 1 used consistently across Tasks 3, 6, 7, 8, 9, 10. Store types from Task 2 used in Task 8.

4. **Gap analysis:**
   - The header "Nghe" link already exists from earlier work
   - Demo data covers all 4 Parts with sample questions
   - Result page currently uses mock answers (will need session integration later)
   - No Supabase integration in MVP (per spec)
