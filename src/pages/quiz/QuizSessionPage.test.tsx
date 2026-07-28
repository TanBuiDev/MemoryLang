import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QuizSessionPage } from '@/pages/quiz/QuizSessionPage'
import { useAuthStore } from '@/stores/useAuthStore'
import { useQuizStore } from '@/stores/useQuizStore'
import type { VocabularyItem } from '@/types/vocabulary.types'

vi.mock('@/services/supabase/client', () => ({
  isSupabaseConfigured: true,
  supabase: {},
}))

vi.mock('@/services/supabase/deck.service', () => ({
  deckService: {
    listTerms: vi.fn(),
  },
}))

vi.mock('@/services/supabase/vocabulary.service', () => ({
  vocabularyService: {
    list: vi.fn(),
  },
}))

const baseItem: VocabularyItem = {
  id: 'apple',
  user_id: 'user-1',
  global_term_id: null,
  source_text: 'apple',
  normalized_text: 'apple',
  source_language: 'en',
  native_language: 'vi',
  item_type: 'word',
  part_of_speech: 'noun',
  ipa: '/apple/',
  audio_url: null,
  image_url: null,
  note: null,
  meanings: [{ text: 'A fruit', language: 'en' }],
  translation: 'quả táo',
  examples: [],
  tags: [],
  status: 'new',
  view_count: 0,
  correct_count: 0,
  wrong_count: 0,
  audio_play_count: 0,
  srs_repetition: 0,
  srs_interval_days: 0,
  srs_ease_factor: 2.5,
  last_reviewed_at: null,
  next_review_at: null,
  flagged: false,
  deleted_at: null,
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
}

function ResultProbe() {
  const location = useLocation()
  return <p>{location.pathname}</p>
}

async function renderPage(items: VocabularyItem[]) {
  const { deckService } = await import('@/services/supabase/deck.service')
  vi.mocked(deckService.listTerms).mockResolvedValue(items)

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app/quiz/session/deck-quiz']}>
        <Routes>
          <Route path="/app/quiz/session/:sessionId" element={<QuizSessionPage />} />
          <Route path="/app/quiz/result/:resultId" element={<ResultProbe />} />
          <Route path="/app/quiz" element={<ResultProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('QuizSessionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0)
    window.sessionStorage.clear()
    useAuthStore.setState({
      user: { id: 'user-1' } as never,
      profile: { native_language: 'vi', target_language: 'en', ui_language: 'vi' } as never,
    })
    useQuizStore.setState({
      quizType: 'translation_input',
      questionCount: 1,
      selectedDeckId: 'deck-1',
    })
  })

  it('prompts for a translation without exposing the answer and scores a correct entry', async () => {
    const user = userEvent.setup()
    await renderPage([baseItem])

    expect(await screen.findByText('apple')).toBeInTheDocument()
    expect(screen.getByText('/apple/')).toBeInTheDocument()
    expect(screen.getByText('noun')).toBeInTheDocument()
    expect(screen.queryByText('quả táo')).not.toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Bản dịch' }), 'quả táo')
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }))

    expect(await screen.findByText('Kết quả kiểm tra', {}, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.getByText('1/1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Kết thúc' })).toBeInTheDocument()
  })

  it('keeps a wrong question active and still awards a point after a correct retry without reveal', async () => {
    const user = userEvent.setup()
    await renderPage([baseItem])

    await user.type(await screen.findByRole('textbox', { name: 'Bản dịch' }), 'chuối')
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }))

    expect(screen.getByText('Chưa đúng. Hãy thử lại.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Bản dịch' })).toHaveValue('chuối')
    expect(screen.queryByText('quả táo')).not.toBeInTheDocument()

    await user.clear(screen.getByRole('textbox', { name: 'Bản dịch' }))
    await user.type(screen.getByRole('textbox', { name: 'Bản dịch' }), 'quả táo')
    await user.keyboard('{Enter}')

    expect(await screen.findByText('Kết quả kiểm tra', {}, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.getByText('1/1')).toBeInTheDocument()
  })

  it('reveals the answer on request and gives no point once revealed', async () => {
    const user = userEvent.setup()
    await renderPage([baseItem])

    await user.type(await screen.findByRole('textbox', { name: 'Bản dịch' }), 'chuối')
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }))
    await user.click(screen.getByRole('button', { name: 'Xem đáp án' }))

    expect(screen.getByText('quả táo')).toBeInTheDocument()
    expect(screen.getByText('Câu này sẽ không được tính điểm.')).toBeInTheDocument()

    await user.clear(screen.getByRole('textbox', { name: 'Bản dịch' }))
    await user.type(screen.getByRole('textbox', { name: 'Bản dịch' }), 'quả táo')
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }))

    expect(await screen.findByText('Kết quả kiểm tra', {}, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.getByText('0/1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Làm lại từ sai' })).toBeInTheDocument()
  })

  it('shakes the input after a wrong answer until the animation ends', async () => {
    const user = userEvent.setup()
    await renderPage([baseItem])

    const answerInput = await screen.findByRole('textbox', { name: 'Bản dịch' })
    await user.type(answerInput, 'chuối')
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }))

    expect(answerInput).toHaveClass('quiz-input-shake')

    fireEvent.animationEnd(answerInput)
    await waitFor(() => expect(answerInput).not.toHaveClass('quiz-input-shake'))
  })

  it('reveals the answer with Alt+R after an incorrect try', async () => {
    const user = userEvent.setup()
    await renderPage([baseItem])

    const answerInput = await screen.findByRole('textbox', { name: 'Bản dịch' })
    await user.type(answerInput, 'chuối')
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }))
    await user.keyboard('{Alt>}a{/Alt}')

    expect(screen.getByText('quả táo')).toBeInTheDocument()
    expect(screen.getByText('Câu này sẽ không được tính điểm.')).toBeInTheDocument()
  })

  it('clears the draft answer with Escape', async () => {
    const user = userEvent.setup()
    await renderPage([baseItem])

    const answerInput = await screen.findByRole('textbox', { name: 'Bản dịch' })
    await user.type(answerInput, 'chuối')
    await user.keyboard('{Escape}')

    expect(answerInput).toHaveValue('')
    expect(answerInput).toHaveFocus()
  })

  it('preserves a revealed answer penalty after the session page reloads', async () => {
    const user = userEvent.setup()
    const firstRender = await renderPage([baseItem])

    await user.type(await screen.findByRole('textbox', { name: 'Bản dịch' }), 'chuối')
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }))
    await user.click(screen.getByRole('button', { name: 'Xem đáp án' }))
    firstRender.unmount()

    await renderPage([baseItem])
    expect(await screen.findByText('Câu này sẽ không được tính điểm.')).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Bản dịch' }), 'quả táo')
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }))

    expect(await screen.findByText('Kết quả kiểm tra', {}, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.getByText('0/1')).toBeInTheDocument()
  })

  it('retries loading the selected source after a fetch failure', async () => {
    const user = userEvent.setup()
    const { deckService } = await import('@/services/supabase/deck.service')
    vi.mocked(deckService.listTerms)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce([baseItem])

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/app/quiz/session/deck-quiz']}>
          <Routes>
            <Route path="/app/quiz/session/:sessionId" element={<QuizSessionPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Không lấy được từ vựng. Vui lòng thử lại.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Thử lại' }))

    expect(await screen.findByRole('textbox', { name: 'Bản dịch' })).toBeInTheDocument()
  })

  it('shows the missing translation state when the source has no usable prompt', async () => {
    await renderPage([{ ...baseItem, translation: null }])

    expect(await screen.findByText('Chưa có từ vựng có bản dịch để kiểm tra.')).toBeInTheDocument()
  })

  it('shows the empty source state when the selected source has no vocabulary', async () => {
    await renderPage([])

    expect(await screen.findByText('Chưa có từ vựng để kiểm tra.')).toBeInTheDocument()
  })

  it('allows navigation and selection of multiple choice options via keyboard', async () => {
    const user = userEvent.setup()
    useQuizStore.setState({
      quizType: 'multiple_choice',
      questionCount: 1,
      selectedDeckId: 'deck-1',
    })

    const items = [
      baseItem,
      { ...baseItem, id: 'banana', source_text: 'banana', translation: 'quả chuối' },
      { ...baseItem, id: 'orange', source_text: 'orange', translation: 'quả cam' },
      { ...baseItem, id: 'grape', source_text: 'grape', translation: 'quả nho' },
    ]

    await renderPage(items)

    expect(await screen.findByText('banana')).toBeInTheDocument()

    // Press ArrowDown to highlight the first option
    await user.keyboard('[ArrowDown]')

    // Press Enter to select the highlighted option
    await user.keyboard('[Enter]')

    // Once selected, the option buttons should become disabled
    await waitFor(() => {
      const optionA = screen.getByText('A')
      const btn = optionA.closest('button')
      expect(btn).toBeDisabled()
    })
  })

  it('wraps around multiple choice options using arrow keys', async () => {
    const user = userEvent.setup()
    useQuizStore.setState({
      quizType: 'multiple_choice',
      questionCount: 1,
      selectedDeckId: 'deck-1',
    })

    const items = [
      baseItem,
      { ...baseItem, id: 'banana', source_text: 'banana', translation: 'quả chuối' },
      { ...baseItem, id: 'orange', source_text: 'orange', translation: 'quả cam' },
      { ...baseItem, id: 'grape', source_text: 'grape', translation: 'quả nho' },
    ]

    await renderPage(items)

    expect(await screen.findByText('banana')).toBeInTheDocument()

    // 1. Test ArrowUp wrap around: From null, pressing ArrowUp highlights the last option (D)
    await user.keyboard('[ArrowUp]')
    const optionD = screen.getByText('D')
    const buttonD = optionD.closest('button')
    await waitFor(() => expect(buttonD).toHaveClass('border-secondary'))

    // 2. Test ArrowDown wrap around from last option (D): Pressing ArrowDown wraps to A
    await user.keyboard('[ArrowDown]')
    const optionA = screen.getByText('A')
    const buttonA = optionA.closest('button')
    await waitFor(() => expect(buttonA).toHaveClass('border-secondary'))
    await waitFor(() => expect(buttonD).not.toHaveClass('border-secondary'))

    // 3. Test ArrowUp wrap around from first option (A): Pressing ArrowUp wraps to D
    await user.keyboard('[ArrowUp]')
    await waitFor(() => expect(buttonD).toHaveClass('border-secondary'))
    await waitFor(() => expect(buttonA).not.toHaveClass('border-secondary'))
  })

  it('allows navigation between questions using ArrowLeft and ArrowRight keys in MCQ mode', async () => {
    useQuizStore.setState({
      quizType: 'multiple_choice',
      questionCount: 4,
      selectedDeckId: 'deck-1',
    })

    const items = [
      baseItem,
      { ...baseItem, id: 'banana', source_text: 'banana', translation: 'quả chuối' },
      { ...baseItem, id: 'orange', source_text: 'orange', translation: 'quả cam' },
      { ...baseItem, id: 'grape', source_text: 'grape', translation: 'quả nho' },
    ]

    await renderPage(items)

    const q1Text = (await screen.findByRole('heading', { level: 2 })).textContent
    expect(q1Text).toBeTruthy()

    // Press ArrowRight to go to next question (banana/orange/etc)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    await waitFor(() => expect(screen.getByRole('heading', { level: 2 }).textContent).not.toBe(q1Text))
    const q2Text = screen.getByRole('heading', { level: 2 }).textContent

    // Press ArrowRight again to go to third
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    await waitFor(() => {
      const text = screen.getByRole('heading', { level: 2 }).textContent
      expect(text).not.toBe(q1Text)
      expect(text).not.toBe(q2Text)
    })
    const q3Text = screen.getByRole('heading', { level: 2 }).textContent

    // Press ArrowLeft to go back to second
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    await waitFor(() => expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(q2Text))

    // Press ArrowLeft to go back to first
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    await waitFor(() => expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(q1Text))

    // Wrap around: Press ArrowLeft from first to go to last (fourth)
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    await waitFor(() => {
      const text = screen.getByRole('heading', { level: 2 }).textContent
      expect(text).not.toBe(q1Text)
      expect(text).not.toBe(q2Text)
      expect(text).not.toBe(q3Text)
    })
    // Wrap around: Press ArrowRight from last (fourth) to go to first
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    await waitFor(() => expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(q1Text))
  })

  it('allows navigation using ArrowLeft and ArrowRight keys in Translation Input mode only when input is not focused', async () => {
    useQuizStore.setState({
      quizType: 'translation_input',
      questionCount: 4,
      selectedDeckId: 'deck-1',
    })

    const items = [
      baseItem,
      { ...baseItem, id: 'banana', source_text: 'banana', translation: 'quả chuối' },
      { ...baseItem, id: 'orange', source_text: 'orange', translation: 'quả cam' },
      { ...baseItem, id: 'grape', source_text: 'grape', translation: 'quả nho' },
    ]

    await renderPage(items)

    const q1Text = (await screen.findByRole('heading', { level: 2 })).textContent
    expect(q1Text).toBeTruthy()

    const answerInput = screen.getByRole('textbox', { name: 'Bản dịch' })
    
    // By default, it autofocuses the input
    expect(answerInput).toHaveFocus()

    // Press ArrowRight while focused - should NOT change question
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(q1Text)

    // Blur the input
    answerInput.blur()
    expect(answerInput).not.toHaveFocus()

    // Press ArrowRight while blurred - should change to second question
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2 })).not.toHaveTextContent(q1Text ?? '')
    })
    const q2Text = screen.getByRole('heading', { level: 2 }).textContent
    expect(q2Text).not.toBe(q1Text)

    // It autofocuses index change, so blur it again to test ArrowLeft
    await waitFor(() => expect(answerInput).toHaveFocus())
    answerInput.blur()
    expect(answerInput).not.toHaveFocus()

    // Press ArrowLeft while blurred - should change back to first question
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(q1Text ?? '')
    })
  })

  it('does not alter score or question correctness when re-answering an already completed question in Translation mode', async () => {
    const user = userEvent.setup()
    
    useQuizStore.setState({
      quizType: 'translation_input',
      questionCount: 2,
      selectedDeckId: 'deck-1',
    })

    const items = [
      baseItem,
      { ...baseItem, id: 'banana', source_text: 'banana', translation: 'quả chuối' },
    ]

    await renderPage(items)

    const q1Text = (await screen.findByRole('heading', { level: 2 })).textContent
    expect(q1Text).toBeTruthy()
    const answer1 = q1Text === 'apple' ? 'quả táo' : 'quả chuối'
    const answer2 = q1Text === 'apple' ? 'quả chuối' : 'quả táo'

    const answerInput = screen.getByRole('textbox', { name: 'Bản dịch' })
    await user.type(answerInput, answer1)
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }))

    // Autoadvances to second question (wait for timer)
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2 }).textContent).not.toBe(q1Text)
    }, { timeout: 3000 })
    const q2Text = screen.getByRole('heading', { level: 2 }).textContent

    // Blur input, and go back to first question
    answerInput.blur()
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(q1Text)

    // Now, answer it INCORRECTLY
    await user.type(answerInput, 'chuối_sai')
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }))

    // Navigate to second question manually (as incorrect answers do not autoadvance in Translation mode)
    answerInput.blur()
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(q2Text)

    // Verification: Highlight on sidebar for Question 1 should STILL be green (success), NOT red (danger)
    // (Now that index has changed, Q1 is no longer current and displays its correct/incorrect background)
    const sidebarButton1 = screen.getByRole('button', { name: '1' })
    expect(sidebarButton1).toHaveClass('bg-success/30')
    expect(sidebarButton1).not.toHaveClass('bg-danger/30')

    // Answer the second question correctly to finish the quiz
    await user.type(answerInput, answer2)
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }))

    // It should show results
    expect(await screen.findByText('Kết quả kiểm tra', {}, { timeout: 3000 })).toBeInTheDocument()

    // Score should be 2/2 (since the first question correct score of 1 was preserved, and second is correct)
    expect(screen.getByText('2/2')).toBeInTheDocument()
  })

  it('does not alter MCQ score or correctness when re-selecting options on an already completed question', async () => {
    useQuizStore.setState({
      quizType: 'multiple_choice',
      questionCount: 2,
      selectedDeckId: 'deck-1',
    })

    const items = [
      baseItem,
      { ...baseItem, id: 'banana', source_text: 'banana', translation: 'quả chuối' },
    ]

    await renderPage(items)

    const q1Text = (await screen.findByRole('heading', { level: 2 })).textContent
    expect(q1Text).toBeTruthy()
    const correctText1 = q1Text === 'apple' ? 'quả táo' : 'quả chuối'
    const correctText2 = q1Text === 'apple' ? 'quả chuối' : 'quả táo'

    // Click correct option for Q1
    const mcqButtons1 = screen.getAllByRole('button').filter(btn => {
      const text = btn.textContent || ''
      return (text.startsWith('A') || text.startsWith('B') || text.startsWith('C') || text.startsWith('D')) && text.length > 2
    })
    const buttonCorrect1 = mcqButtons1.find(btn => btn.textContent?.includes(correctText1))!
    fireEvent.click(buttonCorrect1)

    // Autoadvances to Q2
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2 }).textContent).not.toBe(q1Text)
    }, { timeout: 3000 })
    const q2Text = screen.getByRole('heading', { level: 2 }).textContent

    // Go back to Q1
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(q1Text)

    // Now select a WRONG option for Q1 on re-answering
    const mcqButtonsQ1Again = screen.getAllByRole('button').filter(btn => {
      const text = btn.textContent || ''
      return (text.startsWith('A') || text.startsWith('B') || text.startsWith('C') || text.startsWith('D')) && text.length > 2
    })
    const buttonWrong1 = mcqButtonsQ1Again.find(btn => !btn.textContent?.includes(correctText1))!
    fireEvent.click(buttonWrong1)

    // Should autoadvance to Q2 (wait for timer so Q1 is no longer current)
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(q2Text)
    }, { timeout: 3000 })

    // Verification: Sidebar button 1 should STILL be green, NOT red
    const sidebarButton1 = screen.getByRole('button', { name: '1' })
    expect(sidebarButton1).toHaveClass('bg-success/30')
    expect(sidebarButton1).not.toHaveClass('bg-danger/30')

    // Answer Q2 correctly to finish the quiz
    const mcqButtons2 = screen.getAllByRole('button').filter(btn => {
      const text = btn.textContent || ''
      return (text.startsWith('A') || text.startsWith('B') || text.startsWith('C') || text.startsWith('D')) && text.length > 2
    })
    const buttonCorrect2 = mcqButtons2.find(btn => btn.textContent?.includes(correctText2))!
    fireEvent.click(buttonCorrect2)

    // Should show results
    expect(await screen.findByText('Kết quả kiểm tra', {}, { timeout: 3000 })).toBeInTheDocument()

    // Score should be 2/2
    expect(screen.getByText('2/2')).toBeInTheDocument()
  })

  it('allows MCQ keyboard navigation and selection when re-answering a completed question', async () => {
    useQuizStore.setState({
      quizType: 'multiple_choice',
      questionCount: 2,
      selectedDeckId: 'deck-1',
    })

    const items = [
      baseItem,
      { ...baseItem, id: 'banana', source_text: 'banana', translation: 'quả chuối' },
    ]

    await renderPage(items)

    const q1Text = (await screen.findByRole('heading', { level: 2 })).textContent
    expect(q1Text).toBeTruthy()

    // Click WRONG option for Q1 (to make it completed and revealed)
    const mcqButtons1 = screen.getAllByRole('button').filter(btn => {
      const text = btn.textContent || ''
      return (text.startsWith('A') || text.startsWith('B') || text.startsWith('C') || text.startsWith('D')) && text.length > 2
    })
    const correctText1 = q1Text === 'apple' ? 'quả táo' : 'quả chuối'
    const buttonWrong1 = mcqButtons1.find(btn => !btn.textContent?.includes(correctText1))!
    fireEvent.click(buttonWrong1)

    // Should autoadvance to Q2 after wrong delay (wait for Q2)
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2 }).textContent).not.toBe(q1Text)
    }, { timeout: 3000 })
    const q2Text = screen.getByRole('heading', { level: 2 }).textContent

    // Go back to Q1 (which is completed & revealed/incorrect)
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(q1Text)

    // Try selecting correct option via MCQ keyboard shortcuts (press ArrowDown then Enter)
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'Enter' })

    // It should register selection, disable buttons (mcSelectedIndex !== null), and autoadvance back to Q2
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(q2Text)
    }, { timeout: 3000 })
  })

  it('allows navigation between questions using the click arrow buttons on the UI', async () => {
    useQuizStore.setState({
      quizType: 'multiple_choice',
      questionCount: 2,
      selectedDeckId: 'deck-1',
    })

    const items = [
      baseItem,
      { ...baseItem, id: 'banana', source_text: 'banana', translation: 'quả chuối' },
    ]

    await renderPage(items)

    const q1Text = (await screen.findByRole('heading', { level: 2 })).textContent
    expect(q1Text).toBeTruthy()

    // Find the next question button (Right arrow button) and prev question button (Left arrow button)
    const rightArrowBtn = screen.getByRole('button', { name: /Next question|Câu tiếp theo/ })
    const leftArrowBtn = screen.getByRole('button', { name: /Previous question|Câu trước/ })

    // Click right arrow to go to Q2
    fireEvent.click(rightArrowBtn)
    const q2Text = (await screen.findByRole('heading', { level: 2 })).textContent
    expect(q2Text).not.toBe(q1Text)

    // Click left arrow to go back to Q1
    fireEvent.click(leftArrowBtn)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(q1Text)
  })
})
