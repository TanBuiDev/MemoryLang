# Study Remember Confirmation Overlay Design

**Date:** 2026-05-23  
**Status:** Approved design, revised for completion-only SRS commits

## Overview

Add an optional study behavior that asks the learner to actively confirm only remembered cards. Before an unrated card advances, MemoryLang displays a centered `Da nho` / `Đã nhớ` confirmation tile for a short, separately configured countdown. Clicking the tile selects provisional `know`; letting the countdown expire selects provisional `dont_know`.

This design reduces decision friction from two visible grading controls to one intentional positive action. SRS outcomes remain provisional until the learner completes the selected session; abandoning a session discards all of its provisional outcomes.

## Goals

- Add a session setup option to enable required remember confirmation before advancing.
- Remember that option, and its confirmation countdown length, for later sessions on the same browser.
- Apply the confirmation gate to every advance path, including next navigation and auto-play.
- Store exactly one provisional SRS outcome per evaluated card per study session.
- Commit SRS outcomes only after the learner has traversed the full selected session and confirms completion.
- Discard every provisional result when a learner exits an incomplete session.
- Preserve the current study experience when the option is disabled.

## Non-Goals

- Changing the SM-2 scheduling algorithm or Supabase RPC shape.
- Recording SRS progress, term views, or study-summary counts for an abandoned incomplete session.
- Replacing the existing `Nhớ` / `Không nhớ` toolbar behavior when the option is disabled.
- Syncing this UI preference to the user's Supabase profile.

## Experience Design

### Setup

The study setup form adds:

- A checkbox labeled `Xac nhan Da nho truoc khi chuyen the` / `Xác nhận Đã nhớ trước khi chuyển thẻ`.
- When selected, a compact confirmation-time selector with options `1`, `2`, `3`, and `5` seconds.
- Default confirmation time: `2` seconds.

The checkbox and selected time are local device preferences. Opening a later session initializes the setup form with the most recently chosen values.

### Confirmation Overlay

When a learner attempts to leave an unrated card and the option is enabled:

- The card remains visible underneath a subdued overlay.
- A square primary-yellow tile appears centered over the card area.
- The tile label is `Da nho` / `Đã nhớ`.
- Supporting text states `Khong bam = Khong nho` / `Không bấm = Không nhớ`.
- A prominent seconds-left indicator or radial countdown shows the decision window.

The overlay is a focused prompt, not a general modal. Existing end-session confirmation remains separate.

### Interaction Outcome

| Interaction                                             | Recorded action         | Result                                                                             |
| ------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------- |
| Click `Da nho` before countdown ends                    | Provisional `know`      | Close overlay and advance, or proceed to completion confirmation on the final card |
| Countdown expires                                       | Provisional `dont_know` | Close overlay and advance, or proceed to completion confirmation on the final card |
| End an incomplete session while viewing an unrated card | None                    | Open discard-warning modal; confirming discards all provisional session results    |

When reduced motion is enabled, the overlay appears and disappears without scale or motion effects; the timer remains visible and functional.

## Navigation And Auto-Play

### Manual Navigation

- Moving forward from an unrated card opens the confirmation overlay instead of advancing immediately.
- Once a card is rated, moving away from it never opens the overlay again in that session.
- Moving backward remains available. Revisiting a rated card is read-only for SRS purposes.

### Existing Toolbar Ratings

When required confirmation is enabled, hide the existing `Nhớ` / `Không nhớ` toolbar buttons for the entire session. The overlay is the only grading interaction, so no toolbar action can bypass its default-`dont_know` rule.

When required confirmation is disabled, the existing toolbar rating interactions and navigation remain available; their results follow the same completion-only commit policy.

### Auto-Play

Auto-play becomes a two-phase cycle when required confirmation is enabled:

1. **Viewing phase:** use the existing per-card auto-play duration, audio playback, and two-sided flip timing.
2. **Confirmation phase:** pause card advancement, display the confirmation overlay, and count down using the separate confirmation duration.

After provisional `know` or `dont_know` is stored, auto-play advances and starts the viewing phase for the next card. When it completes the final card, it stops and opens completion confirmation instead of committing automatically.

## Completion And Early Exit

### Completion Eligibility

A session is eligible to commit results once the learner has displayed every card in the selected session, represented by a persisted `hasReachedLastCard` flag. A learner may navigate back after reaching the final card; completion remains available because the full card set has been traversed.

If required remember confirmation is enabled and the final card is still unrated, requesting completion first presents the `Da nho` / `Đã nhớ` overlay for that final card. Once it resolves, the completion modal appears.

### Manual Completion

- Before the final card is reached, the right navigation control remains `Next card`.
- On the final card, the right navigation control becomes a labeled `Complete` / `Hoàn thành` action.
- Selecting `Complete` opens the positive completion modal.
- If the learner navigates back after reaching the final card, the top card action also becomes `Complete` and opens that same modal.

### Auto-Play Completion

- After auto-play finishes the last card's viewing or required confirmation phase, it stops and opens completion confirmation.
- Confirming completion commits the session; cancelling retains the completed session for review.

### Top Card Action And Modal Tone

| Progress state                                                   | Card action               | Modal behavior                                      |
| ---------------------------------------------------------------- | ------------------------- | --------------------------------------------------- |
| Final card has not been reached                                  | `End` / `Kết thúc`        | Warn that all provisional results will be discarded |
| Final card has been reached, including after navigation backward | `Complete` / `Hoàn thành` | Offer to save results and update SRS                |

The incomplete-session modal presents a gentle sad-state icon or illustration with encouraging language, not blame:

- Title: `Bạn muốn dừng lại ở đây?`
- Message: `Bạn chưa hoàn thành phiên học. Toàn bộ kết quả Nhớ / Không nhớ trong phiên này sẽ không được ghi nhận.`
- Encouragement: `Chỉ còn một chút nữa thôi. Hoàn thành phiên để lưu tiến độ nhé.`
- Confirm action: `Bỏ kết quả và kết thúc`
- Cancel action: `Tiếp tục học`

The completion modal is positive:

- Title: `Hoàn thành phiên học?`
- Message: `Bạn đã đi qua toàn bộ thẻ. Xác nhận để lưu kết quả và cập nhật lịch ôn SRS.`
- Confirm action: `Lưu kết quả`
- Cancel action: `Xem lại thẻ`

## State Model

### Preferences

Add local study preferences:

| Field                         | Type               | Default | Purpose                                   |
| ----------------------------- | ------------------ | ------: | ----------------------------------------- |
| `requireRememberConfirmation` | `boolean`          | `false` | Enables the confirmation overlay workflow |
| `rememberConfirmationSeconds` | `1 \| 2 \| 3 \| 5` |     `2` | Time allowed to click `Da nho`            |

These preferences should persist in browser storage through the study settings state. They do not require backend persistence.

### Session Snapshot

Snapshot the preferences when a session begins so an active session is stable across navigation and reloads:

| Field                         | Purpose                                                           |
| ----------------------------- | ----------------------------------------------------------------- |
| `requireRememberConfirmation` | Locks confirmation behavior for this session                      |
| `rememberConfirmationSeconds` | Locks confirmation timing for this session                        |
| `ratingsByTermId`             | Records provisional `know` or `dont_know` once per evaluated card |
| `reviewActionsByTermId`       | Stores serialized provisional SRS actions until completion        |
| `hasReachedLastCard`          | Preserves completion eligibility across navigation and reloads    |

The stored session format will require a version update or backward-compatible defaults so sessions saved before this feature load with confirmation disabled and no existing ratings.

### Session Card State

Each card is in one of three rating states:

| State        | Meaning                                        | Can prompt again?               |
| ------------ | ---------------------------------------------- | ------------------------------- |
| `unrated`    | No provisional answer selected this session    | Yes, when attempting to advance |
| `remembered` | Provisional `know` stored in the snapshot      | No                              |
| `forgotten`  | Provisional `dont_know` stored in the snapshot | No                              |

This state prevents repeated provisional evaluations if learners move backward and forward through previously evaluated cards. No SRS queue write occurs until completion is confirmed.

## Data Flow

1. The setup page loads persisted confirmation preferences and allows edits.
2. Starting a study session captures those preferences in the persisted session snapshot.
3. An advance request checks the current card's rating state.
4. If confirmation is disabled or the card is already rated, navigation follows the existing allowed path.
5. If confirmation is enabled and the card is unrated, the page opens the overlay and does not advance yet.
6. Clicking the tile or expiry resolves exactly one provisional `ReviewAction` in the session snapshot.
7. Showing the final card marks `hasReachedLastCard`; completing from either valid control opens the completion modal.
8. Confirming completion places the provisional actions, viewed IDs, and final summary into the existing local-first batch queue and flushes it.
9. Confirming early exit clears the active snapshot without enqueuing provisional actions, views, or summary.

## Edge Cases

- **Last card:** resolve a required confirmation outcome before displaying completion confirmation; never commit solely because the card was shown.
- **Back navigation:** a previously rated card never creates another review action.
- **Toolbar actions:** rating buttons are hidden while required confirmation is enabled; audio, flip, and auto-play remain available. Auto-repeat is omitted because each completed pass must stop for explicit completion confirmation.
- **Page reload during confirmation:** restore the card and session options; restarting the confirmation window is acceptable because no rating was written before completion.
- **Manual end while overlay is visible before completion eligibility:** close the overlay and present the discard-warning modal without grading the current card.
- **End action after final card was reached:** treat it as completion even if the learner navigated backward.
- **Auto-play stopped during overlay:** keep the overlay active until its confirmation timer resolves or the session ends; stopping auto-play does not erase the pending decision.
- **Reload:** restore provisional actions and `hasReachedLastCard`; reload must not commit SRS.
- **Demo mode:** retain the visible overlay interaction, but its SRS persistence follows the existing demo-data limitations unless separately expanded.

## Accessibility

- The overlay prompt must be keyboard reachable and operable with `Enter` or `Space`.
- It must provide an accessible label for the tile and timer.
- Focus moves to the `Da nho` tile when the overlay opens.
- A visible focus state must remain consistent with the existing neobrutalist UI.
- Timer information must not rely only on motion or color.

## Testing Strategy

### Setup And Persistence

- The setup form renders the confirmation checkbox and time selector.
- Updating settings persists values and the next setup render restores them.
- Starting a session freezes the current option and duration into the session snapshot.

### Study Interactions

- Advancing an unrated card with confirmation enabled opens the overlay without moving cards.
- Clicking `Da nho` stores provisional `know` exactly once and advances.
- Letting the confirmation timer expire stores provisional `dont_know` exactly once and advances.
- Rating cards before completion does not enqueue SRS actions.
- The last card resolves its provisional outcome before completion confirmation when required confirmation is enabled.
- Returning to a rated card and advancing does not create a second action.
- Ending an incomplete session does not enqueue actions, views, or a summary.
- The top card action opens completion confirmation after the last card is reached, including after navigating backward.
- The right navigation action becomes `Hoàn thành` on the last card.

### Auto-Play

- Auto-play enters confirmation phase after the viewing duration.
- Auto-play waits for the confirmation result before advancing.
- Confirmation timeout stores provisional `dont_know` and resumes auto-play before the last card.
- Auto-play stops and opens completion confirmation when the final card has been traversed.

### Compatibility

- Existing sessions without new fields restore with confirmation disabled.
- Existing disabled-option study tests retain current behavior.

## Alternatives Considered

### Two Explicit Buttons

Show `Nho` and `Khong nho` together at transition time. This makes every outcome explicit but adds decision load. It was replaced by the single positive-action tile requested for a lighter interaction.

### Full-Screen Confirmation View

Replace the flashcard with the confirmation prompt. This strongly focuses attention, but removes the term context just when the learner is deciding. The selected overlay approach retains visual memory of the card.

### Toolbar-Only Confirmation

Put the new action in the bottom toolbar. This avoids covering the card but does not establish a clear decision moment, particularly on small screens or during auto-play.

## Implementation Boundaries

Expected touch points during implementation:

- Study store or a dedicated browser-preference helper for persisted option values.
- Study setup UI and translations.
- Stored study session shape and backward-compatible reader.
- Flashcard study page state, overlay UI, timer integration, and tests.

The feature should reuse the existing SRS action pipeline and local-first sync mechanism. Provisional actions and views live only in the session snapshot while studying; the batch queue is populated and flushed only after explicit completion, so abandoning an incomplete session cannot later sync its SRS results.
