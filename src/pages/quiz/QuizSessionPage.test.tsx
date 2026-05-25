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
  pronunciation_text: null,
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
  deleted_at: null,
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
}

function ResultProbe() {
  const location = useLocation()
  return <p>{location.search}</p>
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

    expect(await screen.findByText('?score=1&total=1')).toBeInTheDocument()
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

    expect(await screen.findByText('?score=1&total=1')).toBeInTheDocument()
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

    expect(await screen.findByText('?score=0&total=1')).toBeInTheDocument()
  })

  it('shakes the input after a wrong answer until the animation ends', async () => {
    const user = userEvent.setup()
    await renderPage([baseItem])

    const answerInput = await screen.findByRole('textbox', { name: 'Bản dịch' })
    await user.type(answerInput, 'chuối')
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }))

    expect(answerInput).toHaveClass('quiz-answer-input-shake')

    fireEvent.animationEnd(answerInput)
    await waitFor(() => expect(answerInput).not.toHaveClass('quiz-answer-input-shake'))
  })

  it('reveals the answer with Alt+R after an incorrect try', async () => {
    const user = userEvent.setup()
    await renderPage([baseItem])

    const answerInput = await screen.findByRole('textbox', { name: 'Bản dịch' })
    await user.type(answerInput, 'chuối')
    await user.click(screen.getByRole('button', { name: 'Kiểm tra' }))
    await user.keyboard('{Alt>}r{/Alt}')

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

    expect(await screen.findByText('?score=0&total=1')).toBeInTheDocument()
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
})
