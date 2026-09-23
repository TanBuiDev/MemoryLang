# Game Implementation Checklist

## Product
- [ ] Chốt flow MVP.
- [ ] Chốt số từ / mission.
- [ ] Chốt unlock rules.
- [ ] Chốt scoring rules.

## Data
- [ ] Xác nhận deck_terms có ordering ổn định.
- [ ] Xác nhận active terms có audio.
- [ ] Xác nhận translation coverage.
- [ ] Xác nhận examples coverage.
- [ ] Quyết định có cần mission_progress table.

## Engine
- [ ] mission types.
- [ ] mission splitter.
- [ ] stage runner.
- [ ] scoring.
- [ ] session restore.
- [ ] result model.

## Question generators
- [ ] matching.
- [ ] listening MCQ.
- [ ] listening typing.
- [ ] context cloze.
- [ ] meaning recall.
- [ ] spelling.

## UI
- [ ] Game Hub entry.
- [ ] Deck picker.
- [ ] Mission map.
- [ ] Learn stage.
- [ ] Matching stage.
- [ ] Listening stage.
- [ ] Context stage.
- [ ] Recall stage.
- [ ] Boss stage.
- [ ] Result page.

## Backend
- [ ] study_sessions.
- [ ] batch review actions.
- [ ] mission completion persistence.
- [ ] RLS.
- [ ] error handling.

## Tests
- [ ] generator unit tests.
- [ ] scoring tests.
- [ ] mission flow tests.
- [ ] audio tests.
- [ ] mobile tests.
- [ ] end-to-end happy path.
