import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { demoVocabulary } from '@/features/demo/demoData'
import { buildStudySessionStorageKey } from '@/features/study/sessionPersistence'
import { StudySetupPage } from '@/pages/study/StudySetupPage'
import { useAuthStore } from '@/stores/useAuthStore'
import { useQuizStore } from '@/stores/useQuizStore'
import { useStudyStore } from '@/stores/useStudyStore'
import type { StudySession } from '@/types/study.types'

vi.mock('@/services/supabase/client', () => ({
  isSupabaseConfigured: true,
  supabase: {},
}))

vi.mock('@/services/supabase/deck.service', () => ({
  deckService: {
    list: vi.fn(),
    listTerms: vi.fn(),
    getDeckPath: vi.fn((deckId, decks) => decks?.find((d: any) => d.id === deckId)?.name || ''),
  },
}))

vi.mock('@/services/supabase/study.service', () => ({
  studyService: {
    createSession: vi.fn(),
    listRecentSessions: vi.fn(),
    deleteSession: vi.fn(),
    clearHistory: vi.fn(),
  },
}))

vi.mock('@/services/supabase/vocabulary.service', () => ({
  vocabularyService: {
    list: vi.fn(),
  },
}))

vi.mock('@/services/local/studySync.service', () => ({
  studySyncService: {
    flushPendingStudyChanges: vi.fn(),
  },
}))

function renderPage(initialEntry: string | { pathname: string; state?: unknown } = '/app/study') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/app/study" element={<StudySetupPage />} />
          <Route path="/app/quiz" element={<div>Quiz setup reached</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('StudySetupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.clear()
    useAuthStore.setState({ user: null, profile: null })
    useStudyStore.setState({ mode: 'one_side', cardLimit: 20, shuffle: false, selectedDeckId: null })
    useQuizStore.setState({ selectedDeckId: null })
  })

  it('allows starting a study session from all vocabulary by default', () => {
    renderPage()

    const deckSelect = screen.getAllByRole('combobox')[0] as HTMLSelectElement

    expect(screen.getByRole('option', { name: 'Tất cả từ vựng' })).toBeInTheDocument()
    expect(deckSelect.value).toBe('')
    expect(screen.getByRole('button', { name: 'Bắt đầu buổi học' })).toBeEnabled()
  })

  it('allows studying every card in the selected source', () => {
    renderPage()

    const cardLimitSelect = screen.getAllByRole('combobox')[2] as HTMLSelectElement

    expect(screen.getByRole('option', { name: 'Tất cả' })).toBeInTheDocument()
    expect(cardLimitSelect).toHaveValue('20')
  })

  it('configures required remember confirmation and its separate timer', async () => {
    const user = userEvent.setup()
    renderPage()

    const confirmation = screen.getByRole('checkbox', { name: 'Xác nhận Đã nhớ trước khi chuyển thẻ' })
    expect(confirmation).not.toBeChecked()
    expect(screen.queryByRole('combobox', { name: 'Thời gian xác nhận' })).not.toBeInTheDocument()

    await user.click(confirmation)

    const seconds = screen.getByRole('combobox', { name: 'Thời gian xác nhận' })
    expect(seconds).toHaveValue('2')
    await user.selectOptions(seconds, '3')

    expect(useStudyStore.getState().requireRememberConfirmation).toBe(true)
    expect(useStudyStore.getState().rememberConfirmationSeconds).toBe(3)
  })

  it('clears the stored deck session when starting a fresh session', async () => {
    const user = userEvent.setup()
    const storageKey = buildStudySessionStorageKey({
      userId: null,
      sessionId: 'deck-session',
      selectedDeckId: null,
      mode: 'one_side',
      cardLimit: 20,
      shuffle: false,
      remote: false,
    })
    window.sessionStorage.setItem(storageKey, 'stored-session')

    renderPage()
    await user.click(screen.getByRole('button', { name: 'Bắt đầu buổi học' }))

    expect(window.sessionStorage.getItem(storageKey)).toBeNull()
  })

  it('flushes pending local study changes before starting a remote session', async () => {
    const user = userEvent.setup()
    const { deckService } = await import('@/services/supabase/deck.service')
    const { studyService } = await import('@/services/supabase/study.service')
    const { studySyncService } = await import('@/services/local/studySync.service')
    useAuthStore.setState({ user: { id: 'user-1' } as never, profile: null })
    vi.mocked(deckService.list).mockResolvedValue([])
    vi.mocked(studyService.listRecentSessions).mockResolvedValue([])
    vi.mocked(studyService.createSession).mockResolvedValue({
      id: 'session-1',
      user_id: 'user-1',
      deck_id: null,
      mode: 'one_side',
      total_cards: 20,
      viewed_cards: 0,
      remembered_count: 0,
      difficult_count: 0,
      started_at: '2026-05-22T08:00:00.000Z',
      ended_at: null,
    })

    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Bắt đầu buổi học' }))

    expect(studySyncService.flushPendingStudyChanges).toHaveBeenCalledWith('user-1')
  })

  it('renders study history from Supabase for signed-in users', async () => {
    const { deckService } = await import('@/services/supabase/deck.service')
    const { studyService } = await import('@/services/supabase/study.service')
    useAuthStore.setState({ user: { id: 'user-1' } as never, profile: null })
    vi.mocked(deckService.list).mockResolvedValue([])
    vi.mocked(studyService.listRecentSessions).mockResolvedValue([
      {
        id: 'session-1',
        user_id: 'user-1',
        deck_id: null,
        mode: 'one_side',
        total_cards: 20,
        viewed_cards: 12,
        remembered_count: 8,
        difficult_count: 4,
        started_at: '2026-05-22T08:00:00.000Z',
        ended_at: '2026-05-22T08:12:00.000Z',
      } satisfies StudySession,
    ])

    renderPage()

    expect(await screen.findByText('Lịch sử học gần đây')).toBeInTheDocument()
    expect(await screen.findByText('12 / 20 thẻ')).toBeInTheDocument()
    expect(await screen.findByText('8 nhớ')).toBeInTheDocument()
    expect(await screen.findByText('4 không nhớ')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Xóa lịch sử' })).toBeInTheDocument()
  })

  it('shows a review queue forecast for signed-in users', async () => {
    const { deckService } = await import('@/services/supabase/deck.service')
    const { studyService } = await import('@/services/supabase/study.service')
    const { vocabularyService } = await import('@/services/supabase/vocabulary.service')
    useAuthStore.setState({ user: { id: 'user-1' } as never, profile: null })
    vi.mocked(deckService.list).mockResolvedValue([])
    vi.mocked(studyService.listRecentSessions).mockResolvedValue([])
    vi.mocked(vocabularyService.list).mockResolvedValue([
      {
        id: 'due-1',
        status: 'learning',
        wrong_count: 0,
        next_review_at: '2026-05-21T08:00:00.000Z',
      },
      {
        id: 'new-1',
        status: 'new',
        wrong_count: 0,
        next_review_at: null,
      },
      {
        id: 'hard-1',
        status: 'difficult',
        wrong_count: 3,
        next_review_at: '2027-05-23T08:00:00.000Z',
      },
    ] as never)

    renderPage()

    expect(await screen.findByText('Hàng đợi ôn hôm nay')).toBeInTheDocument()
    expect(await screen.findByText('1 đến hạn')).toBeInTheDocument()
    expect(screen.getByText('1 từ mới')).toBeInTheDocument()
    expect(screen.getByText('1 từ khó')).toBeInTheDocument()
    expect(screen.getByText('~2 phút')).toBeInTheDocument()
    expect(screen.getByText('Ưu tiên 1 thẻ đến hạn trước khi học thêm từ mới.')).toBeInTheDocument()
  })

  it('deletes a history session from the study page', async () => {
    const user = userEvent.setup()
    const { deckService } = await import('@/services/supabase/deck.service')
    const { studyService } = await import('@/services/supabase/study.service')
    useAuthStore.setState({ user: { id: 'user-1' } as never, profile: null })
    vi.mocked(deckService.list).mockResolvedValue([])
    vi.mocked(studyService.listRecentSessions).mockResolvedValue([
      {
        id: 'session-1',
        user_id: 'user-1',
        deck_id: null,
        mode: 'one_side',
        total_cards: 20,
        viewed_cards: 12,
        remembered_count: 8,
        difficult_count: 4,
        started_at: '2026-05-22T08:00:00.000Z',
        ended_at: '2026-05-22T08:12:00.000Z',
      } satisfies StudySession,
    ])

    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Xóa phiên học' }))

    expect(studyService.deleteSession).toHaveBeenCalledWith('session-1')
  })

  it('offers a quiz for the just-completed deck when it has translated terms', async () => {
    const user = userEvent.setup()
    const { deckService } = await import('@/services/supabase/deck.service')
    const { studyService } = await import('@/services/supabase/study.service')
    vi.mocked(deckService.list).mockResolvedValue([])
    vi.mocked(deckService.listTerms).mockResolvedValue([{ ...demoVocabulary[0]!, translation: 'qua tao' }])
    vi.mocked(studyService.listRecentSessions).mockResolvedValue([])
    useAuthStore.setState({ user: { id: 'user-1' } as never, profile: null })

    renderPage({ pathname: '/app/study', state: { completedDeckId: 'deck-1' } })
    await user.click(await screen.findByRole('button', { name: 'Kiểm tra bài này' }))

    expect(useQuizStore.getState().selectedDeckId).toBe('deck-1')
    expect(await screen.findByText('Quiz setup reached')).toBeInTheDocument()
  })

  it('explains why a completed deck cannot be tested when no translations exist', async () => {
    const { deckService } = await import('@/services/supabase/deck.service')
    const { studyService } = await import('@/services/supabase/study.service')
    vi.mocked(deckService.list).mockResolvedValue([])
    vi.mocked(deckService.listTerms).mockResolvedValue([{ ...demoVocabulary[0]!, translation: null }])
    vi.mocked(studyService.listRecentSessions).mockResolvedValue([])
    useAuthStore.setState({ user: { id: 'user-1' } as never, profile: null })

    renderPage({ pathname: '/app/study', state: { completedDeckId: 'deck-1' } })

    expect(await screen.findByText('Bổ sung bản dịch trước khi kiểm tra bài này.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Kiểm tra bài này' })).toBeDisabled()
  })

  it('allows retrying completed-deck quiz availability after loading fails', async () => {
    const user = userEvent.setup()
    const { deckService } = await import('@/services/supabase/deck.service')
    const { studyService } = await import('@/services/supabase/study.service')
    vi.mocked(deckService.list).mockResolvedValue([])
    vi.mocked(deckService.listTerms)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce([{ ...demoVocabulary[0]!, translation: 'qua tao' }])
    vi.mocked(studyService.listRecentSessions).mockResolvedValue([])
    useAuthStore.setState({ user: { id: 'user-1' } as never, profile: null })

    renderPage({ pathname: '/app/study', state: { completedDeckId: 'deck-1' } })
    expect(await screen.findByText('Không kiểm tra được dữ liệu bài. Hãy tải lại và thử lại.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Thử lại' }))

    expect(await screen.findByRole('button', { name: 'Kiểm tra bài này' })).toBeEnabled()
  })
})
