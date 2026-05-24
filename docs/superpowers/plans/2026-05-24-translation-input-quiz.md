# Translation Input Quiz Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the visible true/false quiz experience with a translation-entry quiz that supports tolerant answer checking, optional answer reveal, recoverable vocabulary-loading errors, and minimal score results.

**Architecture:** Keep legacy true/false domain code available for compatibility, while the visible quiz route always starts a new `translation_input` session. Put question generation and answer matching in a pure feature module, persist translation-session progress separately with a versioned snapshot, and keep data fetching in the existing page/service boundary using React Query for retryable source states.

**Tech Stack:** React 19, TypeScript 6, Zustand, TanStack React Query, React Router, sessionStorage, Vitest, Testing Library, Tailwind CSS v4.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/types/quiz.types.ts` | Add `translation_input` and the text-question contract while preserving legacy types. |
| `src/features/quiz/translationInputQuiz.ts` | Pure usable-item filter, randomized question generator, text normalization, and tolerant answer matcher. |
| `src/features/quiz/translationInputQuiz.test.ts` | Pin down translation eligibility and Vietnamese-aware answer acceptance boundaries. |
| `src/features/demo/demoData.ts` | Supply a small deck-to-term mapping so selected quiz decks also work in demo mode. |
| `src/features/quiz/sessionPersistence.ts` | Store only translation-input session snapshots for new UI sessions and reject legacy-shaped payloads. |
| `src/features/quiz/sessionPersistence.test.ts` | Round-trip and invalid/legacy snapshot coverage. |
| `src/stores/useQuizStore.ts` | Make `translation_input` the setup/session default while leaving the setter compatible. |
| `src/pages/quiz/QuizSetupPage.tsx` | Select source/count, preflight available translated items, expose load/empty/error states, and start a fresh session. |
| `src/pages/quiz/QuizSetupPage.test.tsx` | Cover removed type selector, ready/empty/error states, retry, and fresh-session setup. |
| `src/pages/quiz/QuizSessionPage.tsx` | Fetch the selected source, restore/generate a snapshot, submit typed answers, reveal answers, retry query failures, and finish the quiz. |
| `src/pages/quiz/QuizSessionPage.test.tsx` | Cover answer flow, reveal scoring, metadata visibility, persistence after reload, empty states, and retry. |
| `src/pages/quiz/QuizResultPage.tsx` | Render score-only result. |
| `src/pages/quiz/QuizResultPage.test.tsx` | Protect the score-only result contract. |
| `src/i18n/index.ts` | Supply bilingual input-quiz, loading/error, reveal, and revised marketing labels. |
| `src/pages/public/LandingPage.tsx` | Replace the hardcoded preview reference to the old visible quiz mode. |
| `src/pages/public/LandingPage.test.tsx` | Confirm public copy no longer advertises true/false as the visible check. |
| `CLAUDE.md`, `README.md` | Record the implemented quiz behavior once code is working. |

The existing `src/features/quiz/trueFalseQuiz.ts` and its tests remain untouched; adding `translation_input` is additive, and the task does not delete stored history or backend schema.

### Task 1: Add The Translation Quiz Domain

**Files:**
- Create: `src/features/quiz/translationInputQuiz.ts`
- Create: `src/features/quiz/translationInputQuiz.test.ts`
- Modify: `src/features/demo/demoData.ts`
- Modify: `src/types/quiz.types.ts`
- Modify: `src/stores/useQuizStore.ts`

- [ ] **Step 1: Write failing domain tests**

Create `src/features/quiz/translationInputQuiz.test.ts` with tests that specify item eligibility, generated question fields, and the approved fuzzy-matching boundary:

```ts
import { describe, expect, it } from 'vitest'
import { demoVocabulary } from '@/features/demo/demoData'
import { generateTranslationQuestions, isTranslationAnswerCorrect } from '@/features/quiz/translationInputQuiz'

describe('generateTranslationQuestions', () => {
  it('generates translation questions only from vocabulary with saved translations', () => {
    const withoutTranslation = { ...demoVocabulary[0]!, id: 'missing', translation: '   ' }
    const questions = generateTranslationQuestions([...demoVocabulary, withoutTranslation], 'all', () => 0)

    expect(questions).toHaveLength(demoVocabulary.length)
    expect(questions.some((question) => question.userTermId === 'missing')).toBe(false)
    expect(questions[0]).toEqual(expect.objectContaining({
      sourceText: expect.any(String),
      expectedTranslation: expect.any(String),
    }))
  })

  it('respects the requested random question limit', () => {
    expect(generateTranslationQuestions(demoVocabulary, 2, () => 0)).toHaveLength(2)
  })
})

describe('isTranslationAnswerCorrect', () => {
  it.each([
    ['Qua chuoi', 'qua chuoi', true],
    ['  qua   chuoi! ', 'qua chuoi', true],
    ['phá vở sự ngại ngùng', 'phá vỡ sự ngại ngùng', true],
    ['táo', 'táo', true],
    ['tao', 'táo', false],
    ['mèo', 'mẹo', false],
    ['', 'quả táo', false],
  ])('checks "%s" against "%s"', (answer, expected, correct) => {
    expect(isTranslationAnswerCorrect(answer, expected)).toBe(correct)
  })
})
```

- [ ] **Step 2: Run the tests to prove the domain does not yet exist**

Run:

```bash
pnpm exec vitest run src/features/quiz/translationInputQuiz.test.ts
```

Expected: FAIL because `@/features/quiz/translationInputQuiz` does not exist.

- [ ] **Step 3: Add a scoped demo-deck vocabulary source**

Modify `src/features/demo/demoData.ts` after the vocabulary array so the quiz can honor its deck selector without changing service boundaries:

```ts
const demoDeckTermIds: Record<string, string[]> = {
  'daily-english': ['apple', 'break-the-ice', 'looking-forward'],
  interview: ['break-the-ice', 'looking-forward'],
}

export function getDemoVocabularyForDeck(deckId: string | null) {
  if (!deckId) return demoVocabulary
  const termIds = new Set(demoDeckTermIds[deckId] ?? [])
  return demoVocabulary.filter((item) => termIds.has(item.id))
}
```

Align `demoDecks[0].term_count` to `3`, matching its mapped entries; leave `interview.term_count` at `2`.

- [ ] **Step 4: Add the new domain types and default mode**

Modify `src/types/quiz.types.ts` so the public type additions are explicit and do not replace the legacy question:

```ts
export type QuizType = 'true_false' | 'translation_input' | 'matching' | 'fill_blank' | 'mixed'

export interface TranslationInputQuestion {
  id: string
  userTermId: string
  sourceText: string
  ipa: string | null
  partOfSpeech: string | null
  expectedTranslation: string
}
```

Modify `src/stores/useQuizStore.ts` so newly opened quiz UI sessions use the new type:

```ts
export const useQuizStore = create<QuizState>((set) => ({
  quizType: 'translation_input',
  questionCount: 10,
  selectedDeckId: null,
  setQuizType: (quizType) => set({ quizType }),
  setQuestionCount: (questionCount) => set({ questionCount }),
  setSelectedDeckId: (selectedDeckId) => set({ selectedDeckId }),
}))
```

- [ ] **Step 5: Implement the pure generator and matcher**

Create `src/features/quiz/translationInputQuiz.ts`:

```ts
import type { TranslationInputQuestion } from '@/types/quiz.types'
import type { SessionLimit } from '@/types/study.types'
import type { VocabularyItem } from '@/types/vocabulary.types'
import { shuffle } from '@/utils/shuffle'

const MIN_FUZZY_LENGTH = 8

export function hasTranslation(item: VocabularyItem) {
  return Boolean(item.translation?.trim())
}

export function generateTranslationQuestions(
  items: VocabularyItem[],
  questionCount: SessionLimit,
  random: () => number = Math.random,
): TranslationInputQuestion[] {
  const usable = items.filter(hasTranslation)
  const selected = questionCount === 'all'
    ? shuffle(usable, random)
    : shuffle(usable, random).slice(0, questionCount)

  return selected.map((item, index) => ({
    id: `${item.id}-${index}`,
    userTermId: item.id,
    sourceText: item.source_text,
    ipa: item.ipa,
    partOfSpeech: item.part_of_speech,
    expectedTranslation: item.translation!.trim(),
  }))
}

export function normalizeTranslationAnswer(value: string) {
  return value
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^[.,!?;:]+|[.,!?;:]+$/g, '')
    .trim()
}

function levenshteinDistance(left: string, right: string) {
  const rows = Array.from({ length: left.length + 1 }, (_, row) => [row])
  for (let column = 1; column <= right.length; column += 1) rows[0]![column] = column
  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1
      rows[row]![column] = Math.min(
        rows[row - 1]![column]! + 1,
        rows[row]![column - 1]! + 1,
        rows[row - 1]![column - 1]! + cost,
      )
    }
  }
  return rows[left.length]![right.length]!
}

export function isTranslationAnswerCorrect(answer: string, expectedTranslation: string) {
  const normalizedAnswer = normalizeTranslationAnswer(answer)
  const normalizedExpected = normalizeTranslationAnswer(expectedTranslation)
  if (!normalizedAnswer || !normalizedExpected) return false
  if (normalizedAnswer === normalizedExpected) return true
  return normalizedExpected.length >= MIN_FUZZY_LENGTH
    && levenshteinDistance(normalizedAnswer, normalizedExpected) <= 1
}
```

- [ ] **Step 6: Run domain tests and commit the domain unit**

Run:

```bash
pnpm exec vitest run src/features/quiz/translationInputQuiz.test.ts src/features/quiz/trueFalseQuiz.test.ts
```

Expected: PASS; legacy true/false generator still compiles and passes.

Commit:

```bash
git add src/types/quiz.types.ts src/stores/useQuizStore.ts src/features/demo/demoData.ts src/features/quiz/translationInputQuiz.ts src/features/quiz/translationInputQuiz.test.ts
git commit -m "feat: add translation input quiz domain"
```

### Task 2: Version Translation Session Persistence

**Files:**
- Modify: `src/features/quiz/sessionPersistence.ts`
- Create: `src/features/quiz/sessionPersistence.test.ts`

- [ ] **Step 1: Write failing persistence tests**

Create `src/features/quiz/sessionPersistence.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { readStoredQuizSession, writeStoredQuizSession } from '@/features/quiz/sessionPersistence'

const question = {
  id: 'apple-0',
  userTermId: 'apple',
  sourceText: 'apple',
  ipa: '/apple/',
  partOfSpeech: 'noun',
  expectedTranslation: 'quả táo',
}

describe('translation quiz session persistence', () => {
  beforeEach(() => window.sessionStorage.clear())

  it('round trips revealed state so reload cannot restore points', () => {
    writeStoredQuizSession('quiz-key', {
      questions: [question],
      index: 0,
      score: 0,
      revealedQuestionIds: ['apple-0'],
      completedQuestionIds: [],
    })

    expect(readStoredQuizSession('quiz-key')).toEqual({
      questions: [question],
      index: 0,
      score: 0,
      revealedQuestionIds: ['apple-0'],
      completedQuestionIds: [],
    })
  })

  it('rejects a legacy true-false question payload as a translation session', () => {
    window.sessionStorage.setItem('quiz-key', JSON.stringify({
      version: 1,
      questions: [{ id: 'apple-0', prompt: 'apple = A fruit', expectedAnswer: true }],
      index: 0,
      score: 0,
    }))

    expect(readStoredQuizSession('quiz-key')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to prove revealed-state persistence is missing**

Run:

```bash
pnpm exec vitest run src/features/quiz/sessionPersistence.test.ts
```

Expected: FAIL because `StoredQuizSession` currently only accepts `TrueFalseQuestion[]`, `index`, and `score`.

- [ ] **Step 3: Implement a versioned translation-session payload**

Modify `src/features/quiz/sessionPersistence.ts`:

```ts
import type { QuizType, TranslationInputQuestion } from '@/types/quiz.types'
import type { SessionLimit } from '@/types/study.types'

const STORAGE_VERSION = 2

export interface StoredQuizSession {
  questions: TranslationInputQuestion[]
  index: number
  score: number
  revealedQuestionIds: string[]
  completedQuestionIds: string[]
}

function isTranslationQuestion(question: unknown): question is TranslationInputQuestion {
  if (!question || typeof question !== 'object') return false
  const value = question as Partial<TranslationInputQuestion>
  return typeof value.id === 'string'
    && typeof value.userTermId === 'string'
    && typeof value.sourceText === 'string'
    && typeof value.expectedTranslation === 'string'
}
```

In `readStoredQuizSession()`, require `payload.version === STORAGE_VERSION`, verify `payload.questions.every(isTranslationQuestion)`, and default only array fields safely:

```ts
return {
  questions: payload.questions,
  index: Math.max(0, Math.min(Math.trunc(payload.index), payload.questions.length - 1)),
  score: Math.max(0, Math.trunc(payload.score)),
  revealedQuestionIds: Array.isArray(payload.revealedQuestionIds)
    ? payload.revealedQuestionIds.filter((id): id is string => typeof id === 'string')
    : [],
  completedQuestionIds: Array.isArray(payload.completedQuestionIds)
    ? payload.completedQuestionIds.filter((id): id is string => typeof id === 'string')
    : [],
}
```

In `writeStoredQuizSession()`, write both ID arrays with the version-2 payload. Keep `buildQuizSessionStorageKey()` and the active-key functions intact; the new store default ensures fresh keys include `translation_input`.

- [ ] **Step 4: Run persistence tests and commit**

Run:

```bash
pnpm exec vitest run src/features/quiz/sessionPersistence.test.ts
```

Expected: PASS.

Commit:

```bash
git add src/features/quiz/sessionPersistence.ts src/features/quiz/sessionPersistence.test.ts
git commit -m "feat: persist translation quiz progress"
```

### Task 3: Build A Preflighted Quiz Setup Screen

**Files:**
- Modify: `src/pages/quiz/QuizSetupPage.tsx`
- Modify: `src/pages/quiz/QuizSetupPage.test.tsx`
- Modify: `src/i18n/index.ts`

- [ ] **Step 1: Replace setup tests with visible-mode and source-state coverage**

Extend the setup test mocks to provide remote query data:

```ts
import { demoVocabulary } from '@/features/demo/demoData'

vi.mock('@/services/supabase/client', () => ({ isSupabaseConfigured: true, supabase: {} }))
vi.mock('@/services/supabase/deck.service', () => ({
  deckService: { list: vi.fn(), listTerms: vi.fn() },
}))
vi.mock('@/services/supabase/vocabulary.service', () => ({
  vocabularyService: { list: vi.fn() },
}))
```

Set `quizType: 'translation_input'` in `beforeEach`, then add tests:

```ts
const translatedItem = {
  ...demoVocabulary[0]!,
  id: 'remote-apple',
  translation: 'quả táo',
}

it('shows translation setup without a quiz type selector', () => {
  useAuthStore.setState({ user: null, profile: null })
  renderPage()
  expect(screen.queryByText('Loại kiểm tra')).not.toBeInTheDocument()
  expect(screen.getByText('3 từ sẵn sàng kiểm tra')).toBeInTheDocument()
})

it('disables start and reports missing translations for a remote source', async () => {
  useAuthStore.setState({ user: { id: 'user-1' } as never, profile: null })
  vi.mocked(vocabularyService.list).mockResolvedValue([{ ...translatedItem, translation: null }])
  vi.mocked(deckService.list).mockResolvedValue([])
  renderPage()
  expect(await screen.findByText('Chưa có từ vựng có bản dịch để kiểm tra')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Bắt đầu kiểm tra' })).toBeDisabled()
})

it('retries after vocabulary cannot be fetched', async () => {
  const user = userEvent.setup()
  useAuthStore.setState({ user: { id: 'user-1' } as never, profile: null })
  vi.mocked(vocabularyService.list)
    .mockRejectedValueOnce(new Error('network'))
    .mockResolvedValueOnce([translatedItem])
  vi.mocked(deckService.list).mockResolvedValue([])
  renderPage()
  expect(await screen.findByText('Không lấy được từ vựng. Vui lòng thử lại.')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Thử lại' }))
  expect(await screen.findByText('1 từ sẵn sàng kiểm tra')).toBeInTheDocument()
})
```

Keep a fresh-session test, but build its key with `quizType: 'translation_input'` and account for only two comboboxes after the type selector is removed.

- [ ] **Step 2: Run setup tests to verify failure**

Run:

```bash
pnpm exec vitest run src/pages/quiz/QuizSetupPage.test.tsx
```

Expected: FAIL because setup still renders the true/false selector and does not fetch/validate vocabulary availability.

- [ ] **Step 3: Add setup copy and actionable states**

Add bilingual keys in `src/i18n/index.ts`:

```ts
'quiz.setupDescription': 'Type the translation you remember for each word or phrase.',
'quiz.optionsDescription': 'Choose a vocabulary source and how many prompts to practise.',
'quiz.availableCount': '{count} words ready for testing',
'quiz.noVocabulary': 'No vocabulary available for a quiz yet.',
'quiz.noTranslatedVocabulary': 'No vocabulary with translations is available for a quiz yet.',
'quiz.loadError': 'Could not load vocabulary. Please try again.',
'quiz.retryLoad': 'Try again',
```

and:

```ts
'quiz.setupDescription': 'Nhập bản dịch bạn nhớ cho từng từ hoặc cụm từ.',
'quiz.optionsDescription': 'Chọn nguồn từ vựng và số câu muốn kiểm tra.',
'quiz.availableCount': '{count} từ sẵn sàng kiểm tra',
'quiz.noVocabulary': 'Chưa có từ vựng để kiểm tra.',
'quiz.noTranslatedVocabulary': 'Chưa có từ vựng có bản dịch để kiểm tra.',
'quiz.loadError': 'Không lấy được từ vựng. Vui lòng thử lại.',
'quiz.retryLoad': 'Thử lại',
```

- [ ] **Step 4: Implement source preflight in setup**

Modify `QuizSetupPage.tsx` to import `getDemoVocabularyForDeck`, `vocabularyService`, `filterActiveVocabulary`, and `hasTranslation`. Add a source query matching the selected deck:

```ts
const sourceQuery = useQuery({
  queryKey: selectedDeckId ? ['deck-terms', selectedDeckId] : ['vocabulary', user?.id],
  queryFn: () => selectedDeckId ? deckService.listTerms(selectedDeckId) : vocabularyService.list(user!.id),
  enabled: shouldUseRemoteData,
})
const sourceVocabulary = filterActiveVocabulary(
  shouldUseRemoteData ? sourceQuery.data ?? [] : getDemoVocabularyForDeck(selectedDeckId),
)
const translatedCount = sourceVocabulary.filter(hasTranslation).length
const sourceLoading = shouldUseRemoteData && sourceQuery.isLoading
const sourceError = shouldUseRemoteData && sourceQuery.isError
const sourceEmpty = !sourceLoading && !sourceError && sourceVocabulary.length === 0
const translationsEmpty = !sourceLoading && !sourceError && sourceVocabulary.length > 0 && translatedCount === 0
```

Remove the `quiz.type` `<Select>`. Render the state message below source/count controls:

```tsx
{sourceLoading ? <p className="font-black">{t('vocabulary.loading')}</p> : null}
{sourceError ? (
  <Card className="font-black text-danger">
    <p>{t('quiz.loadError')}</p>
    <Button className="mt-3" variant="secondary" onClick={() => void sourceQuery.refetch()}>
      {t('quiz.retryLoad')}
    </Button>
  </Card>
) : null}
{sourceEmpty ? <p className="font-black text-muted-foreground">{t('quiz.noVocabulary')}</p> : null}
{translationsEmpty ? <p className="font-black text-muted-foreground">{t('quiz.noTranslatedVocabulary')}</p> : null}
{translatedCount > 0 ? <p className="font-black">{t('quiz.availableCount', { count: translatedCount })}</p> : null}
<Button disabled={sourceLoading || sourceError || translatedCount === 0} onClick={startQuiz}>
  {t('quiz.start')}
</Button>
```

Add a demo assertion to prove selecting a displayed deck affects readiness:

```ts
it('preflights the selected deck in demo mode', async () => {
  const user = userEvent.setup()
  useAuthStore.setState({ user: null, profile: null })
  renderPage()
  await user.selectOptions(screen.getAllByRole('combobox')[0]!, 'interview')
  expect(screen.getByText('2 từ sẵn sàng kiểm tra')).toBeInTheDocument()
})
```

- [ ] **Step 5: Run setup tests and commit**

Run:

```bash
pnpm exec vitest run src/pages/quiz/QuizSetupPage.test.tsx
```

Expected: PASS.

Commit:

```bash
git add src/pages/quiz/QuizSetupPage.tsx src/pages/quiz/QuizSetupPage.test.tsx src/i18n/index.ts
git commit -m "feat: validate translation quiz source before starting"
```

### Task 4: Implement Translation Entry Session And Recovery

**Files:**
- Modify: `src/pages/quiz/QuizSessionPage.tsx`
- Modify: `src/pages/quiz/QuizSessionPage.test.tsx`
- Modify: `src/i18n/index.ts`

- [ ] **Step 1: Write failing session interaction tests**

Update test fixtures to set meaningful `translation`, `ipa`, and `part_of_speech` fields:

```ts
function makeItem(
  id: string,
  sourceText: string,
  translation: string | null,
  ipa: string | null = null,
  partOfSpeech: string | null = null,
): VocabularyItem {
  return {
    ...baseItem,
    id,
    source_text: sourceText,
    normalized_text: sourceText,
    translation,
    ipa,
    part_of_speech: partOfSpeech,
  }
}
```

Default the store type to `translation_input`. In `beforeEach`, stabilize generated order and set a successful default service response; add `afterEach(() => vi.restoreAllMocks())` to release the `Math.random` spy:

```ts
vi.spyOn(Math, 'random').mockReturnValue(0.999)
vi.mocked(deckService.listTerms).mockResolvedValue([
  makeItem('apple', 'apple', 'quả táo'),
  makeItem('banana', 'banana', 'quả chuối'),
])
```

Replace true/false actions with typed-answer scenarios:

```ts
it('shows only prompt metadata and advances after a correct typed translation', async () => {
  const user = userEvent.setup()
  await renderPage([makeItem('apple', 'apple', 'quả táo', '/apple/', 'noun')])

  expect(await screen.findByText('apple')).toBeInTheDocument()
  expect(screen.getByText('/apple/')).toBeInTheDocument()
  expect(screen.queryByText('quả táo')).not.toBeInTheDocument()

  await user.type(screen.getByLabelText('Nhập bản dịch'), 'Quả táo!')
  await user.click(screen.getByRole('button', { name: 'Kiểm tra' }))

  expect(await screen.findByText('?score=1&total=1')).toBeInTheDocument()
})

it('allows retry after a wrong answer and does not remove points until reveal is used', async () => {
  const user = userEvent.setup()
  await renderPage([makeItem('apple', 'apple', 'quả táo')])

  await user.type(await screen.findByLabelText('Nhập bản dịch'), 'sai')
  await user.click(screen.getByRole('button', { name: 'Kiểm tra' }))
  expect(screen.getByText('Chưa đúng. Hãy thử lại hoặc xem đáp án.')).toBeInTheDocument()

  await user.clear(screen.getByLabelText('Nhập bản dịch'))
  await user.type(screen.getByLabelText('Nhập bản dịch'), 'quả táo')
  await user.keyboard('{Enter}')
  expect(await screen.findByText('?score=1&total=1')).toBeInTheDocument()
})

it('requires the correct answer after revealing but gives no point', async () => {
  const user = userEvent.setup()
  await renderPage([makeItem('apple', 'apple', 'quả táo')])

  await user.type(await screen.findByLabelText('Nhập bản dịch'), 'sai')
  await user.click(screen.getByRole('button', { name: 'Kiểm tra' }))
  await user.click(screen.getByRole('button', { name: 'Xem đáp án' }))
  expect(screen.getByText('quả táo')).toBeInTheDocument()

  await user.clear(screen.getByLabelText('Nhập bản dịch'))
  await user.type(screen.getByLabelText('Nhập bản dịch'), 'quả táo')
  await user.keyboard('{Enter}')
  expect(await screen.findByText('?score=0&total=1')).toBeInTheDocument()
})
```

Change the test helper so individual cases control service results instead of always overwriting the mock:

```ts
async function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app/quiz/session/deck-quiz']}>
        <Routes>
          <Route path="/app/quiz/session/:sessionId" element={<QuizSessionPage />} />
          <Route path="/app/quiz/result/:resultId" element={<ResultProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
```

Add restore and failure cases:

```ts
it('restores the reveal penalty after unmounting and returning to the session', async () => {
  const user = userEvent.setup()
  vi.mocked(deckService.listTerms).mockResolvedValue([
    makeItem('apple', 'apple', 'quả táo'),
    makeItem('banana', 'banana', 'quả chuối'),
  ])
  const firstRender = await renderPage()

  await user.type(await screen.findByLabelText('Nhập bản dịch'), 'sai')
  await user.click(screen.getByRole('button', { name: 'Kiểm tra' }))
  await user.click(screen.getByRole('button', { name: 'Xem đáp án' }))
  firstRender.unmount()

  await renderPage()
  expect(await screen.findByText('quả táo')).toBeInTheDocument()
  await user.type(screen.getByLabelText('Nhập bản dịch'), 'quả táo')
  await user.keyboard('{Enter}')
  await user.type(await screen.findByLabelText('Nhập bản dịch'), 'quả chuối')
  await user.keyboard('{Enter}')

  expect(await screen.findByText('?score=1&total=2')).toBeInTheDocument()
})

it('offers retry when loading selected deck terms fails', async () => {
  const user = userEvent.setup()
  vi.mocked(deckService.listTerms).mockRejectedValueOnce(new Error('network'))
    .mockResolvedValueOnce([makeItem('apple', 'apple', 'quả táo')])
  await renderPage()
  expect(await screen.findByText('Không lấy được từ vựng. Vui lòng thử lại.')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Thử lại' }))
  expect(await screen.findByText('apple')).toBeInTheDocument()
})

it('explains when loaded terms contain no translations', async () => {
  vi.mocked(deckService.listTerms).mockResolvedValue([{ ...baseItem, translation: null }])
  await renderPage()
  expect(await screen.findByText('Chưa có từ vựng có bản dịch để kiểm tra.')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run session tests to verify failure**

Run:

```bash
pnpm exec vitest run src/pages/quiz/QuizSessionPage.test.tsx
```

Expected: FAIL because the page still generates true/false questions and has no text input/reveal/retry flow.

- [ ] **Step 3: Add interaction copy**

Add English and Vietnamese translations in `src/i18n/index.ts`:

```ts
'quiz.sessionTitle': 'Translation check',
'quiz.sessionDescription': 'Type the translation from memory before revealing the answer.',
'quiz.answerLabel': 'Enter translation',
'quiz.checkAnswer': 'Check',
'quiz.incorrect': 'Not correct yet. Try again or reveal the answer.',
'quiz.revealAnswer': 'Reveal answer',
'quiz.revealedNotice': 'Answer revealed. Type it correctly to continue; this prompt no longer scores.',
'quiz.expectedTranslation': 'Expected translation',
```

```ts
'quiz.sessionTitle': 'Kiểm tra nhập bản dịch',
'quiz.sessionDescription': 'Nhập bản dịch từ trí nhớ trước khi xem đáp án.',
'quiz.answerLabel': 'Nhập bản dịch',
'quiz.checkAnswer': 'Kiểm tra',
'quiz.incorrect': 'Chưa đúng. Hãy thử lại hoặc xem đáp án.',
'quiz.revealAnswer': 'Xem đáp án',
'quiz.revealedNotice': 'Đã xem đáp án. Hãy nhập đúng để tiếp tục; câu này không còn điểm.',
'quiz.expectedTranslation': 'Đáp án',
```

- [ ] **Step 4: Replace session question generation and local interaction state**

In `QuizSessionPage.tsx`, replace `generateTrueFalseQuestions` with:

```ts
import { getDemoVocabularyForDeck } from '@/features/demo/demoData'
import { generateTranslationQuestions, hasTranslation, isTranslationAnswerCorrect } from '@/features/quiz/translationInputQuiz'
import { Input, Label } from '@/components/ui/input'
import type { FormEvent } from 'react'
import type { StoredQuizSession } from '@/features/quiz/sessionPersistence'

const [answerText, setAnswerText] = useState('')
const [incorrect, setIncorrect] = useState(false)
const [sessionState, setSessionState] = useState<StoredQuizSession | null>(initialStoredSession)

const source = useMemo(() => {
  const loaded = shouldUseRemoteData
    ? selectedDeckId ? deckTermsQuery.data ?? [] : vocabularyQuery.data ?? []
    : getDemoVocabularyForDeck(selectedDeckId)
  return filterActiveVocabulary(loaded)
}, [deckTermsQuery.data, selectedDeckId, shouldUseRemoteData, vocabularyQuery.data])
const generatedQuestions = useMemo(
  () => generateTranslationQuestions(source, questionCount),
  [questionCount, source],
)
```

When no stored snapshot exists and `generatedQuestions` becomes available, create this atomically and persist it:

```ts
const freshSession: StoredQuizSession = {
  questions: generatedQuestions,
  index: 0,
  score: 0,
  revealedQuestionIds: [],
  completedQuestionIds: [],
}
writeStoredQuizSession(sessionKey, freshSession)
setSessionState(freshSession)
```

Derive the active question from that single state object and write it back in one effect:

```ts
const questions = sessionState?.questions ?? generatedQuestions
const index = sessionState?.index ?? 0
const score = sessionState?.score ?? 0
const question = questions[index]
const revealed = Boolean(question && sessionState?.revealedQuestionIds.includes(question.id))

useEffect(() => {
  if (sessionState) writeStoredQuizSession(sessionKey, sessionState)
}, [sessionKey, sessionState])
```

Add answer submission and reveal behavior:

```ts
function submitAnswer(event?: FormEvent<HTMLFormElement>) {
  event?.preventDefault()
  if (!question || !sessionState) return

  if (!isTranslationAnswerCorrect(answerText, question.expectedTranslation)) {
    setIncorrect(true)
    return
  }

  const scored = !revealed
  const nextScore = score + (scored ? 1 : 0)
  const completedQuestionIds = [...sessionState.completedQuestionIds, question.id]
  if (index >= questions.length - 1) {
    clearStoredQuizSession(sessionKey)
    navigate(`/app/quiz/result/demo-result?score=${nextScore}&total=${questions.length}`)
    return
  }
  setSessionState({
    ...sessionState,
    index: index + 1,
    score: nextScore,
    completedQuestionIds,
  })
  setAnswerText('')
  setIncorrect(false)
}

function revealAnswer() {
  if (!question || !sessionState || revealed) return
  setSessionState({
    ...sessionState,
    revealedQuestionIds: [...sessionState.revealedQuestionIds, question.id],
  })
}
```

Do not keep parallel React states for index/score/revealed IDs; the single `StoredQuizSession` state prevents an answer reveal from racing a later score persistence effect.

- [ ] **Step 5: Render the input card, metadata, actionable errors, and empty states**

Render question metadata and form:

```tsx
<CardTitle className="mt-6 text-4xl">{question.sourceText}</CardTitle>
{question.ipa || question.partOfSpeech ? (
  <p className="mt-3 font-semibold text-muted-foreground">
    {[question.ipa, question.partOfSpeech].filter(Boolean).join(' - ')}
  </p>
) : null}
<form className="mx-auto mt-8 grid max-w-md gap-3 text-left" onSubmit={submitAnswer}>
  <Label htmlFor="quiz-answer">{t('quiz.answerLabel')}</Label>
  <Input
    id="quiz-answer"
    autoFocus
    value={answerText}
    onChange={(event) => setAnswerText(event.target.value)}
  />
  {incorrect ? <p role="alert" className="font-bold text-danger">{t('quiz.incorrect')}</p> : null}
  {revealed ? (
    <div className="rounded-md border-2 border-border bg-muted p-3">
      <p className="text-xs font-black uppercase">{t('quiz.expectedTranslation')}</p>
      <p className="font-black">{question.expectedTranslation}</p>
      <p className="mt-1 text-sm font-semibold">{t('quiz.revealedNotice')}</p>
    </div>
  ) : incorrect ? (
    <Button type="button" variant="secondary" onClick={revealAnswer}>{t('quiz.revealAnswer')}</Button>
  ) : null}
  <Button type="submit">{t('quiz.checkAnswer')}</Button>
</form>
```

Use `activeQuery = selectedDeckId ? deckTermsQuery : vocabularyQuery` for remote-mode loading/error handling. For `activeQuery.isError`, render `quiz.loadError` and a button calling `activeQuery.refetch()`. After successful load, distinguish `source.length === 0` from `source.some(hasTranslation) === false` with `quiz.noVocabulary` and `quiz.noTranslatedVocabulary`.

Do not import or call `quizService.saveResult()` in this route; the approved MVP result remains local and score-only.

- [ ] **Step 6: Run session and persistence tests and commit**

Run:

```bash
pnpm exec vitest run src/pages/quiz/QuizSessionPage.test.tsx src/features/quiz/sessionPersistence.test.ts src/features/quiz/translationInputQuiz.test.ts
```

Expected: PASS.

Commit:

```bash
git add src/pages/quiz/QuizSessionPage.tsx src/pages/quiz/QuizSessionPage.test.tsx src/i18n/index.ts
git commit -m "feat: implement translation quiz session"
```

### Task 5: Reduce Results And Update Visible Product Copy

**Files:**
- Modify: `src/pages/quiz/QuizResultPage.tsx`
- Create: `src/pages/quiz/QuizResultPage.test.tsx`
- Modify: `src/pages/public/LandingPage.tsx`
- Modify: `src/pages/public/LandingPage.test.tsx`
- Modify: `src/i18n/index.ts`

- [ ] **Step 1: Write failing score-only and public-copy tests**

Create `src/pages/quiz/QuizResultPage.test.tsx`:

```ts
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { QuizResultPage } from '@/pages/quiz/QuizResultPage'

describe('QuizResultPage', () => {
  it('shows only the score promised by the translation quiz MVP', () => {
    render(<MemoryRouter initialEntries={['/app/quiz/result/session?score=2&total=3']}><QuizResultPage /></MemoryRouter>)
    expect(screen.getByText('2/3')).toBeInTheDocument()
    expect(screen.queryByText('Độ chính xác')).not.toBeInTheDocument()
    expect(screen.queryByText('Câu sai')).not.toBeInTheDocument()
  })
})
```

In `src/pages/public/LandingPage.test.tsx`, add or adapt an assertion:

```ts
expect(screen.getByText(/nhập bản dịch/i)).toBeInTheDocument()
expect(screen.queryByText(/đúng\/sai/i)).not.toBeInTheDocument()
```

- [ ] **Step 2: Run the tests to verify current copy/result fail**

Run:

```bash
pnpm exec vitest run src/pages/quiz/QuizResultPage.test.tsx src/pages/public/LandingPage.test.tsx
```

Expected: FAIL because the result still renders accuracy/wrong-answer tiles and landing content advertises true/false.

- [ ] **Step 3: Render score-only results and translation-focused public content**

Simplify `QuizResultPage.tsx`:

```tsx
return (
  <>
    <PageHeader
      title={t('quiz.resultTitle')}
      description={t('quiz.resultDescription')}
      actions={<Button asChild><Link to="/app/quiz">{t('quiz.retry')}</Link></Button>}
    />
    <div className="max-w-sm">
      <StatTile label={t('quiz.score')} value={`${score}/${total}`} />
    </div>
  </>
)
```

Update keys:

```ts
'quiz.translationInput': 'Type translation',
'quiz.resultDescription': 'Start another check to practise remembering translations.',
'landing.featureChecksText': 'Type translations from memory, then reveal answers only when you need help.',
'landing.previewQuizText': 'Translation checks give immediate feedback while keeping recall active.',
```

```ts
'quiz.translationInput': 'Nhập bản dịch',
'quiz.resultDescription': 'Làm bài mới để tiếp tục luyện nhớ bản dịch.',
'landing.featureChecksText': 'Nhập bản dịch từ trí nhớ và chỉ xem đáp án khi cần hỗ trợ.',
'landing.previewQuizText': 'Bài nhập bản dịch phản hồi ngay trong khi vẫn buộc bạn chủ động nhớ lại.',
```

In `LandingPage.tsx`, replace the preview label usage:

```tsx
<p className="text-sm font-black uppercase opacity-80">{t('quiz.translationInput')}</p>
```

- [ ] **Step 4: Run UI copy tests and commit**

Run:

```bash
pnpm exec vitest run src/pages/quiz/QuizResultPage.test.tsx src/pages/public/LandingPage.test.tsx src/pages/quiz/QuizSetupPage.test.tsx src/pages/quiz/QuizSessionPage.test.tsx
```

Expected: PASS.

Commit:

```bash
git add src/pages/quiz/QuizResultPage.tsx src/pages/quiz/QuizResultPage.test.tsx src/pages/public/LandingPage.tsx src/pages/public/LandingPage.test.tsx src/i18n/index.ts
git commit -m "feat: update translation quiz results and messaging"
```

### Task 6: Document And Verify The Implemented Feature

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md`

- [ ] **Step 1: Update project context only after functionality passes**

In `CLAUDE.md`, replace the true/false-specific current-state statements with implemented translation-quiz facts:

```md
- Translation-input quiz sessions generate randomized prompts from active vocabulary items with saved `translation` values; cards show source text plus IPA/part of speech when present. Answers are checked after NFC/case/whitespace/punctuation normalization and permit Levenshtein distance `1` only for stored translations of at least 8 characters. Revealing an answer forfeits that prompt's point and persists across reloads in `sessionStorage`; results are score-only and do not write quiz statistics or SRS in the current MVP.
```

Update the feature directory line and MVP status to say `translation-input quiz`, and retain a note that legacy true/false code/schema may remain for compatibility.
Update the dual-mode note so it states that quiz now scopes demo decks through `getDemoVocabularyForDeck`, while study still uses the shared demo vocabulary list until addressed separately.

In `README.md`, change the visible feature bullet and structure comment:

```md
- **Translation-entry quiz** - Type remembered translations with optional answer reveal and instant scoring
```

```md
    quiz/           # Translation-entry quiz flow plus legacy true/false compatibility
```

- [ ] **Step 2: Run focused tests and full validation**

Run:

```bash
pnpm exec vitest run src/features/quiz/translationInputQuiz.test.ts src/features/quiz/sessionPersistence.test.ts src/pages/quiz/QuizSetupPage.test.tsx src/pages/quiz/QuizSessionPage.test.tsx src/pages/quiz/QuizResultPage.test.tsx src/pages/public/LandingPage.test.tsx
pnpm test
pnpm lint
pnpm build
```

Expected: all commands exit with code `0`. Record any existing Vite bundle-size warning without treating it as test failure.

- [ ] **Step 3: Visually verify the frontend workflow**

Use the Browser plugin on the running local app after starting Vite:

```bash
pnpm dev
```

Verify at `/app/quiz` and one session:

1. Type selector is absent; demo mode reports translated prompts available.
2. A prompt displays source text plus IPA/part of speech without exposing its translation.
3. Wrong input shows retry/reveal; reveal exposes the answer and a corrected submission gives no point.
4. A new attempt answered correctly produces `1/1` on the score-only result page.

- [ ] **Step 4: Inspect and commit documentation**

Before committing, follow repository policy:

```bash
git status --short
git diff -- CLAUDE.md README.md
git diff --cached
```

Check that no `.env`, token, key, or unrelated file is staged. Then commit only docs:

```bash
git add CLAUDE.md README.md
git commit -m "docs: document translation input quiz"
```
