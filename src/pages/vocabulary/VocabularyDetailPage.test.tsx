import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { VocabularyDetailPage } from '@/pages/vocabulary/VocabularyDetailPage'
import { relationshipService } from '@/services/supabase/relationship.service'
import { vocabularyService } from '@/services/supabase/vocabulary.service'
import { useAuthStore } from '@/stores/useAuthStore'

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

// Mock useI18n để kiểm thử độc lập ngôn ngữ giao diện
vi.mock('@/i18n', () => ({
  useI18n: () => ({
    language: 'vi',
    t: (key: string) => {
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
      }
      return map[key] || key
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
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('VocabularyDetailPage Navigation Buttons', () => {
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
})
