import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildStudySessionStorageKey } from '@/features/study/sessionPersistence'
import { StudySetupPage } from '@/pages/study/StudySetupPage'
import { useAuthStore } from '@/stores/useAuthStore'
import { useStudyStore } from '@/stores/useStudyStore'
import type { StudySession } from '@/types/study.types'

vi.mock('@/services/supabase/client', () => ({
  isSupabaseConfigured: true,
  supabase: {},
}))

vi.mock('@/services/supabase/deck.service', () => ({
  deckService: {
    list: vi.fn(),
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

vi.mock('@/services/local/studySync.service', () => ({
  studySyncService: {
    flushPendingStudyChanges: vi.fn(),
  },
}))

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <StudySetupPage />
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
})
