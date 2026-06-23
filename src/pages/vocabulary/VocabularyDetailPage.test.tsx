import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VocabularyDetailPage } from '@/pages/vocabulary/VocabularyDetailPage'
import { relationshipService } from '@/services/supabase/relationship.service'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { speak } from '@/utils/audio'

// Mock các module bên ngoài và service để phục vụ kiểm thử
vi.mock('@/services/supabase/client', () => ({ isSupabaseConfigured: true, supabase: {} }))
vi.mock('@/services/supabase/relationship.service', () => ({
  relationshipService: {
    getCard: vi.fn(),
    createAuto: vi.fn(),
    removeAuto: vi.fn(),
  },
  createEmptyRelationshipGroups: () => ({
    synonym: [],
    antonym: [],
    noun: [],
    verb: [],
    adjective: [],
    adverb: [],
  }),
}))
vi.mock('@/services/supabase/vocabulary.service', () => ({
  vocabularyService: {
    list: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    flagTerm: vi.fn(),
    unflagTerm: vi.fn(),
  },
}))
vi.mock('@/services/local/studyLocalDb', () => ({
  studyLocalDb: {
    getCachedVocabulary: vi.fn().mockResolvedValue([]),
    cacheVocabulary: vi.fn(),
    enqueueMutation: vi.fn(),
  },
}))
vi.mock('@/utils/audio', () => ({ speak: vi.fn() }))

vi.mock('@/i18n', () => ({
  useI18n: () => ({
    language: 'vi',
    t: (key: string, params?: Record<string, string | number>) => {
      const map: Record<string, string> = {
        'study.previousCard': 'Thẻ trước',
        'study.nextCard': 'Thẻ tiếp theo',
        'vocabulary.word': 'Từ',
        'vocabulary.statusNew': 'Mới',
        'vocabulary.partOfSpeech': 'Từ loại',
        'vocabulary.ipa': 'IPA',
        'vocabulary.meaning': 'Nghĩa',
        'vocabulary.translation': 'Bản dịch',
        'vocabulary.tags': 'Thẻ',
        'vocabulary.examples': 'Ví dụ',
        'vocabulary.note': 'Ghi chú',
        'vocabulary.delete': 'Xóa',
        'vocabulary.deleteConfirmSingle': 'Xóa "{word}"?',
        'settings.studyHotkeys': 'Phím tắt',
        'vocabulary.audio': 'Âm thanh',
      }
      let template = map[key] || key
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          template = template.replace(`{${k}}`, String(v))
        })
      }
      return template
    },
  }),
}))

// Hàm helper để render component trong môi trường định tuyến và react-query
function renderPage(initialEntry = '/app/vocabulary/entry-1', state: any = null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[{ pathname: initialEntry, state }]}>
        <Routes>
          <Route path="/app/vocabulary/:id" element={<VocabularyDetailPage />} />
          <Route path="/app/vocabulary" element={<div>Trang danh sách từ vựng</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('VocabularyDetailPage Navigation Buttons & Hotkeys', () => {
  const mockTerms = [
    { id: 'entry-1', source_text: 'one', item_type: 'word', meanings: [], examples: [], tags: [] },
    { id: 'entry-2', source_text: 'two', item_type: 'word', meanings: [], examples: [], tags: [] },
    { id: 'entry-3', source_text: 'three', item_type: 'word', meanings: [], examples: [], tags: [] },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      user: { id: 'user-1' } as never,
    })

    // Mock kết quả trả về của các API service
    vi.mocked(vocabularyService.list).mockResolvedValue(mockTerms as any)
    vi.mocked(relationshipService.getCard).mockImplementation(async (id) => {
      const entry = mockTerms.find((t) => t.id === id) || mockTerms[0]
      return {
        entry: entry as any,
        relationships: {
          synonym: [],
          antonym: [],
          noun: [],
          verb: [],
          adjective: [],
          adverb: [],
        },
      }
    })
  })

  it('hiển thị đúng vị trí hiện tại và vô hiệu hóa nút Lùi lại khi ở từ đầu tiên', async () => {
    const state = { vocabularyIds: ['entry-1', 'entry-2', 'entry-3'] }
    renderPage('/app/vocabulary/entry-1', state)

    // Xác nhận từ vựng được tải và hiển thị
    expect(await screen.findByText('one')).toBeInTheDocument()

    // Xác nhận chỉ số vị trí hiển thị đúng
    expect(screen.getByText('1 / 3')).toBeInTheDocument()

    // Nút Lùi lại (quay lại) phải bị vô hiệu hóa
    const prevButton = screen.getByTitle('Thẻ trước')
    expect(prevButton).toBeDisabled()

    // Nút Tiếp theo phải hoạt động bình thường
    const nextButton = screen.getByTitle('Thẻ tiếp theo')
    expect(nextButton).not.toBeDisabled()
  })

  it('cho phép chuyển sang từ tiếp theo khi click nút điều hướng', async () => {
    const user = userEvent.setup()
    const state = { vocabularyIds: ['entry-1', 'entry-2', 'entry-3'] }
    renderPage('/app/vocabulary/entry-1', state)

    // Xác nhận nút tiếp theo hoạt động và click
    const nextButton = await screen.findByTitle('Thẻ tiếp theo')
    await user.click(nextButton)

    // Xác nhận đã đổi id và gọi API chi tiết của từ tiếp theo
    expect(relationshipService.getCard).toHaveBeenCalledWith('entry-2')
  })

  it('tự động dùng danh sách dự phòng (fallback) khi không có state truyền từ trang danh sách', async () => {
    // Không truyền state qua location
    renderPage('/app/vocabulary/entry-2')

    // Xác nhận từ vựng được tải và hiển thị
    expect(await screen.findByText('two')).toBeInTheDocument()

    // Chỉ số vị trí hiển thị đúng (dựa trên danh sách fallback lấy từ mockTerms: entry-1, entry-2, entry-3)
    expect(screen.getByText('2 / 3')).toBeInTheDocument()

    // Cả hai nút điều hướng Lùi lại và Tiếp theo đều không bị vô hiệu hóa ở vị trí số 2
    expect(screen.getByTitle('Thẻ trước')).not.toBeDisabled()
    expect(screen.getByTitle('Thẻ tiếp theo')).not.toBeDisabled()
  })

  it('chuyển sang từ tiếp theo khi nhấn tổ hợp phím Alt + ArrowRight', async () => {
    const state = { vocabularyIds: ['entry-1', 'entry-2', 'entry-3'] }
    renderPage('/app/vocabulary/entry-1', state)

    expect(await screen.findByText('one')).toBeInTheDocument()

    // Nhấn Alt + ArrowRight
    fireEvent.keyDown(window, { key: 'ArrowRight', altKey: true })

    // Xác nhận đã điều hướng sang từ tiếp theo
    expect(relationshipService.getCard).toHaveBeenCalledWith('entry-2')
  })

  it('chuyển sang từ tiếp theo khi nhấn phím ArrowRight đơn lẻ ngoài ô nhập liệu', async () => {
    const state = { vocabularyIds: ['entry-1', 'entry-2', 'entry-3'] }
    renderPage('/app/vocabulary/entry-1', state)

    expect(await screen.findByText('one')).toBeInTheDocument()

    // Nhấn ArrowRight đơn lẻ
    fireEvent.keyDown(window, { key: 'ArrowRight' })

    expect(relationshipService.getCard).toHaveBeenCalledWith('entry-2')
  })

  it('phát âm thanh của từ hiện tại khi nhấn tổ hợp phím Alt + P', async () => {
    const speakMock = vi.mocked(speak)
    renderPage('/app/vocabulary/entry-1')

    expect(await screen.findByText('one')).toBeInTheDocument()

    // Nhấn Alt + P
    fireEvent.keyDown(window, { key: 'p', altKey: true })

    expect(speakMock).toHaveBeenCalledWith('one', expect.any(Object))
  })

  it('gắn cờ từ vựng khi nhấn Alt + F', async () => {
    const flagMock = vi.mocked(vocabularyService.flagTerm).mockResolvedValue(undefined)
    renderPage('/app/vocabulary/entry-1')

    expect(await screen.findByText('one')).toBeInTheDocument()

    // Nhấn Alt + F
    fireEvent.keyDown(window, { key: 'f', altKey: true })

    expect(flagMock).toHaveBeenCalledWith('entry-1')
  })

  it('mở modal xác nhận xóa từ vựng khi nhấn Alt + D', async () => {
    renderPage('/app/vocabulary/entry-1')

    expect(await screen.findByText('one')).toBeInTheDocument()

    // Modal xóa chưa hiển thị
    expect(screen.queryByText('Xóa "one"?')).not.toBeInTheDocument()

    // Nhấn Alt + D
    fireEvent.keyDown(window, { key: 'd', altKey: true })

    // Modal đã hiển thị
    expect(screen.getByText('Xóa "one"?')).toBeInTheDocument()
  })

  it('quay lại trang danh sách từ vựng khi nhấn phím Escape', async () => {
    renderPage('/app/vocabulary/entry-1')

    expect(await screen.findByText('one')).toBeInTheDocument()

    // Nhấn phím Escape
    fireEvent.keyDown(window, { key: 'Escape' })

    // Xác nhận đã chuyển trang quay về danh sách
    expect(await screen.findByText('Trang danh sách từ vựng')).toBeInTheDocument()
  })

  it('hiển thị tooltip phím tắt sau khi hover chuột vào nút trigger 1 giây', async () => {
    renderPage('/app/vocabulary/entry-1')

    expect(await screen.findByText('one')).toBeInTheDocument()

    // Bật fake timers sau khi render hoàn tất
    vi.useFakeTimers()

    // Tooltip lúc đầu không hiển thị
    expect(screen.queryByText(/phím tắt/i)).not.toBeInTheDocument()

    // Tìm trigger button bằng aria-label
    const triggerBtn = screen.getByLabelText(/phím tắt/i)
    expect(triggerBtn).toBeInTheDocument()

    // Rê chuột vào trigger bằng fireEvent
    fireEvent.mouseEnter(triggerBtn)

    // Tooltip vẫn chưa hiển thị ngay (do có delay 1 giây)
    expect(screen.queryByText(/phím tắt/i)).not.toBeInTheDocument()

    // Giả lập thời gian trôi qua 1 giây (1000ms)
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    // Tooltip hiển thị
    expect(screen.getByText(/phím tắt/i)).toBeInTheDocument()
    expect(screen.getByText('Thẻ trước')).toBeInTheDocument()

    // Rê chuột ra ngoài bằng fireEvent
    fireEvent.mouseLeave(triggerBtn)

    // Tooltip biến mất ngay lập tức
    expect(screen.queryByText(/phím tắt/i)).not.toBeInTheDocument()

    vi.useRealTimers()
  })
})
