import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import MatchingGamePage from '@/pages/games/MatchingGamePage'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'
import type { VocabularyItem } from '@/types/vocabulary.types'
import { deckService } from '@/services/supabase/deck.service'

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

const testItems: VocabularyItem[] = [
  { id: '1', user_id: 'user-1', source_text: 'apple', translation: 'quả táo', status: 'new', created_at: '', updated_at: '' } as any,
  { id: '2', user_id: 'user-1', source_text: 'banana', translation: 'quả chuối', status: 'new', created_at: '', updated_at: '' } as any,
  { id: '3', user_id: 'user-1', source_text: 'cat', translation: 'con mèo', status: 'new', created_at: '', updated_at: '' } as any,
  { id: '4', user_id: 'user-1', source_text: 'dog', translation: 'con chó', status: 'new', created_at: '', updated_at: '' } as any,
  { id: '5', user_id: 'user-1', source_text: 'elephant', translation: 'con voi', status: 'new', created_at: '', updated_at: '' } as any,
]

function ResultProbe() {
  const location = useLocation()
  return <p data-testid="location-probe">{location.pathname}</p>
}

function renderPage(items: VocabularyItem[], delay = 0) {
  if (delay > 0) {
    vi.mocked(deckService.listTerms).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(items), delay))
    )
  } else {
    vi.mocked(deckService.listTerms).mockResolvedValue(items)
  }

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app/games/matching?source=deck-123&count=5']}>
        <Routes>
          <Route path="/app/games/matching" element={<MatchingGamePage />} />
          <Route path="/app/games" element={<ResultProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('MatchingGamePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({
      user: { id: 'user-1' } as any,
      profile: { display_name: 'Test User' } as any,
    })
    useSubscriptionStore.setState({
      isPro: false,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders loading initially and then shows matching cards', async () => {
    renderPage(testItems, 50)

    expect(screen.getByText(/Đang tải bộ từ vựng.../i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('NỐI TỪ & CỦNG CỐ PHẢN XẠ')).toBeInTheDocument()
    })

    // Check if vocabulary words exist in the document
    expect(screen.getByText('apple')).toBeInTheDocument()
    expect(screen.getByText('banana')).toBeInTheDocument()
    expect(screen.getByText('quả táo')).toBeInTheDocument()
    expect(screen.getByText('quả chuối')).toBeInTheDocument()
  })

  it('enables check results button only after all matching slots are active', async () => {
    renderPage(testItems)

    await waitFor(() => {
      expect(screen.getByText('NỐI TỪ & CỦNG CỐ PHẢN XẠ')).toBeInTheDocument()
    })

    const checkBtn = screen.getByRole('button', { name: /Kiểm tra kết quả/i })
    expect(checkBtn).toBeDisabled()

    // Match each card: Left index i with Right index i
    for (let i = 0; i < 5; i++) {
      fireEvent.click(screen.getByText(testItems[i].source_text))
      fireEvent.click(screen.getByText(testItems[i].translation))
    }

    expect(checkBtn).toBeEnabled()
  })
})
