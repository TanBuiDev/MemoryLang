import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PartSelectionPage } from './PartSelectionPage'
import { listeningService } from '@/services/supabase/listening.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'

vi.mock('@/services/supabase/client', () => ({ isSupabaseConfigured: true, supabase: {} }))
vi.mock('@/services/supabase/listening.service', () => ({
  listeningService: {
    getTopicByTestId: vi.fn(),
    listParts: vi.fn(),
  },
}))

const proTopic = {
  id: 'topic-pro',
  title: 'ETS Pro Listening',
  access_tier: 'pro',
  teaser_config: { enabled: true, type: 'title_only' },
  is_published: true,
} as const

const remoteParts = [
  {
    id: 'part-remote',
    testId: 'test-pro',
    partNumber: 1,
    directions: 'Remote directions',
    audioSrc: '/audio/remote.mp3',
  },
]

function renderPage(path = '/app/listening/topic-pro/test-pro') {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/app/listening/:topicId/:testId" element={<PartSelectionPage />} />
          <Route path="/app/listening" element={<div>Listening list reached</div>} />
          <Route path="/app/upgrade" element={<div>Upgrade reached</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('PartSelectionPage content gating', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ user: { id: 'user-1' } as never, profile: null })
    useSubscriptionStore.setState({ isPro: false, isFree: true })
    vi.mocked(listeningService.listParts).mockResolvedValue(remoteParts as never)
  })

  it('shows a lock state for Free users opening a Pro test directly', async () => {
    vi.mocked(listeningService.getTopicByTestId).mockResolvedValue(proTopic as never)

    renderPage()

    expect(await screen.findByText('Nội dung Pro')).toBeInTheDocument()
    expect(screen.getByText('ETS Pro Listening')).toBeInTheDocument()
    await waitFor(() => expect(listeningService.listParts).not.toHaveBeenCalled())
  })

  it('renders Pro topic parts for Pro users', async () => {
    useSubscriptionStore.setState({ isPro: true, isFree: false })
    vi.mocked(listeningService.getTopicByTestId).mockResolvedValue(proTopic as never)

    renderPage()

    expect(await screen.findByText('Remote directions')).toBeInTheDocument()
    expect(listeningService.listParts).toHaveBeenCalledWith('test-pro')
  })

  it('does not fetch parts while parent metadata is loading', () => {
    vi.mocked(listeningService.getTopicByTestId).mockReturnValue(new Promise(() => {}) as never)

    const { container } = renderPage()

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    expect(listeningService.listParts).not.toHaveBeenCalled()
  })

  it('shows not found when parent topic metadata is missing', async () => {
    vi.mocked(listeningService.getTopicByTestId).mockResolvedValue(null)

    renderPage()

    expect(await screen.findByText('Không tìm thấy nội dung')).toBeInTheDocument()
    expect(listeningService.listParts).not.toHaveBeenCalled()
  })

  it('keeps the bundled demo test accessible without remote gating', async () => {
    renderPage('/app/listening/ets2026/ets2026-test1')

    expect(await screen.findByText('For each question, you will hear four statements about a picture. Select the statement that best describes the picture.')).toBeInTheDocument()
    expect(listeningService.getTopicByTestId).not.toHaveBeenCalled()
    expect(listeningService.listParts).not.toHaveBeenCalled()
  })
})
