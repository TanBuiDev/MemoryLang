# Quiz Retry Wrong Answers — Design

## Overview

After completing a translation-input quiz, users can retry only the questions they answered incorrectly, repeating until all are correct or they choose to stop.

## Approach

**SessionStorage-based (Approach A)**: Store wrong question IDs in the existing `StoredQuizSession`. No database changes needed. Wrong answers are identified via `revealedQuestionIds` (questions where the user revealed the answer) within the active session.

## Data Model Changes

### `StoredQuizSession` (`sessionPersistence.ts`)

Two new optional fields:

```ts
export interface StoredQuizSession {
  // ... existing fields
  wrongQuestionIds: string[]    // userTermId of incorrect questions
  totalQuestionIds: string[]    // original userTermIds for tracking overall progress
}
```

- `wrongQuestionIds`: populated on quiz completion; empty array by default for backward compatibility
- `totalQuestionIds`: set once at first session creation; never changes across retries. Used to display progress like "5/10" even when retrying only 3 questions.

No `STORAGE_VERSION` bump needed — new fields default to `[]` on read.

## Flow Changes

### Current flow:
```
Last question answered → clearSession → saveResult → navigate('/app/quiz')
```

### New flow:
```
Last question answered → compute wrongQuestionIds → setIsCompleted(true)
  → show result card (score, accuracy, wrong count)
  → [Retry wrong] → generate new session from wrong questions → setIsCompleted(false)
  → [Finish] → clearSession → saveResult → navigate('/app/quiz')
```

## UI Changes

### Result View (`QuizSessionPage.tsx`)

When `isCompleted`, replace the quiz question UI with a result card:

- Title: "Quiz result"
- Stats: score (e.g., 7/10), accuracy percentage, wrong count
- If wrong > 0: show "Retry wrong" button + "Finish" button
- If wrong === 0: show "Perfect! All correct." + "Finish" button
- The sidebar question grid shows progress based on `totalQuestionIds.length`

### Retry Logic

```ts
function retryWrong() {
  const wrongQuestions = session.questions.filter(
    q => session.wrongQuestionIds.includes(q.userTermId)
  )
  const newSession = {
    questions: shuffle(wrongQuestions),
    index: 0, score: 0,
    revealedQuestionIds: [],
    completedQuestionIds: [],
    fuzzyCorrectQuestionIds: [],
    deckId: session.deckId,
    wrongQuestionIds: [],
    totalQuestionIds: session.totalQuestionIds,  // preserved
  }
  writeStoredQuizSession(sessionKey, newSession)
  setSession(newSession)
  setIsCompleted(false)
}
```

## i18n Keys

| Key | EN | VI |
|---|---|---|
| `quiz.resultRetryWrong` | Retry wrong | Làm lại từ sai |
| `quiz.resultPerfect` | Perfect! All correct. | Hoàn hảo! Đúng hết. |
| `quiz.resultEnd` | Finish | Kết thúc |

## Files Changed

| File | Change |
|---|---|
| `src/features/quiz/sessionPersistence.ts` | Add `wrongQuestionIds`, `totalQuestionIds` to interface + serialization |
| `src/pages/quiz/QuizSessionPage.tsx` | Add `isCompleted` state, result view, retry/end handlers, progress tracking |
| `src/i18n/index.ts` | 3 new translation keys |

## Edge Cases

- **All correct on first try**: hide retry button, show perfect message
- **Browser refresh during retry**: session persists in sessionStorage, `totalQuestionIds` preserved
- **Browser tab close**: session lost (sessionStorage is tab-scoped) — expected behavior
- **Multi-word phrases**: `userTermId` matching works regardless of question count per term
- **Demo mode**: retry works identically since it uses same sessionStorage mechanism
