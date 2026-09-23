# Mission Content Checklist

> Checklist kiểm duyệt một playable deck trước khi publish Mission Game.  
> Một deck chỉ Ready khi không còn Blocker/Major chưa xử lý.

## 1. Metadata

- [ ] Deck name đúng.
- [ ] Description đúng mục tiêu.
- [ ] Source language đúng.
- [ ] Native language đúng.
- [ ] Parent/child relation đúng.
- [ ] Xác nhận đây là playable deck, không chỉ catalog parent.
- [ ] Free/Pro tier đúng.
- [ ] Mission enabled đúng.

## 2. Term membership

- [ ] Term count đúng với source.
- [ ] Không thiếu term ngoài chủ đích.
- [ ] Không có duplicate global_term_id.
- [ ] Không có soft-deleted term.
- [ ] Không có placeholder/test term.
- [ ] Không có term sai language pair.

## 3. Term ordering

- [ ] Mọi direct deck_term cần thiết có order_index.
- [ ] Không duplicate order_index.
- [ ] Order đúng source/curriculum.
- [ ] Reorder đã review.
- [ ] Mission split preview đúng thứ tự.
- [ ] Final remainder rule đúng.

## 4. Mission split

- [ ] termsPerMission đúng config.
- [ ] Mission count đúng.
- [ ] Mission numbering đúng.
- [ ] Không term nào mất sau split.
- [ ] Không term nào xuất hiện hai mission ngoài chủ đích.
- [ ] Final mission không quá nhỏ theo policy.
- [ ] Final Boss target đúng nếu enabled.

## 5. Per-term base data

Với mỗi term:

- [ ] source_text không rỗng.
- [ ] normalized_text hợp lệ.
- [ ] item_type đúng.
- [ ] part_of_speech hợp lý nếu có.
- [ ] IPA đúng nếu có.
- [ ] translation đúng.
- [ ] audio đúng.
- [ ] examples đúng.
- [ ] meanings không mâu thuẫn.
- [ ] tags/note không chứa dữ liệu hiển thị sai.

## 6. Translation quality

- [ ] Translation khớp meaning intended.
- [ ] Không quá dài vô lý cho option.
- [ ] Không có English answer bị lộ ngoài chủ đích.
- [ ] Không duplicate với translation khác trong same matching batch gây ambiguity.
- [ ] Multi-POS display dễ hiểu.
- [ ] Phrasal verb dịch whole phrase.
- [ ] Idiom không dịch literal sai nghĩa.

## 7. Audio quality

Cho mọi term dùng Listening:

- [ ] Audio play được.
- [ ] Đọc đúng term.
- [ ] Đúng language/voice.
- [ ] Không bị cắt đầu/cuối.
- [ ] Không đọc ký tự markup.
- [ ] Volume đủ nghe.
- [ ] Phrase pronunciation acceptable.
- [ ] Fallback behavior không crash.

Severity:
- Wrong target audio = Blocker.
- Noisy but understandable = Major/Minor tùy mức.
- Missing optional audio = Warning nếu stage vẫn đủ coverage.

## 8. Example quality

- [ ] Grammar đúng.
- [ ] Example natural.
- [ ] Intended meaning rõ.
- [ ] Không quá dài.
- [ ] Không offensive/inappropriate.
- [ ] Example translation đúng nếu hiển thị.
- [ ] Exact target form có trong example nếu dùng auto-cloze.
- [ ] Không có multiple target occurrence mơ hồ.
- [ ] Target không chỉ là substring của word khác.

## 9. Matching QA

Cho mỗi generated matching set:

- [ ] Mỗi source có đúng một translation intended.
- [ ] Options unique.
- [ ] Không có hai translation cùng nghĩa đủ để cùng đúng.
- [ ] Không có empty option.
- [ ] Không có target repeated.
- [ ] Long text render được mobile.
- [ ] Pairing result đúng ID.

## 10. Listening Choice QA

- [ ] Target audio đúng.
- [ ] Correct translation đúng.
- [ ] Distractors unique.
- [ ] Distractor không synonym cũng đúng.
- [ ] 1 và chỉ 1 correct option.
- [ ] Option order không bias obvious.
- [ ] Replay không thay answer.

## 11. Listening Typing QA

- [ ] Source length phù hợp.
- [ ] Accepted answer đúng source_text.
- [ ] Smart apostrophe normalization đúng.
- [ ] Phrase whitespace normalization đúng.
- [ ] Không chấp nhận typo làm đổi word.
- [ ] Sentence quá dài đã exclude.

## 12. Meaning Recall QA

- [ ] Prompt translation đủ phân biệt.
- [ ] Accepted source answer đúng.
- [ ] Không có hai source terms cùng đúng prompt.
- [ ] Polysemy đã xử lý.
- [ ] Nếu ambiguous → disable/override.

## 13. Context Cloze QA

- [ ] Blank đúng target.
- [ ] Sentence vẫn grammatical sau blank.
- [ ] Context đủ để xác định answer.
- [ ] Accepted answer đúng morphology.
- [ ] Không auto-cloze nếu example dùng inflected form khác target.
- [ ] Multi-word blank rõ.
- [ ] Punctuation giữ đúng.
- [ ] Không nhiều đáp án hợp lý ngoài accepted list.

## 14. Spelling QA

- [ ] Prompt đủ để biết target.
- [ ] source_text là answer chính xác.
- [ ] Word/phrase length phù hợp.
- [ ] Không duplicate vô ích với listening typing quá nhiều.
- [ ] Normalization không quá permissive.

## 15. Hints

- [ ] Hint 1 không reveal answer.
- [ ] First letter đúng.
- [ ] Character/word count đúng.
- [ ] IPA đúng target.
- [ ] Audio hint đúng target.
- [ ] Manual hint không có answer nguyên văn.
- [ ] Hint phù hợp item_type.

## 16. Polysemy review

Cho term có nhiều nghĩa:

- [ ] Chọn intended meaning cho deck.
- [ ] Translation khớp intended meaning.
- [ ] Example khớp intended meaning.
- [ ] Direct recall không ambiguous.
- [ ] Distractors không tạo second correct answer.
- [ ] Manual override nếu cần.

## 17. Phrasal verb review

- [ ] Particle đầy đủ.
- [ ] Translation whole phrase.
- [ ] Example natural.
- [ ] Typed answer yêu cầu đúng particle.
- [ ] Distractor particle variants không mơ hồ.
- [ ] Context preferred.

## 18. Idiom review

- [ ] Meaning idiomatic.
- [ ] Không literal mistranslation.
- [ ] Example contextual.
- [ ] Hint phù hợp.
- [ ] Long phrase challenge không quá nặng.
- [ ] Manual review completed.

## 19. Collocation review

- [ ] Collocation unit đúng.
- [ ] Translation natural.
- [ ] Context thể hiện collocation.
- [ ] Cloze blank policy rõ.
- [ ] Không split arbitrary.

## 20. Sentence item review

- [ ] Xác nhận generator types được phép.
- [ ] Không Matching option quá dài.
- [ ] Listening length phù hợp.
- [ ] Full sentence recall chỉ khi intentionally enabled.
- [ ] Punctuation grading policy rõ.
- [ ] Manual question nếu auto không phù hợp.

## 21. Coverage report

- [ ] Translation coverage review.
- [ ] Audio coverage review.
- [ ] Cloze eligible count review.
- [ ] Recall eligible count review.
- [ ] Under-covered term list review.
- [ ] Blocking diagnostics = 0.
- [ ] Warnings triaged.

## 22. Stage distribution

Mỗi mission:

- [ ] Learn covers all target terms.
- [ ] Matching đủ count hoặc approved fallback.
- [ ] Listening đủ count hoặc approved fallback.
- [ ] Context đủ count hoặc approved fallback.
- [ ] Recall đủ count.
- [ ] Không chỉ luyện một subset nhỏ.
- [ ] Graded exposure cân bằng.

## 23. Boss QA

- [ ] Boss question count đúng.
- [ ] >=50% typed/free recall.
- [ ] Không toàn MCQ.
- [ ] Terms phân bố hợp lý.
- [ ] Correct answer chính xác.
- [ ] HP/progress mapping đúng.
- [ ] User không bị block vô hạn khi sai.
- [ ] Boss pass/fail behavior đúng product rule.

## 24. Manual overrides

Với mỗi override:

- [ ] Có reason/note.
- [ ] Target term đúng.
- [ ] Question type đúng.
- [ ] Prompt tự nhiên.
- [ ] Accepted answers rõ.
- [ ] Distractors valid.
- [ ] Hint không lộ.
- [ ] Schema validation pass.
- [ ] Preview pass.
- [ ] Reviewer approve.

## 25. Determinism/version

- [ ] Generated preview stable cùng fingerprint.
- [ ] Question IDs stable.
- [ ] Generator version recorded.
- [ ] Script version recorded.
- [ ] Override version/hash included.
- [ ] Content-changing edit làm fingerprint đổi.
- [ ] Display-only edit không đổi fingerprint nếu policy nói vậy.

## 26. Mission UI QA

- [ ] Learn text không overflow.
- [ ] Matching usable mobile.
- [ ] Listening controls visible.
- [ ] Typing input không bị keyboard che.
- [ ] Cloze wraps đúng.
- [ ] Translation dài readable.
- [ ] Boss progress readable.
- [ ] Result stats đúng.

## 27. Accessibility content

- [ ] Không dùng màu là signal duy nhất.
- [ ] Audio control có label.
- [ ] Hình nếu có alt text.
- [ ] Prompt không phụ thuộc icon không có text.
- [ ] Correct/wrong feedback có text/icon accessible.
- [ ] Abbreviation giải thích nếu cần.

## 28. i18n

- [ ] UI copy không hardcode language-specific domain text.
- [ ] Content language pair đúng.
- [ ] Vietnamese dấu Unicode chuẩn.
- [ ] Không mixed language ngoài chủ đích.
- [ ] Formatting punctuation phù hợp.

## 29. Severity triage

### Blocker
- [ ] Không còn wrong correct answer.
- [ ] Không còn multiple correct answer.
- [ ] Không còn wrong audio target.
- [ ] Không còn mission crash.
- [ ] Không còn missing required stage.

### Major
- [ ] Không còn misleading translation.
- [ ] Không còn context sai meaning.
- [ ] Không còn unusable mobile option.
- [ ] Không còn broken hint.

### Minor
- [ ] Minor issues documented/accepted hoặc fixed.

## 30. Pilot review

Nếu là pilot deck:

- [ ] 100% generated questions reviewed.
- [ ] 100% Tier 3 terms reviewed.
- [ ] Full audio check.
- [ ] Full mobile flow.
- [ ] At least one clean end-to-end completion.
- [ ] Content bug logging verified.

## 31. Publish configuration

- [ ] Deck missionEnabled = true.
- [ ] accessTier đúng.
- [ ] scriptKey đúng.
- [ ] termsPerMission đúng.
- [ ] readiness = Ready.
- [ ] Feature flag state đúng.
- [ ] Parent deck behavior đúng.

## 32. Post-publish monitoring

Sau publish:

- [ ] Monitor question report.
- [ ] Monitor abnormal wrong rate.
- [ ] Monitor audio failure.
- [ ] Monitor mission abandon stage.
- [ ] Triage content reports.
- [ ] Fix shared source vs override đúng layer.
- [ ] Content change triggers new version/fingerprint theo rule.

## 33. Sign-off

Deck chỉ publish khi có:

- [ ] Content Author sign-off.
- [ ] Content Reviewer sign-off.
- [ ] Functional QA sign-off.
- [ ] Product/Admin publish sign-off.

## 34. Final gate

READY khi:
- Blocker = 0.
- Major = 0.
- Required checklist items pass.
- Diagnostics không blocking.
- Preview/render pass.
- Curriculum fingerprint finalized.
