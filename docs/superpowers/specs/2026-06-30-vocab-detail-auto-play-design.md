# Vocab Detail Auto-Play Pronunciation

## Overview
Add an auto-play toggle button on the vocabulary detail page. When enabled, switching to a different vocabulary item automatically plays the audio pronunciation. On mobile, the toggle lives in the overflow menu.

## Design

### State
- `autoPlayEnabled: boolean`, default `false`
- Persisted to `localStorage` key `memorylang_vocab_auto_play`

### Behavior
- On mount: read `autoPlayEnabled` from localStorage
- On toggle: write to localStorage + set state
- When `id` changes AND `autoPlayEnabled === true`: call `speak(item.source_text, { audioUrl, lang, globalTermId })`
- Do NOT auto-play on initial mount (first load), only on subsequent id changes

### Desktop UI
- Toggle button next to existing Volume2 play button in toolbar
- Icon: `Repeat` (lucide-react)
- Active state: primary variant (yellow)
- Inactive state: secondary variant
- Hotkey: `Alt + A`

### Mobile UI
- Toggle inside the overflow menu (`sm:hidden`), at the top
- Show text label + check/indicator for current state
- Text: "Tự động phát" (vi) / "Auto-play" (en)

### Files to modify
- `src/pages/vocabulary/VocabularyDetailPage.tsx` — state, effect, desktop button, mobile menu item
- `src/i18n/translations/vi.ts` — new key
- `src/i18n/translations/en.ts` — new key

### No changes needed
- `src/utils/audio.ts` — reuse existing `speak()`
- `src/stores/` — no new store
