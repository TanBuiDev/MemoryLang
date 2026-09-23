# Question Generation Plan

> Mục tiêu: tạo question chất lượng cao từ shared vocabulary data mà không cần AI runtime và không phải viết tay toàn bộ kho từ.

## 1. Principles

1. Deterministic khi cùng seed/version.
2. Không sinh question nếu dữ liệu không đủ an toàn.
3. Accuracy quan trọng hơn coverage 100%.
4. Mỗi question có stable ID và diagnostics.
5. Generator không đọc user progress.
6. Manual override có quyền disable/replace auto question.
7. Không dùng fuzzy AI grading ở MVP.

## 2. Input model

Generator dùng shared DTO:

~~~ts
interface GameTerm {
  globalTermId: string
  sourceText: string
  normalizedText: string
  sourceLanguage: string
  nativeLanguage: string
  itemType: 'word' | 'phrase' | 'idiom' | 'sentence'
  partOfSpeech: string | null
  ipa: string | null
  audioUrl: string | null
  translation: string | null
  meanings: Meaning[]
  examples: ExampleSentence[]
}
~~~

Không cần:
- correct_count;
- wrong_count;
- next_review_at;
- SRS.

## 3. Output model

~~~ts
interface QuestionDefinition {
  id: string
  type: MissionQuestionType
  targetTermId: string
  prompt: SerializablePrompt
  acceptedAnswers: string[]
  options?: QuestionOption[]
  hint?: HintDefinition
  metadata: {
    generatorVersion: number
    sourceExampleIndex?: number
    diagnostics?: string[]
  }
}
~~~

Không chứa JSX/function.

## 4. Generator registry

~~~text
matching
listening_choice
listening_typing
meaning_recall
context_cloze
spelling
~~~

Boss dùng các generator trên, không tạo một logic grading riêng.

## 5. Eligibility matrix

| Type | source_text | translation | audio | exact example |
|---|---:|---:|---:|---:|
| Matching | required | required | no | no |
| Listening choice | required | required | required/preplayable | no |
| Listening typing | required | no | required/preplayable | no |
| Meaning recall | required | required | no | no |
| Context cloze | required | optional | no | required |
| Spelling | required | prompt source required | optional | no |

Audio “required” nghĩa là speak() có đường phát hợp lệ. Readiness nên ưu tiên stored audio_url, không assume runtime TTS luôn thành công.

## 6. Answer normalization

Typed source answer normalizer phải pure.

Pipeline đề xuất:

1. Unicode NFKC.
2. trim.
3. collapse internal whitespace.
4. normalize smart apostrophe → ASCII apostrophe.
5. normalize smart quotes nếu relevant.
6. case-fold với locale phù hợp khi question không case-sensitive.
7. preserve diacritics.
8. preserve meaningful hyphen/apostrophe.
9. không tự bỏ toàn bộ punctuation cho sentence item nếu punctuation là learning target.

Ví dụ:

~~~text
"  Warehouse  " → "warehouse"
"don’t" → "don't"
~~~

Không normalize:
- ship → sheep;
- cafe → café nếu source language cần accent;
- its → it's.

## 7. Accepted answers

MVP:
- canonical source_text.
- manually approved alternatives nếu override có.

Không tự chấp nhận synonym vì “gần nghĩa”.

Nếu target là phrase:
- whitespace normalization allowed;
- word order phải đúng.

Nếu target là sentence:
- grading policy riêng có thể ignore ending punctuation, nhưng chỉ khi script xác định.

## 8. Matching generator

Input:
- N terms có unique non-empty translation.

Output:
- pair target IDs.
- display left/right shuffle independent.

Rules:
- translation normalized không duplicate.
- nếu hai terms có cùng translation → không đặt cùng matching batch.
- max pair mặc định 5.
- right options giữ full translation, không truncate grading data.

Matching grading dùng term ID, không compare visible string.

## 9. Listening Choice generator

Prompt:
- audio target.

Options:
- target translation;
- N-1 distractor translations.

Eligibility:
- target playable audio;
- target translation;
- enough unique distractors.

Do not:
- dùng duplicate translation;
- dùng empty;
- dùng translation target như substring exact duplicate gây ambiguous nếu có thể tránh.

## 10. Listening Typing generator

Prompt:
- audio only + optional “Nghe và nhập từ”.

Answer:
- source_text.

Best for:
- word;
- short phrase.

Long sentence:
- exclude by default hoặc dùng dedicated dictation mode phase sau.

Max source length/word count cần config.

## 11. Meaning Recall generator

Prompt:
- target translation.

Answer:
- source_text.

Problem: nhiều source term có thể cùng Vietnamese translation.

Eligibility:
- translation unique trong mission/batch hoặc có contextual disambiguator.

Nếu “đặt” map nhiều English terms:
- skip direct recall;
- hoặc manual prompt bổ sung POS/context.

Không grade một câu ambiguous bằng một answer duy nhất.

## 12. Context Cloze generator

### 12.1. Source selection

Ưu tiên:
1. meaning-specific example nếu data structure giữ relation.
2. global examples.
3. manual override.

### 12.2. Exact-match requirement

Auto-cloze chỉ khi example chứa target source_text dưới dạng safe boundary match.

Case-insensitive có thể được phép.

Không tự stem/lemmatize ở MVP.

Ví dụ:
- target “renovate”
- example chứa “renovate” → eligible.
- example chỉ chứa “renovated” → auto generator skip, trừ manual override.

Lý do: không tự biến morphology thành đáp án sai.

### 12.3. Replacement

- một occurrence rõ ràng.
- thay bằng blank.
- nếu multiple target occurrences, ưu tiên skip hoặc explicit indexed occurrence.
- phrase replacement phải giữ punctuation xung quanh.

### 12.4. Accepted answer

source_text exact normalized.

Manual override có thể nhận inflected form nếu prompt yêu cầu.

## 13. Spelling generator

Prompt source priority:
1. audio;
2. translation;
3. image/manual hint.

Answer:
- source_text.

Không duplicate với ListeningTyping nếu cùng mission đã quá nhiều audio typing. Planner cân bằng modality.

## 14. Distractor generation

## 14.1. Candidate pool

Default:
- terms cùng mission.

Fallback:
- cùng playable deck, nếu loader có safe pool.

Không lấy random toàn global vocabulary nếu làm distractor mất level/context.

## 14.2. Hard filters

Loại:
- target term;
- empty translation;
- duplicate normalized option;
- same global_term_id;
- manually marked ambiguous/excluded;
- known synonym nếu relationship data cho thấy option có thể cũng đúng với prompt meaning.

## 14.3. Soft ranking

Có thể ưu tiên:
- cùng part_of_speech;
- độ dài tương đối gần;
- cùng language pair.

Không ưu tiên “gần nghĩa” nếu làm multiple correct.

## 14.4. Deterministic selection

Seeded shuffle/ranking.

Test same seed → same candidate IDs.

## 15. Multi-meaning terms

Không collapse mọi meaning thành một prompt ambiguous.

Rules:
- direct translation question chỉ dùng translation canonical đã publish.
- context question lấy meaning phù hợp example.
- nếu meanings có conflicting translations, content readiness warning.
- manual override recommended cho polysemy cao.

Ví dụ “commit” cần curated context hơn direct one-word translation.

## 16. Phrasal verbs

Treat source_text full phrase.

- typed answer cần đủ particles.
- cloze ưu tiên exact phrase example.
- distractors tránh variant gần giống nếu prompt không đủ context.

Manual content recommended nếu particle thay đổi meaning mạnh.

## 17. Idioms

Direct translation có thể không natural.

Policy:
- matching chỉ nếu curated translation rõ.
- context ưu tiên.
- manual explanation/hint.
- no literal word-by-word generated prompt.

## 18. Sentence items

Default:
- Learn.
- Listening/dictation nếu length threshold.
- Không Matching dài.
- Context cloze chỉ nếu có target subspan defined manual.
- Recall full sentence chỉ trong dedicated mode.

MVP mission planner có thể exclude sentence item khỏi certain generators.

## 19. Translation ambiguity

Normalized translation key:
- lowercase;
- trim;
- collapse whitespace;
- optional strip display-only POS prefix nếu current deriveTranslation adds POS labels phải được kiểm soát.

Nếu two options normalize same:
- same MCQ/matching batch forbidden.

## 20. Question planner coverage

Với 10 terms, default goal:

- every term: Learn.
- >= 5 terms Matching.
- >= 5 Listening.
- >= 5 Context eligible.
- >= 5 Meaning/Spelling recall.
- Boss: 5 mixed, >= 3 typed/free recall.

Planner rotates target IDs để tránh chỉ luyện 5 term.

Across graded stages:
- mỗi term cố gắng >= 2 graded exposures.
- nếu data thiếu, diagnostics ghi under-covered term.

## 21. First-try vs retry

Generator không quyết score.

Question defines:
- prompt;
- accepted answer;
- hint.

Scoring engine records:
- attempts;
- hint use;
- final correctness.

## 22. Hints

Auto hints safe:

### Word
- first letter;
- character count;
- IPA;
- replay audio.

### Phrase
- first letter each word;
- word count.

Không reveal gần hết answer ở hint 1.

Hint content cũng deterministic.

## 23. Stable question ID

Canonical components:

~~~text
generatorVersion
curriculumFingerprint
missionIndex
questionType
targetTermId
sourceExampleIndex / variantKey
~~~

Hash thành ID ngắn/stable.

Option display order không nhất thiết nằm trong ID.

## 24. Generator versioning

Có constant:

~~~text
GENERATOR_VERSION = N
~~~

Bump khi logic thay đổi khiến question definitions khác.

Fingerprint includes generator version.

Bug fix display-only không cần bump nếu content identity không đổi.

## 25. Diagnostics

Generator trả diagnostics code, ví dụ:

- MISSING_TRANSLATION
- MISSING_AUDIO
- NO_EXACT_EXAMPLE_MATCH
- DUPLICATE_TRANSLATION
- INSUFFICIENT_DISTRACTORS
- SOURCE_TOO_LONG
- AMBIGUOUS_MEANING

Admin readiness UI map code → text.

## 26. Blocking vs warning

### Blocking
Required stage không đạt minimum.

### Warning
Một số term thiếu một modality nhưng mission vẫn đủ coverage.

Không biến tất cả warning thành publish blocker.

## 27. Manual overrides

Override priorities:

1. disable auto question;
2. replace prompt;
3. add accepted answer;
4. specify example;
5. specify distractors;
6. custom hint.

Override phải validate cùng schema với generated question.

Không cho raw JS/code.

## 28. No runtime AI

MVP không gọi LLM để:
- sinh distractor;
- judge typed answer;
- viết example;
- quyết synonym.

Nếu tương lai AI hỗ trợ content team:
- chạy trong admin workflow;
- human review;
- publish result như shared content;
- không phụ thuộc AI uptime khi learner chơi.

## 29. Unit test matrix

### Normalization
- leading/trailing spaces.
- multiple spaces.
- upper/lower.
- smart apostrophe.
- hyphen.
- accents.
- phrase.

### Matching
- duplicate translations.
- fewer than required terms.
- shuffle deterministic.

### Listening
- no audio.
- no translation.
- source phrase.
- replay does not affect grading.

### Cloze
- exact match.
- different case.
- target as substring of another word.
- multiple occurrences.
- inflected-only example.
- punctuation adjacency.
- multi-word target.

### Distractors
- no target.
- unique.
- same seed stable.
- insufficient pool.

### Multi-meaning
- ambiguous translation flagged.

## 30. Content QA criteria

Auto question pass khi:

- prompt grammatical/complete enough.
- exactly one intended answer.
- options unique.
- target meaning matches prompt.
- answer normalization not overly permissive.
- no deleted term.
- no empty display value.

## 31. Readiness metrics per deck

Report:

- total terms.
- matching eligible.
- listening eligible.
- cloze eligible.
- recall eligible.
- ambiguous count.
- manual override count.
- blocking diagnostics.

Content team review report trước publish.

## 32. Acceptance criteria

Question generation hoàn thành khi:

- 100% generator pure/tested.
- same seed reproducible.
- no duplicate correct options.
- no AI runtime dependency.
- ambiguous question fails/skip thay vì guess.
- manual overrides supported by domain design.
- diagnostics visible cho readiness.
- generator version participates in fingerprint.
- pilot deck manual QA không có blocking ambiguity.
