# Study Remember Confirmation Overlay Design

**Date:** 2026-05-23  
**Status:** Approved design, pending implementation plan

## Overview

Add an optional study behavior that asks the learner to actively confirm only remembered cards. Before an unrated card advances, MemoryLang displays a centered `Da nho` / `Đã nhớ` confirmation tile for a short, separately configured countdown. Clicking the tile records `know`; letting the countdown expire records `dont_know`.

This design reduces decision friction from two visible grading controls to one intentional positive action while ensuring unconfirmed cards return to the SRS review queue.

## Goals

- Add a session setup option to enable required remember confirmation before advancing.
- Remember that option, and its confirmation countdown length, for later sessions on the same browser.
- Apply the confirmation gate to every advance path, including next navigation and auto-play.
- Record exactly one SRS outcome per card per study session.
- Preserve the current study experience when the option is disabled.

## Non-Goals

- Changing the SM-2 scheduling algorithm or Supabase RPC shape.
- Treating an early session exit as a forgotten card.
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

| Interaction | Recorded action | Result |
|---|---|---|
| Click `Da nho` before countdown ends | `know` | Close overlay and advance |
| Countdown expires | `dont_know` | Close overlay and advance |
| End the session while viewing an unrated card | None | Keep current end-session confirmation behavior |

When reduced motion is enabled, the overlay appears and disappears without scale or motion effects; the timer remains visible and functional.

## Navigation And Auto-Play

### Manual Navigation

- Moving forward from an unrated card opens the confirmation overlay instead of advancing immediately.
- Once a card is rated, moving away from it never opens the overlay again in that session.
- Moving backward remains available. Revisiting a rated card is read-only for SRS purposes.

### Existing Toolbar Ratings

When required confirmation is enabled, hide the existing `Nhớ` / `Không nhớ` toolbar buttons for the entire session. The overlay is the only grading interaction, so no toolbar action can bypass its default-`dont_know` rule.

When required confirmation is disabled, existing toolbar rating actions and navigation behavior remain unchanged.

### Auto-Play

Auto-play becomes a two-phase cycle when required confirmation is enabled:

1. **Viewing phase:** use the existing per-card auto-play duration, audio playback, and two-sided flip timing.
2. **Confirmation phase:** pause card advancement, display the confirmation overlay, and count down using the separate confirmation duration.

After `know` or `dont_know` is recorded, auto-play advances and starts the viewing phase for the next card. Repeat behavior applies only after the final card has been rated.

## State Model

### Preferences

Add local study preferences:

| Field | Type | Default | Purpose |
|---|---|---:|---|
| `requireRememberConfirmation` | `boolean` | `false` | Enables the confirmation overlay workflow |
| `rememberConfirmationSeconds` | `1 \| 2 \| 3 \| 5` | `2` | Time allowed to click `Da nho` |

These preferences should persist in browser storage through the study settings state. They do not require backend persistence.

### Session Snapshot

Snapshot the preferences when a session begins so an active session is stable across navigation and reloads:

| Field | Purpose |
|---|---|
| `requireRememberConfirmation` | Locks confirmation behavior for this session |
| `rememberConfirmationSeconds` | Locks confirmation timing for this session |
| `ratingsByTermId` | Records `know` or `dont_know` once per encountered card |

The stored session format will require a version update or backward-compatible defaults so sessions saved before this feature load with confirmation disabled and no existing ratings.

### Session Card State

Each card is in one of three rating states:

| State | Meaning | Can prompt again? |
|---|---|---|
| `unrated` | No SRS action recorded this session | Yes, when attempting to advance |
| `remembered` | `know` recorded | No |
| `forgotten` | `dont_know` recorded | No |

This state prevents repeated SRS writes if learners move backward and forward through previously evaluated cards.

## Data Flow

1. The setup page loads persisted confirmation preferences and allows edits.
2. Starting a study session captures those preferences in the persisted session snapshot.
3. An advance request checks the current card's rating state.
4. If confirmation is disabled or the card is already rated, navigation follows the existing allowed path.
5. If confirmation is enabled and the card is unrated, the page opens the overlay and does not advance yet.
6. Clicking the tile or expiry resolves exactly one `ReviewAction`.
7. The existing local-first SRS queue records the result, and session state records the term rating.
8. Only after recording the rating does the page advance or finish the session.

## Edge Cases

- **Last card:** resolve the confirmation outcome before saving the session summary and leaving the session.
- **Back navigation:** a previously rated card never creates another review action.
- **Toolbar actions:** rating buttons are hidden while required confirmation is enabled; audio, flip, auto-play, and repeat controls remain available according to their current rules.
- **Page reload during confirmation:** restore the card and session options; restarting the confirmation window is acceptable because no rating was written before completion.
- **Manual end while overlay is visible:** close the study through the existing end-session confirmation without auto-rating the current card.
- **Auto-play stopped during overlay:** keep the overlay active until its confirmation timer resolves or the session ends; stopping auto-play does not erase the pending decision.
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
- Clicking `Da nho` records `know` exactly once and advances.
- Letting the confirmation timer expire records `dont_know` exactly once and advances.
- The last card records its outcome before session completion.
- Returning to a rated card and advancing does not create a second action.
- Ending an unrated card does not create `dont_know`.

### Auto-Play

- Auto-play enters confirmation phase after the viewing duration.
- Auto-play waits for the confirmation result before advancing.
- Confirmation timeout records `dont_know` and resumes auto-play.
- Repeat starts a new viewing phase only after the final confirmation resolves.

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

The feature should reuse the existing SRS action pipeline and local-first sync mechanism; it should not add per-card server requests.
