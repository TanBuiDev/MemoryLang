import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { demoVocabulary } from '@/features/demo/demoData'
import { VocabularyListPage } from '@/pages/vocabulary/VocabularyListPage'
import { deckService } from '@/services/supabase/deck.service'
import { vocabularyProposalService } from '@/services/supabase/vocabularyProposal.service'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { speak } from '@/utils/audio'

const toastMocks = vi.hoisted(() => ({ showToast: vi.fn() }))

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
vi.mock('@/services/supabase/vocabularyProposal.service', () => ({
  vocabularyProposalService: { submit: vi.fn() },
}))
vi.mock('@/components/ui/toast', () => ({ showToast: toastMocks.showToast }))
vi.mock('@/services/supabase/deck.service', () => ({
  deckService: {
    list: vi.fn(),
    createLessonBatch: vi.fn(),
    getDeckPath: vi.fn((deckId, decks) => decks?.find((d: any) => d.id === deckId)?.name || ''),
    getDeckedTermIds: vi.fn(),
    collectDescendantIds: vi.fn(() => []),
    listTerms: vi.fn(),
  },
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

function renderPage(initialEntry = '/app/vocabulary') {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[initialEntry]}><VocabularyListPage /></MemoryRouter>
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
    vi.mocked(deckService.getDeckedTermIds).mockResolvedValue(new Set())
    vi.mocked(deckService.listTerms).mockResolvedValue([])
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

describe('VocabularyListPage learner flows', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      user: { id: 'user-1' } as never,
      profile: { current_target_language: 'en', native_language: 'vi' } as never,
    })
    vi.mocked(deckService.list).mockResolvedValue([])
    vi.mocked(deckService.getDeckedTermIds).mockResolvedValue(new Set())
    vi.mocked(deckService.listTerms).mockResolvedValue([])
  })

  it('phát đúng ngôn ngữ của từ đang hiển thị', async () => {
    const user = userEvent.setup()
    vi.mocked(vocabularyService.list).mockResolvedValue([{
      ...demoVocabulary[0],
      source_text: 'bonjour',
      source_language: 'fr',
    }])

    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Phát âm bonjour' }))

    expect(speak).toHaveBeenCalledWith('bonjour', expect.objectContaining({ lang: 'fr' }))
  })

  it('lọc từ chưa có bộ thẻ bằng global_term_id thay vì user term id', async () => {
    const terms = demoVocabulary.slice(0, 2).map((term, index) => ({
      ...term,
      id: `user-term-${index + 1}`,
      global_term_id: `global-term-${index + 1}`,
    }))
    vi.mocked(vocabularyService.list).mockResolvedValue(terms)
    vi.mocked(deckService.getDeckedTermIds).mockResolvedValue(new Set(['global-term-1']))

    renderPage('/app/vocabulary?noDeck=1')

    expect(await screen.findByRole('link', { name: terms[1].source_text })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: terms[0].source_text })).not.toBeInTheDocument()
  })

  it('không mở hộp thêm từ khi Enter trên một từ đang tồn tại', async () => {
    const user = userEvent.setup()
    vi.mocked(vocabularyService.list).mockResolvedValue(demoVocabulary.slice(0, 2))
    renderPage()

    const search = await screen.findByRole('searchbox', { name: 'Tìm từ vựng' })
    await user.type(search, 'apple{Enter}')

    expect(screen.queryByText('Thêm Từ Vựng Mới')).not.toBeInTheDocument()
  })

  it('cho người học gửi một lượt đề xuất khi không tìm thấy từ', async () => {
    const user = userEvent.setup()
    vi.mocked(vocabularyService.list).mockResolvedValue([])
    vi.mocked(vocabularyProposalService.submit).mockResolvedValue({
      outcome: 'merged',
      proposal_id: 'proposal-1',
      vote_count: 3,
    })
    renderPage()

    const search = await screen.findByRole('searchbox', { name: 'Tìm từ vựng' })
    await user.type(search, 'take off')
    await user.click(await screen.findByRole('button', { name: 'Đề xuất từ này' }))

    expect(vocabularyProposalService.submit).toHaveBeenCalledWith({
      sourceText: 'take off',
      sourceLanguage: 'en',
      nativeLanguage: 'vi',
    })
    expect(toastMocks.showToast).toHaveBeenCalledWith(expect.objectContaining({
      type: 'success',
      title: 'Đã ghi nhận lượt đề xuất',
    }))
  })

  it('tìm theo bản dịch, nghĩa và thẻ', async () => {
    const user = userEvent.setup()
    vi.mocked(vocabularyService.list).mockResolvedValue(demoVocabulary)
    renderPage()

    const search = await screen.findByRole('searchbox', { name: 'Tìm từ vựng' })
    await user.type(search, 'quả táo')
    expect(await screen.findByRole('link', { name: 'apple' })).toBeInTheDocument()

    await user.clear(search)
    await user.type(search, 'reducing')
    expect(await screen.findByRole('link', { name: 'break the ice' })).toBeInTheDocument()

    await user.clear(search)
    await user.type(search, 'business')
    expect(await screen.findByRole('link', { name: 'I am looking forward to hearing from you.' })).toBeInTheDocument()
  })

  it('hiển thị trạng thái rỗng và nút xóa bộ lọc khi bộ lọc không có kết quả', async () => {
    vi.mocked(vocabularyService.list).mockResolvedValue(demoVocabulary.slice(0, 1))
    renderPage('/app/vocabulary?statuses=memorized')

    expect(await screen.findByText('Không có từ phù hợp')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Xóa bộ lọc' })).toBeInTheDocument()
  })

  it('đưa các từ chưa lên lịch xuống cuối khi sắp xếp theo lịch ôn', async () => {
    vi.mocked(vocabularyService.list).mockResolvedValue(demoVocabulary)
    renderPage('/app/vocabulary?sort=next_review')

    const scheduled = await screen.findByRole('link', { name: 'apple' })
    const unscheduled = screen.getByRole('link', { name: 'I am looking forward to hearing from you.' })
    expect(scheduled.compareDocumentPosition(unscheduled) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('có lối tắt lọc từ khó và hiển thị số từ cần ôn', async () => {
    const user = userEvent.setup()
    vi.mocked(vocabularyService.list).mockResolvedValue(demoVocabulary)
    renderPage()

    expect(await screen.findByRole('link', { name: 'Ôn ngay · 1' })).toHaveAttribute('href', '/app/review')
    await user.click(screen.getByRole('button', { name: 'Từ khó' }))

    expect(screen.getByRole('link', { name: 'break the ice' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'apple' })).not.toBeInTheDocument()
  })

  it('hiển thị đầy đủ bộ lọc gắn cờ đang hoạt động', async () => {
    vi.mocked(vocabularyService.list).mockResolvedValue([{ ...demoVocabulary[0], flagged: true }])
    renderPage('/app/vocabulary?flagged=1')

    expect((await screen.findAllByText('Đã gắn cờ')).length).toBeGreaterThanOrEqual(2)
  })

  it('cung cấp ngữ nghĩa truy cập cho menu sắp xếp', async () => {
    const user = userEvent.setup()
    vi.mocked(vocabularyService.list).mockResolvedValue(demoVocabulary.slice(0, 1))
    renderPage()

    const trigger = await screen.findByRole('button', { name: 'Sắp xếp từ vựng' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await user.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('listbox', { name: 'Sắp xếp từ vựng' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Sắp xếp theo mới nhất' })).toHaveAttribute('aria-selected', 'true')
  })

  it('báo lỗi khi không tải được dữ liệu phụ của bộ lọc', async () => {
    vi.mocked(vocabularyService.list).mockResolvedValue(demoVocabulary)
    vi.mocked(deckService.getDeckedTermIds).mockRejectedValue(new Error('network'))
    renderPage('/app/vocabulary?noDeck=1')

    expect(await screen.findByRole('alert')).toHaveTextContent('Không thể tải dữ liệu bộ lọc')
  })

  it('dùng cuộn của trang trên màn hình di động thay vì vùng cuộn lồng nhau', async () => {
    const previousWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 })
    vi.mocked(vocabularyService.list).mockResolvedValue(demoVocabulary.slice(0, 2))

    try {
      renderPage()
      expect(await screen.findByTestId('mobile-vocabulary-list')).toBeInTheDocument()
      expect(screen.queryByTestId('virtualized-vocabulary-list')).not.toBeInTheDocument()
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: previousWidth })
    }
  })
})
