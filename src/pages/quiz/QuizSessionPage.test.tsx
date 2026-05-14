import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QuizSessionPage } from '@/pages/quiz/QuizSessionPage'
import { useAuthStore } from '@/stores/useAuthStore'
import { useQuizStore } from '@/stores/useQuizStore'
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

const baseItem: VocabularyItem = {
  id: 'apple',
  user_id: 'user-1',
  global_term_id: null,
  source_text: 'apple',
  normalized_text: 'apple',
  source_language: 'en',
  native_language: 'vi',
  item_type: 'word',
  part_of_speech: 'n',
  ipa: null,
  pronunciation_text: null,
  audio_url: null,
  image_url: null,
  note: null,
  meanings: [{ text: 'A fruit', language: 'en' }],
  translation: 'quả táo',
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

function makeItem(id: string, sourceText: string, meaning: string): VocabularyItem {
  return {
    ...baseItem,
    id,
    source_text: sourceText,
    normalized_text: sourceText,
    meanings: [{ text: meaning, language: 'en' }],
  }
}

function ResultProbe() {
  const location = useLocation()
  return <p>{location.search}</p>
}

async function renderPage(items: VocabularyItem[]) {
  const { deckService } = await import('@/services/supabase/deck.service')
  vi.mocked(deckService.listTerms).mockResolvedValue(items)

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app/quiz/session/deck-quiz']}>
        <Routes>
          <Route path="/app/quiz/session/:sessionId" element={<QuizSessionPage />} />
          <Route path="/app/quiz/result/:resultId" element={<ResultProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('QuizSessionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.clear()
    useAuthStore.setState({
      user: { id: 'user-1' } as never,
      profile: { native_language: 'vi', target_language: 'en', ui_language: 'vi' } as never,
    })
    useQuizStore.setState({
      quizType: 'true_false',
      questionCount: 2,
      selectedDeckId: 'deck-1',
    })
  })

  it('restores quiz position and score after leaving and returning to the session', async () => {
    const user = userEvent.setup()
    const apple = makeItem('apple', 'apple', 'A fruit')
    const banana = makeItem('banana', 'banana', 'A yellow fruit')

    const firstRender = await renderPage([apple, banana])
    expect(await screen.findByText('Câu 1')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Đúng' }))
    expect(await screen.findByText('Câu 2')).toBeInTheDocument()
    firstRender.unmount()

    await renderPage([banana, apple])

    expect(await screen.findByText('Câu 2')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sai' }))

    expect(await screen.findByText('?score=2&total=2')).toBeInTheDocument()
  })
})
