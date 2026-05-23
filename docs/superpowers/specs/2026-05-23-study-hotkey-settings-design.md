# Study Hotkey Settings Design

**Date:** 2026-05-23  
**Status:** Approved for implementation

## Goal

Add a keyboard shortcut configuration section in Settings so learners can operate the flashcard session without relying on the mouse, including fast confirmation of the localized `Remembered` / `Đã nhớ` prompt.

## Scope

The Settings page adds a `Study hotkeys` / `Phím tắt khi học` card for these flashcard actions:

| Action | Default hotkey | Availability |
| --- | --- | --- |
| Confirm remembered | `Space` | Only while the centered remember-confirmation tile is shown |
| Remember | `1` | Normal grading toolbar sessions only |
| Forgot | `2` | Normal grading toolbar sessions only |
| Flip card | `F` | While a card is visible |
| Previous card | `ArrowLeft` | When backward navigation is permitted |
| Next card / complete | `ArrowRight` | Uses the current right-navigation behavior |
| Toggle auto-play | Unassigned | While a card is visible |
| End / complete session | Unassigned | Uses the current top-card session action behavior |

Hotkeys apply to both demo and signed-in flashcard sessions because they are UI preferences, not server data.

## Settings Form

- The new card sits beside the existing study/audio preference cards and uses the existing neobrutalist card/form styling.
- Each action is a row with a localized action label, a capture button showing its current assignment, and a `Clear` action.
- Selecting the capture button enters recording state; the next keyboard event assigns a single key or modifier combination.
- `Reset defaults` replaces the draft form values with the default mapping.
- The page's existing `Save settings` action persists the hotkey mapping along with other local study preferences.
- Duplicate assignments show an inline error and prevent saving until the conflict is removed.

## Key Representation

- The persisted mapping stores canonical strings such as `Space`, `ArrowRight`, `F`, `1`, `Ctrl+R`, or `Shift+ArrowRight`.
- Accepted modifiers are `Ctrl`, `Alt`, `Shift`, and `Meta`.
- A modifier pressed without a main key is not assignable.
- Pure single keys and modifier combinations are both valid.
- The capture UI formats canonical strings into readable labels by spacing separators, for example `Ctrl + R`.

## Flashcard Behavior

- A document-level keydown listener is active only while the flashcard page is mounted.
- If the key matches an available action, the action behaves exactly like its existing button:
  - `confirmRemember` resolves provisional `know`.
  - `know` and `dontKnow` call the current provisional rating action.
  - `flip`, `previous`, `next`, `toggleAuto`, and `endSession` call their existing UI behavior.
- The centered remember-confirmation overlay displays its configured shortcut when assigned, making the accelerator discoverable at the moment it matters.

## Safety And Accessibility

- Hotkeys never run when focus is in an `input`, `textarea`, `select`, or editable element.
- Hotkeys never run while a session discard/completion modal is open.
- During the centered remember-confirmation tile, only the `confirmRemember` shortcut can resolve the prompt; background navigation/grading shortcuts are ignored.
- Activation calls `preventDefault()` for matched actions, preventing `Space` from scrolling the document.
- The capture button is keyboard reachable, announces recording state, and can be cleared without requiring pointer use.
- The native button activation behavior for `Enter` and `Space` remains available when focus is on a visible button.

## Persistence

- `useStudyStore` owns `hotkeys` beside the existing persisted remember-confirmation preferences.
- Stored preferences remain backward compatible: missing or malformed hotkey entries fall back per action to the default mapping.
- Saving Settings changes future and currently open flashcard pages through Zustand state; no Supabase request or SRS query cost is added.

## Testing

- Store tests cover default mapping, persistence, and legacy preference fallback.
- Settings tests cover key capture, clear/reset, duplicate validation, and blocked save.
- Flashcard tests cover configured `Space` confirmation, normal rating/navigation shortcut execution, input/modal suppression, and the overlay shortcut hint.
