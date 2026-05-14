import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildStudySessionStorageKey, writeActiveStudySessionStorageKey } from '@/features/study/sessionPersistence'
import { FlashcardStudyPage } from '@/pages/study/FlashcardStudyPage'
import { useAuthStore } from '@/stores/useAuthStore'
import { useStudyStore } from '@/stores/useStudyStore'
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

vi.mock('@/services/supabase/relationship.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/supabase/relationship.service')>()
  return {
    ...actual,
    relationshipService: {
      getCard: vi.fn(),
    },
  }
})

vi.mock('@/services/supabase/study.service', () => ({
  studyService: {
    applyReviewAction: vi.fn(),
    flushTermViews: vi.fn(),
  },
}))

vi.mock('@/utils/audio', () => ({
  speak: vi.fn(),
}))

const baseItem: VocabularyItem = {
  id: 'produce',
  user_id: 'user-1',
  global_term_id: null,
  source_text: 'produce',
  normalized_text: 'produce',
  source_language: 'en',
  native_language: 'vi',
  item_type: 'word',
  part_of_speech: 'v',
  ipa: null,
  pronunciation_text: null,
  audio_url: null,
  image_url: null,
  note: null,
  meanings: [{ text: '', language: 'vi' }],
  translation: 'sản xuất',
  examples: [],
  tags: [],
  status: 'new',
  view_count: 0,
  correct_count: 0,
  wrong_count: 0,
  audio_play_count: 0,
  last_reviewed_at: null,
  next_review_at: null,
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
}

function relatedTerm(id: string, sourceText: string, translation: string): VocabularyItem {
  return {
    ...baseItem,
    id,
    source_text: sourceText,
    normalized_text: sourceText,
    part_of_speech: 'n',
    translation,
  }
}

function makeItem(id: string, sourceText: string, translation: string): VocabularyItem {
  return {
    ...baseItem,
    id,
    source_text: sourceText,
    normalized_text: sourceText,
    translation,
  }
}

async function renderPage(items: VocabularyItem[] = [baseItem], lookupItems: VocabularyItem[] = items, mockListTerms = true) {
  const { deckService } = await import('@/services/supabase/deck.service')
  const { relationshipService, createEmptyRelationshipGroups } = await import('@/services/supabase/relationship.service')
  if (mockListTerms) {
    vi.mocked(deckService.listTerms).mockResolvedValue(items)
  }
  vi.mocked(relationshipService.getCard).mockImplementation(async (id: string) => ({
    entry: lookupItems.find((entry) => entry.id === id) ?? baseItem,
    relationships: {
      ...createEmptyRelationshipGroups(),
      derivative: [
        relatedTerm('product', 'product', 'sản phẩm'),
        relatedTerm('production', 'production', 'việc sản xuất'),
      ],
    },
  }))

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app/study/session/deck-session']}>
        <Routes>
          <Route path="/app/study/session/:sessionId" element={<FlashcardStudyPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('FlashcardStudyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.clear()
    useAuthStore.setState({
      user: { id: 'user-1' } as never,
      profile: { native_language: 'vi', target_language: 'en', ui_language: 'vi' } as never,
    })
    useStudyStore.setState({
      mode: 'one_side',
      cardLimit: 20,
      shuffle: false,
      selectedDeckId: 'deck-1',
    })
  })

  it('shows translation and related terms on one-side flashcards', async () => {
    await renderPage()

    expect(await screen.findByText('sản xuất')).toBeInTheDocument()
    expect(await screen.findByText('Phái sinh')).toBeInTheDocument()
    expect(screen.getByText('product')).toBeInTheDocument()
    expect(screen.getByText('production')).toBeInTheDocument()
  })

  it('shows only remember and forgot review choices', async () => {
    await renderPage()

    expect(await screen.findByRole('button', { name: 'Nhớ' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Không nhớ' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Khó' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Đã ghi nhớ' })).not.toBeInTheDocument()
  })

  it('lets learners move backward and forward without recording a review action', async () => {
    const user = userEvent.setup()
    const { studyService } = await import('@/services/supabase/study.service')
    await renderPage([baseItem, makeItem('transfer', 'transfer', 'chuyển')])

    const previousButton = await screen.findByRole('button', { name: 'Thẻ trước' })
    const nextButton = screen.getByRole('button', { name: 'Thẻ tiếp theo' })
    expect(previousButton).toBeDisabled()
    expect(screen.getByText('produce')).toBeInTheDocument()

    await user.click(nextButton)
    expect(await screen.findByText('transfer')).toBeInTheDocument()
    expect(previousButton).toBeEnabled()

    await user.click(previousButton)
    expect(await screen.findByText('produce')).toBeInTheDocument()
    expect(studyService.applyReviewAction).not.toHaveBeenCalled()
  })

  it('batches viewed cards and flushes them when the study session completes', async () => {
    const user = userEvent.setup()
    const { studyService } = await import('@/services/supabase/study.service')
    vi.mocked(studyService.applyReviewAction).mockResolvedValue({} as never)
    await renderPage([baseItem, makeItem('transfer', 'transfer', 'chuyển')])

    expect(await screen.findByText('produce')).toBeInTheDocument()
    expect(studyService.flushTermViews).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Thẻ tiếp theo' }))
    expect(await screen.findByText('transfer')).toBeInTheDocument()
    expect(studyService.flushTermViews).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Thẻ trước' }))
    expect(await screen.findByText('produce')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Thẻ tiếp theo' }))
    await user.click(screen.getByRole('button', { name: 'Nhớ' }))

    await waitFor(() => expect(studyService.flushTermViews).toHaveBeenCalledTimes(1))
    expect(studyService.flushTermViews).toHaveBeenCalledWith(['produce', 'transfer'])
  })

  it('keeps the original session order after recording a review action refetches deck terms', async () => {
    const user = userEvent.setup()
    const { deckService } = await import('@/services/supabase/deck.service')
    const { studyService } = await import('@/services/supabase/study.service')
    const reject = makeItem('reject', 'reject', 'từ chối')
    const celebration = makeItem('celebration', 'in celebration of', 'nhân dịp')
    const inconvenience = makeItem('inconvenience', 'inconvenience', 'sự bất tiện')

    let reviewed = false
    vi.mocked(deckService.listTerms).mockImplementation(async () => (reviewed ? [inconvenience, celebration] : [reject, celebration]))
    vi.mocked(studyService.applyReviewAction).mockImplementation(async () => {
      reviewed = true
      return {} as never
    })

    await renderPage([reject, celebration], [reject, celebration, inconvenience], false)

    expect(await screen.findByText('reject')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Nhớ' }))
    expect(await screen.findByText('in celebration of')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Thẻ trước' }))
    expect(await screen.findByText('reject')).toBeInTheDocument()
    expect(screen.queryByText('inconvenience')).not.toBeInTheDocument()
  })

  it('restores the same session card and position after a reload changes fetched order', async () => {
    const user = userEvent.setup()
    const introduction = makeItem('introduction', 'introduction', 'giới thiệu')
    const yet = makeItem('yet', 'yet', 'chưa')

    const firstRender = await renderPage([introduction, yet])
    expect(await screen.findByText('introduction')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Thẻ tiếp theo' }))
    expect(await screen.findByText('yet')).toBeInTheDocument()
    firstRender.unmount()

    await renderPage([yet, introduction])

    expect(await screen.findByText('yet')).toBeInTheDocument()
    expect(screen.getByText('Thẻ 2 / 2')).toBeInTheDocument()
    expect(screen.queryByText('introduction')).not.toBeInTheDocument()
  })

  it('keeps the selected one-side mode after a reload resets store defaults', async () => {
    const creativeIdeas = makeItem('creative-ideas', 'creative ideas', 'ý tưởng sáng tạo')
    const sessionStorageKey = buildStudySessionStorageKey({
      userId: 'user-1',
      sessionId: 'deck-session',
      selectedDeckId: 'deck-1',
      mode: 'one_side',
      cardLimit: 20,
      shuffle: false,
      remote: true,
    })

    const firstRender = await renderPage([creativeIdeas])
    expect(await screen.findByText('ý tưởng sáng tạo')).toBeInTheDocument()
    writeActiveStudySessionStorageKey({
      userId: 'user-1',
      sessionId: 'deck-session',
      remote: true,
    }, sessionStorageKey)
    firstRender.unmount()

    useStudyStore.setState({ mode: 'two_side' })
    await renderPage([creativeIdeas])

    expect(await screen.findByText('ý tưởng sáng tạo')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Lật thẻ' })).not.toBeInTheDocument()
  })

  it('uses a flipped card state when revealing a two-side card', async () => {
    const user = userEvent.setup()
    useStudyStore.setState({ mode: 'two_side' })
    await renderPage()

    const shell = await screen.findByTestId('flashcard-shell')
    const back = screen.getByTestId('flashcard-back')
    expect(shell).toHaveAttribute('data-flipped', 'false')
    expect(back).toHaveAttribute('aria-hidden', 'true')

    await user.click(screen.getByRole('button', { name: 'Lật thẻ' }))

    expect(shell).toHaveAttribute('data-flipped', 'true')
    expect(back).toHaveAttribute('aria-hidden', 'false')
    expect(await screen.findByText('sản xuất')).toBeInTheDocument()
  })

  it('automatically plays audio, flips two-side cards, and advances on a timer', async () => {
    const { speak } = await import('@/utils/audio')
    useStudyStore.setState({ mode: 'two_side' })
    await renderPage([baseItem, makeItem('transfer', 'transfer', 'chuyển')])
    const autoButton = await screen.findByRole('button', { name: 'Bật tự động' })

    vi.useFakeTimers()
    try {
      fireEvent.click(autoButton)

      act(() => vi.advanceTimersByTime(600))
      expect(speak).toHaveBeenCalledWith('produce')
      expect(screen.getByTestId('flashcard-shell')).toHaveAttribute('data-flipped', 'false')

      act(() => vi.advanceTimersByTime(2100))
      expect(screen.getByTestId('flashcard-shell')).toHaveAttribute('data-flipped', 'true')

      act(() => vi.advanceTimersByTime(3900))
      expect(screen.getAllByText('transfer')[0]).toBeInTheDocument()

      act(() => vi.advanceTimersByTime(600))
      expect(speak).toHaveBeenLastCalledWith('transfer')
    } finally {
      vi.runOnlyPendingTimers()
      vi.useRealTimers()
    }
  })

  it('loops to the first card when automatic repeat is enabled', async () => {
    await renderPage([baseItem, makeItem('transfer', 'transfer', 'chuyển')])
    const repeatButton = await screen.findByRole('button', { name: 'Lặp lại' })
    const autoButton = screen.getByRole('button', { name: 'Bật tự động' })

    vi.useFakeTimers()
    try {
      fireEvent.click(repeatButton)
      fireEvent.click(autoButton)

      act(() => vi.advanceTimersByTime(6000))
      expect(screen.getByText('transfer')).toBeInTheDocument()

      act(() => vi.advanceTimersByTime(6000))
      expect(screen.getByText('produce')).toBeInTheDocument()
    } finally {
      vi.runOnlyPendingTimers()
      vi.useRealTimers()
    }
  })
})
