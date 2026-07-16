import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import GrammarLessonPage from './GrammarLessonPage'
import { grammarService } from '@/services/supabase/grammar.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'

vi.mock('@/services/supabase/client', () => ({ isSupabaseConfigured: true, supabase: {} }))
vi.mock('@/services/supabase/grammar.service', () => ({
  grammarService: {
    getTopic: vi.fn(),
    getBlocks: vi.fn(),
    incrementViewCount: vi.fn(),
  },
}))
vi.mock('@/components/grammar/BlockRenderer', () => ({
  BlockRenderer: ({ block }: { block: { id: string; content: { text?: string } } }) => (
    <div data-testid="grammar-block">{block.content.text}</div>
  ),
}))

const proTopic = {
  id: 'topic-pro',
  title: 'Used to + V',
  category: 'Verb Patterns',
  level: 'intermediate',
  explanation: '',
  examples: [],
  is_published: true,
  view_count: 10,
  access_tier: 'pro',
  teaser_config: { enabled: true, type: 'theory_only' },
  created_at: '2026-07-16T00:00:00.000Z',
} as const

const freeTopic = {
  ...proTopic,
  id: 'topic-free',
  title: 'Present simple',
  access_tier: 'free',
} as const

const blocks = [
  {
    id: 'block-1',
    topic_id: 'topic-pro',
    sort_order: 1,
    block_type: 'paragraph',
    content: { text: 'Protected grammar block' },
    created_at: '2026-07-16T00:00:00.000Z',
    updated_at: '2026-07-16T00:00:00.000Z',
  },
]

function renderPage(path = '/app/grammar/topic-pro') {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/app/grammar/:topicId" element={<GrammarLessonPage />} />
          <Route path="/app/grammar" element={<div>Grammar list reached</div>} />
          <Route path="/app/upgrade" element={<div>Upgrade reached</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('GrammarLessonPage content gating', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ user: { id: 'user-1' } as never, profile: null })
    useSubscriptionStore.setState({ isPro: false, isFree: true })
    vi.mocked(grammarService.getBlocks).mockResolvedValue(blocks as never)
    vi.mocked(grammarService.incrementViewCount).mockResolvedValue(undefined)
  })

  it('shows a lock state for Free users opening a Pro topic directly', async () => {
    vi.mocked(grammarService.getTopic).mockResolvedValue(proTopic as never)

    renderPage()

    expect(await screen.findByText('Nội dung Pro')).toBeInTheDocument()
    expect(screen.getByText('Used to + V')).toBeInTheDocument()
    expect(screen.queryByText('Protected grammar block')).not.toBeInTheDocument()
  })

  it('does not fetch lesson blocks or increment view count for blocked Pro topic', async () => {
    vi.mocked(grammarService.getTopic).mockResolvedValue(proTopic as never)

    renderPage()

    await screen.findByText('Nội dung Pro')
    await waitFor(() => {
      expect(grammarService.getBlocks).not.toHaveBeenCalled()
      expect(grammarService.incrementViewCount).not.toHaveBeenCalled()
    })
  })

  it('renders Pro topic blocks for Pro users', async () => {
    useSubscriptionStore.setState({ isPro: true, isFree: false })
    vi.mocked(grammarService.getTopic).mockResolvedValue(proTopic as never)

    renderPage()

    expect(await screen.findByText('Protected grammar block')).toBeInTheDocument()
    expect(grammarService.incrementViewCount).toHaveBeenCalledWith('topic-pro')
  })

  it('renders Free topic blocks for Free users', async () => {
    vi.mocked(grammarService.getTopic).mockResolvedValue(freeTopic as never)

    renderPage('/app/grammar/topic-free')

    expect(await screen.findByText('Protected grammar block')).toBeInTheDocument()
    expect(grammarService.incrementViewCount).toHaveBeenCalledWith('topic-free')
  })
})
