# Quiz Timer - Design Spec

**Date:** 2026-06-09  
**Status:** Approved

## Overview

Add a visible count-up elapsed timer to the quiz session page. The timer displays in a fixed top bar and continues running across retries without resetting.

## Requirements

1. Fixed top bar showing elapsed time in `MM:SS` format
2. Count-up (no time limit), starts when quiz session begins
3. Timer does NOT reset when retrying wrong answers — it keeps running from the original start time
4. Timer remains visible on the result screen showing final elapsed time
5. Survives page reload (sessionStorage already persists session; timer resumes from `startedAtRef` origin)

## Implementation Plan

### Files to modify

| File | Change |
|---|---|
| `src/pages/quiz/QuizSessionPage.tsx` | Add elapsed timer state, interval, and fixed top bar UI. Remove `startedAtRef` reset in `retryWrong()`. |
| `src/i18n/index.ts` | Add `quiz.timeLabel` key for vi/en |

### Code Changes

#### 1. `QuizSessionPage.tsx`

**Add timer state and interval:**
- New state: `const [elapsedSec, setElapsedSec] = useState(0)`
- `useEffect` with `setInterval(1000)` that computes `Math.floor((Date.now() - startedAtRef.current) / 1000)` and updates `elapsedSec`
- Cleanup clears interval

**Remove timer reset on retry:**
- In `retryWrong()`: remove `startedAtRef.current = Date.now()` (line 311)

**Add fixed top bar:**
- A sticky bar at the top of the quiz layout, between nav and the current content
- Contains: clock icon (from lucide-react `Clock`) + formatted time + label
- Format: `MM:SS` using simple math (min = floor(sec/60), sec = sec % 60, padStart 2)
- Visible in both active quiz view and completed result view

**Layout structure:**
```
<sticky top bar: [icon] MM:SS — label>
<existing quiz content / result screen>
```

#### 2. `i18n/index.ts`

Keys to add:
- `quiz.timeLabel`: "Thời gian" (vi) / "Time" (en)

### Not in scope
- No time limit / countdown
- No timer in sessionStorage (derived from `startedAtRef`)
- No sound or alert on timer milestones
- No timer pause/resume controls
- No timer in quiz history/results database (already stored as `duration_ms`)
