import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
    flushStudyChanges: vi.fn(),
    endSession: vi.fn(),
    flushTermViews: vi.fn(),
    pruneHistory: vi.fn(),
  },
}))

vi.mock('@/services/local/studyLocalDb', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/local/studyLocalDb')>()
  return {
    ...actual,
    studyLocalDb: {
      cacheVocabulary: vi.fn().mockResolvedValue(undefined),
      getCachedVocabulary: vi.fn().mockResolvedValue([]),
      saveActiveSession: vi.fn().mockResolvedValue(undefined),
      getActiveSession: vi.fn().mockResolvedValue(null),
      clearActiveSession: vi.fn().mockResolvedValue(undefined),
      addPendingReviewAction: vi.fn().mockResolvedValue(undefined),
      addPendingViewTermIds: vi.fn().mockResolvedValue(undefined),
      savePendingSessionSummary: vi.fn().mockResolvedValue(undefined),
      getPendingReviewActions: vi.fn().mockResolvedValue([]),
      getPendingViewTermIds: vi.fn().mockResolvedValue([]),
      getPendingStudyChanges: vi.fn().mockResolvedValue({ actions: [], viewedTermIds: [], sessionId: null, sessionPatch: null }),
      clearPendingStudyChanges: vi.fn().mockResolvedValue(undefined),
    },
  }
})

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
  srs_repetition: 0,
  srs_interval_days: 0,
  srs_ease_factor: 2.5,
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
          <Route path="/app/study/result/:sessionId" element={<div>Study result reached</div>} />
          <Route path="/app/study" element={<div>Study setup reached</div>} />
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

  it('keeps study controls in a responsive fixed icon toolbar', async () => {
    await renderPage()

    const toolbar = await screen.findByTestId('study-action-toolbar')
    expect(toolbar).toHaveClass('fixed')
    expect(toolbar).toHaveClass('md:sticky')
    expect(toolbar).toHaveClass('md:inset-auto')
    expect(toolbar).toHaveClass('md:self-start')
    const buttons = screen.getByTestId('study-toolbar-buttons')
    expect(buttons).toHaveClass('md:flex-col')
    expect(buttons).toHaveClass('md:max-w-none')
    expect(toolbar).toContainElement(screen.getByRole('button', { name: 'Phát âm thanh' }))
    expect(toolbar).toContainElement(screen.getByRole('button', { name: 'Bật tự động' }))
    expect(screen.queryByRole('spinbutton', { name: 'Giây/thẻ' })).not.toBeInTheDocument()
    expect(screen.queryAllByRole('button', { name: 'Bật tự động' })).toHaveLength(1)
    expect(toolbar).toContainElement(screen.getByRole('button', { name: 'Lặp lại' }))
    expect(toolbar).toContainElement(screen.getByRole('button', { name: 'Không nhớ' }))
    expect(toolbar).toContainElement(screen.getByRole('button', { name: 'Nhớ' }))
    expect(screen.getByRole('button', { name: 'Nhớ' })).toHaveClass('study-toolbar-button')
  })

  it('disables repeat until automatic playback is enabled', async () => {
    await renderPage()

    const repeatButton = await screen.findByRole('button', { name: 'Lặp lại' })
    expect(repeatButton).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Bật tự động' }))
    const panel = screen.getByRole('dialog', { name: 'Giây/thẻ' })
    fireEvent.click(within(panel).getByRole('button', { name: 'Bật tự động' }))

    expect(repeatButton).toBeEnabled()
  })

  it('opens a floating auto timer panel from the clock icon', async () => {
    const user = userEvent.setup()
    await renderPage()

    expect(screen.queryByRole('dialog', { name: 'Giây/thẻ' })).not.toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: 'Bật tự động' }))

    const panel = await screen.findByRole('dialog', { name: 'Giây/thẻ' })
    expect(panel).toHaveClass('study-auto-settings-panel')
    expect(panel).toContainElement(within(panel).getByRole('spinbutton', { name: 'Giây/thẻ' }))
    expect(panel).toContainElement(within(panel).getByRole('button', { name: 'Bật tự động' }))
  })

  it('uses play and equal icons inside the auto timer panel', async () => {
    await renderPage()
    expect(await screen.findByText('produce')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Bật tự động' }))
    const panel = screen.getByRole('dialog', { name: 'Giây/thẻ' })
    const startButton = within(panel).getByRole('button', { name: 'Bật tự động' })
    expect(startButton.querySelector('.lucide-play')).toBeInTheDocument()

    fireEvent.click(startButton)
    fireEvent.click(screen.getByRole('button', { name: 'Tắt tự động' }))
    const activePanel = screen.getByRole('dialog', { name: 'Giây/thẻ' })
    const stopButton = within(activePanel).getByRole('button', { name: 'Tắt tự động' })
    expect(stopButton.querySelector('.lucide-equal')).toBeInTheDocument()
  })

  it('animates one-side card height from measured content', async () => {
    const scrollHeightSpy = vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(536)

    try {
      await renderPage()

      const frame = await screen.findByTestId('study-card-motion-frame')
      expect(frame).toHaveClass('study-card-motion-frame')
      await waitFor(() => expect(frame).toHaveStyle({ height: '536px' }))
    } finally {
      scrollHeightSpy.mockRestore()
    }
  })

  it('animates from the previous measured height when moving to another expanded card', async () => {
    let measuredHeight = 420
    let frameHeight = 420
    let nextAnimationFrame: FrameRequestCallback | null = null
    const scrollHeightSpy = vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(() => measuredHeight)
    const rectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
      x: 0,
      y: 0,
      width: 0,
      height: frameHeight,
      top: 0,
      right: 0,
      bottom: frameHeight,
      left: 0,
      toJSON: () => ({}),
    }))
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      nextAnimationFrame = callback
      return 1
    })
    const cancelRafSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)

    try {
      await renderPage([baseItem, makeItem('transfer', 'transfer', 'chuyển')])

      const frame = await screen.findByTestId('study-card-motion-frame')
      await waitFor(() => expect(frame).toHaveStyle({ height: '420px' }))

      measuredHeight = 640
      frameHeight = 420
      fireEvent.click(screen.getByRole('button', { name: 'Thẻ tiếp theo' }))

      expect(frame).toHaveStyle({ height: '420px' })
      expect(rafSpy).toHaveBeenCalled()
      expect(nextAnimationFrame).not.toBeNull()

      act(() => nextAnimationFrame?.(performance.now()))

      expect(frame).toHaveStyle({ height: '640px' })
    } finally {
      scrollHeightSpy.mockRestore()
      rectSpy.mockRestore()
      rafSpy.mockRestore()
      cancelRafSpy.mockRestore()
    }
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
    const { studyLocalDb } = await import('@/services/local/studyLocalDb')
    vi.mocked(studyLocalDb.getPendingStudyChanges).mockResolvedValue({
      actions: [],
      viewedTermIds: ['produce', 'transfer'],
      sessionId: 'deck-session',
      sessionPatch: {
        total_cards: 2,
        viewed_cards: 2,
        remembered_count: 1,
        difficult_count: 0,
      },
    })
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

    await waitFor(() => expect(studyService.flushStudyChanges).toHaveBeenCalledTimes(1))
    expect(studyService.flushStudyChanges).toHaveBeenCalledWith(expect.objectContaining({
      viewedTermIds: ['produce', 'transfer'],
    }))
    expect(studyService.applyReviewAction).not.toHaveBeenCalled()
  })

  it('confirms before ending an in-progress study session from the card', async () => {
    const user = userEvent.setup()
    const { studyService } = await import('@/services/supabase/study.service')
    const { studyLocalDb } = await import('@/services/local/studyLocalDb')
    vi.mocked(studyLocalDb.getPendingStudyChanges).mockResolvedValue({
      actions: [],
      viewedTermIds: ['produce'],
      sessionId: 'deck-session',
      sessionPatch: {
        total_cards: 2,
        viewed_cards: 1,
        remembered_count: 0,
        difficult_count: 0,
      },
    })
    await renderPage([baseItem, makeItem('transfer', 'transfer', 'chuyển')])

    expect(await screen.findByText('produce')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Kết thúc' }))

    expect(screen.getByText('Kết thúc phiên học?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tiếp tục học' }))
    expect(screen.queryByText('Kết thúc phiên học?')).not.toBeInTheDocument()
    expect(screen.getByText('produce')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Kết thúc' }))
    await user.click(screen.getByRole('button', { name: 'Kết thúc phiên' }))

    await waitFor(() => expect(studyService.flushStudyChanges).toHaveBeenCalledWith(expect.objectContaining({
      viewedTermIds: ['produce'],
    })))
    expect(await screen.findByText('Study setup reached')).toBeInTheDocument()
  })

  it('records the remote study summary before returning to setup', async () => {
    const user = userEvent.setup()
    const { studyService } = await import('@/services/supabase/study.service')
    const { studyLocalDb } = await import('@/services/local/studyLocalDb')
    vi.mocked(studyLocalDb.getPendingStudyChanges).mockResolvedValue({
      actions: [],
      viewedTermIds: ['produce'],
      sessionId: 'deck-session',
      sessionPatch: {
        total_cards: 2,
        viewed_cards: 2,
        remembered_count: 1,
        difficult_count: 0,
      },
    })
    await renderPage([baseItem, makeItem('transfer', 'transfer', 'chuyển')])

    await user.click(await screen.findByRole('button', { name: 'Nhớ' }))
    await user.click(await screen.findByRole('button', { name: 'Kết thúc' }))
    await user.click(screen.getByRole('button', { name: 'Kết thúc phiên' }))

    await waitFor(() => expect(studyService.flushStudyChanges).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: 'deck-session',
      sessionPatch: {
        total_cards: 2,
        viewed_cards: 2,
        remembered_count: 1,
        difficult_count: 0,
      },
    })))
    expect(studyService.pruneHistory).toHaveBeenCalledWith('user-1')
    expect(await screen.findByText('Study setup reached')).toBeInTheDocument()
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
    const user = userEvent.setup({ delay: null })
    await user.click(await screen.findByRole('button', { name: 'Bật tự động' }))
    const autoButton = screen.getByRole('dialog', { name: 'Giây/thẻ' }).querySelector('button[aria-label="Bật tự động"]') as HTMLButtonElement
    expect(autoButton).toBeInTheDocument()

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

  it('shows an auto-advance countdown on the card while automatic mode is enabled', async () => {
    await renderPage([baseItem, makeItem('transfer', 'transfer', 'chuyển')])
    expect(await screen.findByText('produce')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Bật tự động' }))
    const panel = screen.getByRole('dialog', { name: 'Giây/thẻ' })
    const autoButton = panel.querySelector('button[aria-label="Bật tự động"]') as HTMLButtonElement

    vi.useFakeTimers()
    try {
      fireEvent.click(autoButton)

      expect(screen.getByTestId('auto-countdown')).toHaveTextContent('6s')

      act(() => vi.advanceTimersByTime(1000))
      expect(screen.getByTestId('auto-countdown')).toHaveTextContent('5s')

      act(() => vi.advanceTimersByTime(5000))
      expect(screen.getByText('transfer')).toBeInTheDocument()
      expect(screen.getByTestId('auto-countdown')).toHaveTextContent('6s')

      fireEvent.click(screen.getByRole('button', { name: 'Tắt tự động' }))
      fireEvent.click(screen.getByRole('dialog', { name: 'Giây/thẻ' }).querySelector('button[aria-label="Tắt tự động"]') as HTMLButtonElement)
      expect(screen.queryByTestId('auto-countdown')).not.toBeInTheDocument()
    } finally {
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it('loops to the first card when automatic repeat is enabled', async () => {
    await renderPage([baseItem, makeItem('transfer', 'transfer', 'chuyển')])
    expect(await screen.findByText('produce')).toBeInTheDocument()
    const repeatButton = screen.getByRole('button', { name: 'Lặp lại' })
    fireEvent.click(screen.getByRole('button', { name: 'Bật tự động' }))
    const autoButton = screen.getByRole('dialog', { name: 'Giây/thẻ' }).querySelector('button[aria-label="Bật tự động"]') as HTMLButtonElement

    vi.useFakeTimers()
    try {
      fireEvent.click(autoButton)
      fireEvent.click(repeatButton)

      act(() => vi.advanceTimersByTime(6000))
      expect(screen.getByText('transfer')).toBeInTheDocument()

      act(() => vi.advanceTimersByTime(6000))
      expect(screen.getByText('produce')).toBeInTheDocument()
    } finally {
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })
})
