import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { demoVocabulary } from '@/features/demo/demoData'
import { buildQuizSessionStorageKey } from '@/features/quiz/sessionPersistence'
import { QuizSetupPage } from '@/pages/quiz/QuizSetupPage'
import { useAuthStore } from '@/stores/useAuthStore'
import { useQuizStore } from '@/stores/useQuizStore'
import type { VocabularyItem } from '@/types/vocabulary.types'

vi.mock('@/services/supabase/client', () => ({
  isSupabaseConfigured: true,
  supabase: {},
}))

vi.mock('@/services/supabase/deck.service', () => ({
  deckService: {
    list: vi.fn(),
    listTerms: vi.fn(),
  },
}))

vi.mock('@/services/supabase/vocabulary.service', () => ({
  vocabularyService: {
    list: vi.fn(),
  },
}))

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <QuizSetupPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('QuizSetupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.clear()
    useAuthStore.setState({ user: null, profile: null })
    useQuizStore.setState({ quizType: 'translation_input', questionCount: 10, selectedDeckId: null })
  })

  it('offers translation input quizzes from all demo vocabulary by default', () => {
    renderPage()

    const deckSelect = screen.getAllByRole('combobox')[0] as HTMLSelectElement

    expect(screen.getAllByRole('combobox')).toHaveLength(2)
    expect(screen.getByRole('option', { name: 'Tất cả từ vựng' })).toBeInTheDocument()
    expect(deckSelect.value).toBe('')
    expect(screen.queryByText('Đúng / Sai')).not.toBeInTheDocument()
    expect(screen.getByText('3 từ sẵn sàng kiểm tra')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bắt đầu kiểm tra' })).toBeEnabled()
  })

  it('scopes demo availability when a deck is selected', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(screen.getAllByRole('combobox')[0], 'interview')

    expect(screen.getByText('2 từ sẵn sàng kiểm tra')).toBeInTheDocument()
  })

  it('allows using every usable vocabulary item as quiz questions', () => {
    renderPage()

    const questionCountSelect = screen.getAllByRole('combobox')[1] as HTMLSelectElement

    expect(screen.getByRole('option', { name: 'Tất cả' })).toBeInTheDocument()
    expect(questionCountSelect).toHaveValue('10')
  })

  it('disables starting a remote quiz when vocabulary has no saved translation', async () => {
    const { deckService } = await import('@/services/supabase/deck.service')
    const { vocabularyService } = await import('@/services/supabase/vocabulary.service')
    useAuthStore.setState({ user: { id: 'user-1' } as never, profile: null })
    vi.mocked(deckService.list).mockResolvedValue([])
    vi.mocked(vocabularyService.list).mockResolvedValue([
      { ...demoVocabulary[0]!, translation: '   ' },
    ] as VocabularyItem[])

    renderPage()

    expect(await screen.findByText('Chưa có từ vựng có bản dịch để kiểm tra.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bắt đầu kiểm tra' })).toBeDisabled()
  })

  it('distinguishes an empty remote vocabulary source', async () => {
    const { deckService } = await import('@/services/supabase/deck.service')
    const { vocabularyService } = await import('@/services/supabase/vocabulary.service')
    useAuthStore.setState({ user: { id: 'user-1' } as never, profile: null })
    vi.mocked(deckService.list).mockResolvedValue([])
    vi.mocked(vocabularyService.list).mockResolvedValue([])

    renderPage()

    expect(await screen.findByText('Chưa có từ vựng để kiểm tra.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bắt đầu kiểm tra' })).toBeDisabled()
  })

  it('uses the selected remote deck terms as the quiz source', async () => {
    const user = userEvent.setup()
    const { deckService } = await import('@/services/supabase/deck.service')
    const { vocabularyService } = await import('@/services/supabase/vocabulary.service')
    useAuthStore.setState({ user: { id: 'user-1' } as never, profile: null })
    vi.mocked(deckService.list).mockResolvedValue([
      { id: 'deck-1', name: 'Interview' },
    ] as never)
    vi.mocked(vocabularyService.list).mockResolvedValue(demoVocabulary)
    vi.mocked(deckService.listTerms).mockResolvedValue([demoVocabulary[1]!])

    renderPage()
    await screen.findByText('3 từ sẵn sàng kiểm tra')
    await user.selectOptions(screen.getAllByRole('combobox')[0], 'deck-1')

    expect(await screen.findByText('1 từ sẵn sàng kiểm tra')).toBeInTheDocument()
    expect(deckService.listTerms).toHaveBeenCalledWith('deck-1')
  })

  it('retries a failed remote vocabulary query before enabling start', async () => {
    const user = userEvent.setup()
    const { deckService } = await import('@/services/supabase/deck.service')
    const { vocabularyService } = await import('@/services/supabase/vocabulary.service')
    useAuthStore.setState({ user: { id: 'user-1' } as never, profile: null })
    vi.mocked(deckService.list).mockResolvedValue([])
    vi.mocked(vocabularyService.list)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce([demoVocabulary[0]!])

    renderPage()

    expect(await screen.findByText('Không lấy được từ vựng. Vui lòng thử lại.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bắt đầu kiểm tra' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Thử lại' }))

    expect(await screen.findByText('1 từ sẵn sàng kiểm tra')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bắt đầu kiểm tra' })).toBeEnabled()
  })

  it('clears the stored translation input session when starting a fresh quiz', async () => {
    const user = userEvent.setup()
    const storageKey = buildQuizSessionStorageKey({
      userId: null,
      sessionId: 'deck-quiz',
      selectedDeckId: null,
      quizType: 'translation_input',
      questionCount: 10,
      remote: false,
    })
    window.sessionStorage.setItem(storageKey, 'stored-quiz')

    renderPage()
    await user.click(screen.getByRole('button', { name: 'Bắt đầu kiểm tra' }))

    expect(window.sessionStorage.getItem(storageKey)).toBeNull()
  })
})
