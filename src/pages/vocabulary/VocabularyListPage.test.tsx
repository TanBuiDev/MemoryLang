import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { demoVocabulary } from '@/features/demo/demoData'
import { VocabularyListPage } from '@/pages/vocabulary/VocabularyListPage'
import { deckService } from '@/services/supabase/deck.service'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 180,
    getVirtualItems: () => Array.from({ length: count }, (_, index) => ({ index, key: index, start: index * 180 })),
    measureElement: vi.fn(),
  }),
}))

vi.mock('@/services/supabase/client', () => ({ isSupabaseConfigured: true, supabase: {} }))
vi.mock('@/services/supabase/vocabulary.service', () => ({
  vocabularyService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), removeMany: vi.fn() },
}))
vi.mock('@/services/supabase/deck.service', () => ({
  deckService: { list: vi.fn(), createLessonBatch: vi.fn() },
}))
vi.mock('@/services/local/studyLocalDb', () => ({
  studyLocalDb: {
    getCachedVocabulary: vi.fn().mockResolvedValue([]),
    cacheVocabulary: vi.fn(),
    flushPendingMutations: vi.fn().mockResolvedValue(undefined),
  },
}))
vi.mock('@/hooks/useOnlineStatus', () => ({ useOnlineStatus: () => false }))
vi.mock('@/utils/audio', () => ({ speak: vi.fn() }))

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><VocabularyListPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

async function selectAllAndOpenLessonModal(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Chọn' }))
  await user.click(screen.getByRole('button', { name: 'Chọn tất cả' }))
  await user.click(screen.getByRole('button', { name: 'Tạo bài học' }))
}

describe('VocabularyListPage bulk lessons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      user: { id: 'user-1' } as never,
      profile: { current_target_language: 'en', native_language: 'vi' } as never,
    })
    vi.mocked(vocabularyService.list).mockResolvedValue(demoVocabulary.slice(0, 2))
    vi.mocked(deckService.list).mockResolvedValue([{ name: 'Bai hoc 04' }] as never)
  })

  it('projects generated lesson count from selected words and lesson size', async () => {
    const user = userEvent.setup()
    renderPage()

    await selectAllAndOpenLessonModal(user)
    await user.clear(screen.getByLabelText('Số từ mỗi bài'))
    await user.type(screen.getByLabelText('Số từ mỗi bài'), '1')

    expect(screen.getByText('Sẽ tạo 2 bài học')).toBeInTheDocument()
  })

  it('creates named lesson batches and offers the deck list from feedback', async () => {
    const user = userEvent.setup()
    vi.mocked(deckService.createLessonBatch).mockResolvedValue({
      createdDecks: [{ id: 'deck-5', name: 'Bai hoc 05' } as never],
      error: null,
    })
    renderPage()

    await selectAllAndOpenLessonModal(user)
    await user.click(screen.getByRole('button', { name: 'Xác nhận tạo bài' }))

    expect(deckService.createLessonBatch).toHaveBeenCalledWith(expect.objectContaining({
      base: expect.objectContaining({ user_id: 'user-1', source_language: 'en', native_language: 'vi' }),
      lessons: [expect.objectContaining({ name: 'Bai hoc 05' })],
    }))
    expect(await screen.findByRole('link', { name: 'Xem bộ thẻ' })).toHaveAttribute('href', '/app/decks')
    expect(screen.queryByRole('link', { name: 'Mở Bai hoc 05' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Đóng' }))
    expect(screen.queryByText('Đã tạo 1 bài học.')).not.toBeInTheDocument()
  })

  it('reports created lessons without claiming full success when persistence is partial', async () => {
    const user = userEvent.setup()
    vi.mocked(deckService.createLessonBatch).mockResolvedValue({
      createdDecks: [{ id: 'deck-5', name: 'Bai hoc 05' } as never],
      error: new Error('link failed'),
    })
    renderPage()

    await selectAllAndOpenLessonModal(user)
    await user.click(screen.getByRole('button', { name: 'Xác nhận tạo bài' }))

    expect(await screen.findByText('Đã tạo 1 bài học, nhưng lô tạo chưa hoàn tất.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Xem bộ thẻ' })).toHaveAttribute('href', '/app/decks')
  })

  it('reports failure and retains selection when no lesson can be created', async () => {
    const user = userEvent.setup()
    vi.mocked(deckService.createLessonBatch).mockResolvedValue({
      createdDecks: [],
      error: new Error('insert failed'),
    })
    renderPage()

    await selectAllAndOpenLessonModal(user)
    await user.click(screen.getByRole('button', { name: 'Xác nhận tạo bài' }))

    expect(await screen.findByText('Không thể tạo bài học. Vui lòng thử lại.')).toBeInTheDocument()
    expect(screen.getByText('Đã chọn 2')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Xem bộ thẻ' })).not.toBeInTheDocument()
  })

  it('clears previous lesson feedback when a later batch fails completely', async () => {
    const user = userEvent.setup()
    vi.mocked(deckService.createLessonBatch)
      .mockResolvedValueOnce({
        createdDecks: [{ id: 'deck-5', name: 'Bai hoc 05' } as never],
        error: null,
      })
      .mockResolvedValueOnce({
        createdDecks: [],
        error: new Error('insert failed'),
      })
    renderPage()

    await selectAllAndOpenLessonModal(user)
    await user.click(screen.getByRole('button', { name: 'Xác nhận tạo bài' }))
    expect(await screen.findByRole('link', { name: 'Xem bộ thẻ' })).toBeInTheDocument()

    await selectAllAndOpenLessonModal(user)
    await user.click(screen.getByRole('button', { name: 'Xác nhận tạo bài' }))

    expect(await screen.findByText('Không thể tạo bài học. Vui lòng thử lại.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Xem bộ thẻ' })).not.toBeInTheDocument()
  })
})
