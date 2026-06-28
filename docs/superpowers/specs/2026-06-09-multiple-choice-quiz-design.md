# Multiple Choice Quiz - Design Spec

**Date:** 2026-06-09  
**Status:** Approved

## Overview

Add a new multiple-choice quiz mode ("Trắc nghiệm") to the existing quiz system. Each question presents the source word with its IPA/part-of-speech, 4 translation options (1 correct + 3 distractors), and provides immediate color feedback with auto-advance.

## Requirements

### Quiz Type
- New quiz type: `'multiple_choice'` added to `QuizType`
- Setup page allows switching between "Nhập bản dịch" and "Trắc nghiệm"
- Quiz store tracks selected type

### Question Generation
- Source: filtered active vocabulary with translations (same as translation_input)
- Each question produces 4 options:
  - 1 correct: the term's own translation
  - 3 distractors: translations from other vocabulary items
- Distractor selection:
  1. Exclude the current term
  2. Sort candidates by character-length proximity to the correct answer
  3. Pick the 3 closest in length
  4. Fall back to any available if fewer than 3 exist
- Options shuffled randomly (positions A/B/C/D)

### UI Layout
- Same card structure as translation_input:
  - Audio button (top-right)
  - Flag button (top-right, next to audio)
  - "Câu hỏi X/N" label
  - Source word (large, centered)
  - IPA + part-of-speech badges (below word)
  - 4 answer buttons stacked vertically
  - Hotkey hint at bottom
- Timer bar stays at top (already implemented)

### Answer Buttons
- Neobrutalist style: `border-2 border-border`, `shadow-[2px_2px_0_var(--border)]`, bold text
- Labels: `A.`, `B.`, `C.`, `D.` prefix before translation text
- Hover: `bg-muted`
- Active: `active:translate-x-[1px] active:translate-y-[1px]`
- Disabled after any option is selected (prevents double-choice)

### Feedback (after selection)
- **Correct choice:** selected button → `bg-success/20 border-success text-success`, auto-advance after 1.2s
- **Wrong choice:** selected button → `bg-danger/20 border-danger text-danger`, correct answer button → `bg-success/20 border-success text-success`, auto-advance after 1.5s
- No retry on wrong answer (single attempt per question)

### Hotkeys
| Key | Action |
|-----|--------|
| `1` `2` `3` `4` | Select option A/B/C/D |
| `Ctrl+Space` | Play audio |

### Result Screen
- Same result screen as translation_input:
  - Score: correctCount / totalQuestions
  - Accuracy percentage
  - Wrong answer count
  - "Làm lại câu sai" button (if not perfect) — retries only incorrect questions
  - "Kết thúc" button
- Timer displayed on result screen (already implemented)

### Session Persistence
- New `MultipleChoiceQuestion` type in `quiz.types.ts`
- `StoredQuizSession` extended to support both question types (union or discriminated)
- `sessionPersistence.ts` version bump for new question format
- Session survives page reload with position, score, revealed IDs preserved

### Timer
- Reuses existing timer implementation (count-up, survives reload, continues on retry)

## Implementation Scope

### New files
- `src/features/quiz/multipleChoiceQuiz.ts` — question generator + distractor selector + answer checker

### Modified files
| File | Change |
|------|--------|
| `src/types/quiz.types.ts` | Add `'multiple_choice'` to `QuizType`, add `MultipleChoiceQuestion` interface |
| `src/features/quiz/sessionPersistence.ts` | Extend `StoredQuizSession` for both question types, bump version |
| `src/features/quiz/sessionPersistence.test.ts` | Update tests for new version |
| `src/pages/quiz/QuizSetupPage.tsx` | Add quiz type selector (dropdown/tabs), wire `multiple_choice` flow |
| `src/pages/quiz/QuizSessionPage.tsx` | Branch rendering: `translation_input` vs `multiple_choice` based on session question type |
| `src/stores/useQuizStore.ts` | `quizType` selection already exists; no store changes needed |
| `src/i18n/index.ts` | Add keys: `quiz.multipleChoice`, `quiz.optionHint`, `quiz.correctAnswer` |
| `src/pages/quiz/QuizSetupPage.test.tsx` | Add test for multiple_choice setup flow |
| `src/pages/quiz/QuizSessionPage.test.tsx` | Add tests for multiple_choice session |

### Not in scope
- Matching quiz (`matching`)
- Fill-blank quiz (`fill_blank`)
- Mixed quiz (`mixed`)
- Audio auto-play for multiple choice (retained as future option)

## Distractor Algorithm

```
function selectDistractors(
  correctTerm: VocabularyItem,
  allTerms: VocabularyItem[],
): string[] {
  const correctTranslation = correctTerm.translation.trim()
  const candidates = allTerms
    .filter(t => t.id !== correctTerm.id && t.translation?.trim())
    .map(t => t.translation.trim())

  const scored = candidates.map(c => ({
    text: c,
    dist: Math.abs(c.length - correctTranslation.length),
  }))

  scored.sort((a, b) => a.dist - b.dist)
  
  const selected = scored.slice(0, 3).map(s => s.text)
  const unique = [...new Set(selected)] // prevent duplicate distractors
  
  while (unique.length < 3 && candidates.length > unique.length) {
    const next = candidates.find(c => !unique.includes(c) && c !== correctTranslation)
    if (next) unique.push(next)
    else break
  }
  
  return unique.slice(0, 3)
}
```
