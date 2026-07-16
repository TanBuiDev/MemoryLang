import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TestSelectionPage } from './TestSelectionPage'
import { listeningService } from '@/services/supabase/listening.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'

vi.mock('@/services/supabase/client', () => ({ isSupabaseConfigured: true, supabase: {} }))
vi.mock('@/services/supabase/listening.service', () => ({
  listeningService: {
    getTopic: vi.fn(),
    listTests: vi.fn(),
  },
}))

const proTopic = {
  id: 'topic-pro',
  title: 'ETS Pro Listening',
  access_tier: 'pro',
  teaser_config: { enabled: true, type: 'title_only' },
  is_published: true,
} as const

const freeTopic = {
  ...proTopic,
  id: 'topic-free',
  title: 'Starter Listening',
  access_tier: 'free',
} as const

const remoteTests = [
  { id: 'test-remote', topicId: 'topic-free', title: 'Remote Test 1', order: 1 },
]

function renderPage(path = '/app/listening/topic-pro') {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/app/listening/:topicId" element={<TestSelectionPage />} />
          <Route path="/app/listening" element={<div>Listening list reached</div>} />
          <Route path="/app/upgrade" element={<div>Upgrade reached</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('TestSelectionPage content gating', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ user: { id: 'user-1' } as never, profile: null })
    useSubscriptionStore.setState({ isPro: false, isFree: true })
    vi.mocked(listeningService.listTests).mockResolvedValue(remoteTests as never)
  })

  it('shows a lock state for Free users opening a Pro topic directly', async () => {
    vi.mocked(listeningService.getTopic).mockResolvedValue(proTopic as never)

    renderPage()

    expect(await screen.findByText('Nội dung Pro')).toBeInTheDocument()
    expect(screen.getByText('ETS Pro Listening')).toBeInTheDocument()
    await waitFor(() => expect(listeningService.listTests).not.toHaveBeenCalled())
  })

  it('renders Pro topic tests for Pro users', async () => {
    useSubscriptionStore.setState({ isPro: true, isFree: false })
    vi.mocked(listeningService.getTopic).mockResolvedValue(proTopic as never)

    renderPage()

    expect(await screen.findByText('Remote Test 1')).toBeInTheDocument()
    expect(listeningService.listTests).toHaveBeenCalledWith('topic-pro')
  })

  it('renders Free topic tests for Free users', async () => {
    vi.mocked(listeningService.getTopic).mockResolvedValue(freeTopic as never)

    renderPage('/app/listening/topic-free')

    expect(await screen.findByText('Remote Test 1')).toBeInTheDocument()
    expect(listeningService.listTests).toHaveBeenCalledWith('topic-free')
  })

  it('does not fetch tests while topic metadata is loading', () => {
    vi.mocked(listeningService.getTopic).mockReturnValue(new Promise(() => {}) as never)

    const { container } = renderPage()

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    expect(listeningService.listTests).not.toHaveBeenCalled()
  })

  it('shows not found when topic metadata is missing', async () => {
    vi.mocked(listeningService.getTopic).mockResolvedValue(null)

    renderPage()

    expect(await screen.findByText('Không tìm thấy nội dung')).toBeInTheDocument()
    expect(listeningService.listTests).not.toHaveBeenCalled()
  })

  it('keeps the bundled demo topic accessible without remote gating', async () => {
    renderPage('/app/listening/ets2026')

    expect(await screen.findByText('Test 1')).toBeInTheDocument()
    expect(listeningService.getTopic).not.toHaveBeenCalled()
    expect(listeningService.listTests).not.toHaveBeenCalled()
  })
})
