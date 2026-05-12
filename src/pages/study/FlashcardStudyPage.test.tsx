import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
  },
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

async function renderPage() {
  const { deckService } = await import('@/services/supabase/deck.service')
  const { relationshipService, createEmptyRelationshipGroups } = await import('@/services/supabase/relationship.service')
  vi.mocked(deckService.listTerms).mockResolvedValue([baseItem])
  vi.mocked(relationshipService.getCard).mockResolvedValue({
    entry: baseItem,
    relationships: {
      ...createEmptyRelationshipGroups(),
      derivative: [
        relatedTerm('product', 'product', 'sản phẩm'),
        relatedTerm('production', 'production', 'việc sản xuất'),
      ],
    },
  })

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app/study/session/deck-session']}>
        <Routes>
          <Route path="/app/study/session/:sessionId" element={<FlashcardStudyPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('FlashcardStudyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
})
