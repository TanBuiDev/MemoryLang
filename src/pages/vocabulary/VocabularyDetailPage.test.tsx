import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
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
        'vocabulary.positionInputLabel': 'Vị trí từ vựng',
        'vocabulary.positionInputHint': 'Nhập vị trí từ 1 đến {total}',
        'vocabulary.positionInputError': 'Nhập số nguyên từ 1 đến {total}.',
        'vocabulary.positionPickerLabel': 'Chọn vị trí từ vựng',
        'vocabulary.positionPickerOption': 'Chuyển đến từ số {position}',
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
      profile: { is_admin: true } as never,
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
    expect(screen.getByLabelText('Vị trí từ vựng')).toHaveValue('1')
    expect(screen.getByText('/ 3')).toBeInTheDocument()

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
    expect(screen.getByLabelText('Vị trí từ vựng')).toHaveValue('2')
    expect(screen.getByText('/ 3')).toBeInTheDocument()

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

  it('hiển thị tooltip phím tắt của nút Tiếp theo sau khi hover chuột 1 giây', async () => {
    renderPage('/app/vocabulary/entry-1')

    expect(await screen.findByText('one')).toBeInTheDocument()

    // Bật fake timers sau khi render hoàn tất
    vi.useFakeTimers()

    // Tooltip hotkey "Alt + →" lúc đầu không hiển thị
    expect(screen.queryByText('Alt + →')).not.toBeInTheDocument()

    // Tìm trigger button là nút "Tiếp theo"
    const triggerBtn = screen.getByTitle('Thẻ tiếp theo')
    expect(triggerBtn).toBeInTheDocument()

    // Rê chuột vào trigger bằng fireEvent
    fireEvent.mouseEnter(triggerBtn)

    // Vẫn chưa hiển thị ngay (do có delay 1 giây)
    expect(screen.queryByText('Alt + →')).not.toBeInTheDocument()

    // Giả lập thời gian trôi qua 1 giây (1000ms)
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    // Tooltip hiển thị hotkey tương ứng
    expect(screen.getByText('Alt + →')).toBeInTheDocument()

    // Rê chuột ra ngoài bằng fireEvent
    fireEvent.mouseLeave(triggerBtn)

    // Tooltip biến mất ngay lập tức
    expect(screen.queryByText('Alt + →')).not.toBeInTheDocument()

    vi.useRealTimers()
  })

  it('cho phép nhập số thứ tự và nhấn Enter để chuyển nhanh đến từ đó', async () => {
    const user = userEvent.setup()
    const state = { vocabularyIds: ['entry-1', 'entry-2', 'entry-3'] }
    renderPage('/app/vocabulary/entry-1', state)

    expect(await screen.findByText('one')).toBeInTheDocument()

    // Tìm ô nhập vị trí trang
    const pageInput = screen.getByLabelText('Vị trí từ vựng')
    expect(pageInput).toBeInTheDocument()
    expect(pageInput).toHaveValue('1')

    // Xóa số 1 cũ và nhập số 3
    await user.clear(pageInput)
    await user.type(pageInput, '3')
    expect(pageInput).toHaveValue('3')

    // Nhấn Enter
    await user.keyboard('{Enter}')

    // Xác nhận đã gọi API lấy từ vựng thứ 3 (entry-3)
    expect(relationshipService.getCard).toHaveBeenCalledWith('entry-3')
  })

  it('xóa số hiện tại khi click lần đầu để có thể nhập vị trí mới ngay', async () => {
    const user = userEvent.setup()
    const state = { vocabularyIds: ['entry-1', 'entry-2', 'entry-3'] }
    renderPage('/app/vocabulary/entry-2', state)

    expect(await screen.findByText('two')).toBeInTheDocument()

    const pageInput = screen.getByLabelText('Vị trí từ vựng')
    await user.click(pageInput)
    expect(pageInput).toHaveValue('')
    await user.keyboard('3')

    expect(pageInput).toHaveValue('3')
  })

  it('đăng ký wheel listener không passive để ngăn cuộn cả trang', async () => {
    const addEventListenerSpy = vi.spyOn(EventTarget.prototype, 'addEventListener')

    try {
      const state = { vocabularyIds: ['entry-1', 'entry-2', 'entry-3'] }
      renderPage('/app/vocabulary/entry-1', state)

      expect(await screen.findByText('one')).toBeInTheDocument()
      expect(addEventListenerSpy.mock.calls).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([
            'wheel',
            expect.any(Function),
            expect.objectContaining({ passive: false }),
          ]),
        ])
      )
    } finally {
      addEventListenerSpy.mockRestore()
    }
  })

  it('hủy giá trị chưa xác nhận khi click ra ngoài thay vì tự điều hướng', async () => {
    const user = userEvent.setup()
    const state = { vocabularyIds: ['entry-1', 'entry-2', 'entry-3'] }
    renderPage('/app/vocabulary/entry-1', state)

    expect(await screen.findByText('one')).toBeInTheDocument()

    const pageInput = screen.getByLabelText('Vị trí từ vựng')
    await user.click(pageInput)
    await user.keyboard('3')
    await user.click(screen.getByText('one'))

    expect(pageInput).toHaveValue('1')
    expect(relationshipService.getCard).not.toHaveBeenCalledWith('entry-3')
  })

  it('giữ focus và hiển thị lỗi khi vị trí nhập không hợp lệ', async () => {
    const user = userEvent.setup()
    const state = { vocabularyIds: ['entry-1', 'entry-2', 'entry-3'] }
    renderPage('/app/vocabulary/entry-1', state)

    expect(await screen.findByText('one')).toBeInTheDocument()

    const pageInput = screen.getByLabelText('Vị trí từ vựng')
    await user.click(pageInput)
    await user.keyboard('4')
    await user.keyboard('{Enter}')

    expect(pageInput).toHaveFocus()
    expect(pageInput).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Nhập số nguyên từ 1 đến 3.')
  })

  it('dùng chính ô nhập làm dòng giữa của wheel picker mà không hiển thị số bị trùng', async () => {
    const user = userEvent.setup()
    const state = { vocabularyIds: ['entry-1', 'entry-2', 'entry-3', 'entry-4', 'entry-5'] }
    renderPage('/app/vocabulary/entry-2', state)

    expect(await screen.findByText('two')).toBeInTheDocument()

    await user.click(screen.getByLabelText('Vị trí từ vựng'))

    const picker = screen.getByRole('listbox', { name: 'Chọn vị trí từ vựng' })
    const slots = within(picker).getAllByTestId('position-picker-slot')
    expect(slots).toHaveLength(5)
    expect(picker).toHaveAttribute('data-layout', 'centered-on-input')
    expect(within(slots[2]).getByRole('option')).toBeEmptyDOMElement()
    expect(within(slots[2]).getByRole('option')).toHaveAttribute('aria-selected', 'true')
    expect(within(picker).queryByText('2')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Vị trí từ vựng')).toHaveValue('')
    expect(screen.getByTestId('vocabulary-action-toolbar')).toHaveClass('bottom-16')
  })

  it('cuộn chỉ thay đổi số xem trước rồi Enter mới chuyển từ', async () => {
    const user = userEvent.setup()
    const state = { vocabularyIds: ['entry-1', 'entry-2', 'entry-3', 'entry-4', 'entry-5'] }
    renderPage('/app/vocabulary/entry-2', state)

    expect(await screen.findByText('two')).toBeInTheDocument()

    const pageInput = screen.getByLabelText('Vị trí từ vựng')
    await user.click(pageInput)
    const entry3CallsBeforeWheel = vi.mocked(relationshipService.getCard).mock.calls.filter(([termId]) => termId === 'entry-3').length
    fireEvent.wheel(pageInput, { deltaY: 100 })

    expect(pageInput).toHaveValue('3')
    expect(vi.mocked(relationshipService.getCard).mock.calls.filter(([termId]) => termId === 'entry-3')).toHaveLength(entry3CallsBeforeWheel)

    await user.keyboard('{Enter}')
    expect(vi.mocked(relationshipService.getCard).mock.calls.filter(([termId]) => termId === 'entry-3')).toHaveLength(entry3CallsBeforeWheel + 1)
  })

  it('click một số bất kỳ trong 5 dòng sẽ chuyển ngay và đóng picker', async () => {
    const user = userEvent.setup()
    const state = { vocabularyIds: ['entry-1', 'entry-2', 'entry-3', 'entry-4', 'entry-5'] }
    renderPage('/app/vocabulary/entry-2', state)

    expect(await screen.findByText('two')).toBeInTheDocument()

    await user.click(screen.getByLabelText('Vị trí từ vựng'))
    await user.click(screen.getByRole('option', { name: 'Chuyển đến từ số 4' }))

    expect(relationshipService.getCard).toHaveBeenCalledWith('entry-4')
    expect(screen.queryByRole('listbox', { name: 'Chọn vị trí từ vựng' })).not.toBeInTheDocument()
  })

  it('dùng phím mũi tên để thay đổi số đang chọn mà không rời ô nhập', async () => {
    const user = userEvent.setup()
    const state = { vocabularyIds: ['entry-1', 'entry-2', 'entry-3', 'entry-4', 'entry-5'] }
    renderPage('/app/vocabulary/entry-2', state)

    expect(await screen.findByText('two')).toBeInTheDocument()

    const pageInput = screen.getByLabelText('Vị trí từ vựng')
    await user.click(pageInput)
    await user.keyboard('{ArrowDown}')

    expect(pageInput).toHaveValue('3')
    expect(pageInput).toHaveFocus()
    expect(screen.getByRole('option', { name: 'Chuyển đến từ số 3' })).toHaveAttribute('aria-selected', 'true')
  })

  it('click lại ô số giữa khi picker đang mở sẽ xác nhận vị trí xem trước', async () => {
    const user = userEvent.setup()
    const state = { vocabularyIds: ['entry-1', 'entry-2', 'entry-3', 'entry-4', 'entry-5'] }
    renderPage('/app/vocabulary/entry-2', state)

    expect(await screen.findByText('two')).toBeInTheDocument()

    const pageInput = screen.getByLabelText('Vị trí từ vựng')
    await user.click(pageInput)
    fireEvent.wheel(pageInput, { deltaY: 100 })
    const entry3CallsBeforeConfirm = vi.mocked(relationshipService.getCard).mock.calls.filter(([termId]) => termId === 'entry-3').length

    await user.click(pageInput)

    expect(vi.mocked(relationshipService.getCard).mock.calls.filter(([termId]) => termId === 'entry-3')).toHaveLength(entry3CallsBeforeConfirm + 1)
    expect(screen.queryByRole('listbox', { name: 'Chọn vị trí từ vựng' })).not.toBeInTheDocument()
  })

  it('điều hướng đến từ tiếp theo khi xóa từ hiện tại', async () => {
    const user = userEvent.setup()
    const deleteMock = vi.mocked(vocabularyService.remove).mockResolvedValue(undefined)
    const state = { vocabularyIds: ['entry-1', 'entry-2', 'entry-3'] }
    renderPage('/app/vocabulary/entry-2', state)

    expect(await screen.findByText('two')).toBeInTheDocument()

    // Click nút xóa
    const deleteBtn = screen.getByText('Xóa')
    await user.click(deleteBtn)

    // Xác nhận modal hiển thị và click nút xác nhận xóa
    const dialog = screen.getByRole('dialog')
    const confirmBtn = within(dialog).getByRole('button', { name: 'Xóa' })
    await user.click(confirmBtn)

    expect(deleteMock).toHaveBeenCalledWith('entry-2')
    // Sẽ chuyển hướng sang entry-3 (nextId)
    expect(relationshipService.getCard).toHaveBeenCalledWith('entry-3')
  })

  it('điều hướng về trang danh sách khi xóa từ cuối cùng duy nhất', async () => {
    const user = userEvent.setup()
    const deleteMock = vi.mocked(vocabularyService.remove).mockResolvedValue(undefined)
    const state = { vocabularyIds: ['entry-1'] }
    renderPage('/app/vocabulary/entry-1', state)

    expect(await screen.findByText('one')).toBeInTheDocument()

    // Click nút xóa
    const deleteBtn = screen.getByText('Xóa')
    await user.click(deleteBtn)

    // Xác nhận modal hiển thị và click nút xác nhận xóa
    const dialog = screen.getByRole('dialog')
    const confirmBtn = within(dialog).getByRole('button', { name: 'Xóa' })
    await user.click(confirmBtn)

    expect(deleteMock).toHaveBeenCalledWith('entry-1')
    // Sẽ quay về trang danh sách
    expect(await screen.findByText('Trang danh sách từ vựng')).toBeInTheDocument()
  })
})
