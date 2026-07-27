import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ListeningSessionPage } from './ListeningSessionPage'
import { listeningService } from '@/services/supabase/listening.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSubscriptionStore } from '@/stores/useSubscriptionStore'

vi.mock('@/services/supabase/client', () => ({ isSupabaseConfigured: true, supabase: {} }))
vi.mock('@/services/supabase/listening.service', () => ({
  listeningService: {
    getTopicByPartId: vi.fn(),
    getPartWithQuestions: vi.fn(),
  },
}))
vi.mock('@/components/listening/ListeningAudioPlayer', () => ({
  ListeningAudioPlayer: ({ src }: { src: string }) => <div data-testid="audio-player">{src}</div>,
}))

const proTopic = {
  id: 'topic-pro',
  title: 'ETS Pro Listening',
  access_tier: 'pro',
  teaser_config: { enabled: true, type: 'title_only' },
  is_published: true,
} as const

const sessionPayload = {
  part: {
    id: 'part-pro',
    testId: 'test-pro',
    partNumber: 1,
    directions: 'Remote directions',
    audioSrc: '/audio/remote.mp3',
  },
  questions: [
    {
      id: 'question-1',
      partId: 'part-pro',
      order: 1,
      questionText: 'Remote question',
      options: ['A', 'B'],
      correctIndex: 0,
    },
  ],
}

function renderPage(path = '/app/listening/session/part-pro/test') {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/app/listening/session/:partId/:mode" element={<ListeningSessionPage />} />
          <Route path="/app/listening" element={<div>Listening list reached</div>} />
          <Route path="/app/upgrade" element={<div>Upgrade reached</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ListeningSessionPage content gating', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthStore.setState({ user: { id: 'user-1' } as never, profile: null })
    useSubscriptionStore.setState({ isPro: false, isFree: true })
    vi.mocked(listeningService.getPartWithQuestions).mockResolvedValue(sessionPayload as never)
  })

  it('shows a lock state for Free users opening a Pro part directly', async () => {
    vi.mocked(listeningService.getTopicByPartId).mockResolvedValue(proTopic as never)

    renderPage()

    expect(await screen.findByText('Nội dung Pro')).toBeInTheDocument()
    expect(screen.getByText('ETS Pro Listening')).toBeInTheDocument()
    expect(screen.queryByTestId('audio-player')).not.toBeInTheDocument()
    await waitFor(() => expect(listeningService.getPartWithQuestions).not.toHaveBeenCalled())
  })

  it('renders Pro topic session for Pro users', async () => {
    useSubscriptionStore.setState({ isPro: true, isFree: false })
    vi.mocked(listeningService.getTopicByPartId).mockResolvedValue(proTopic as never)

    renderPage()

    expect(await screen.findByTestId('audio-player')).toHaveTextContent('/audio/remote.mp3')
    expect(listeningService.getPartWithQuestions).toHaveBeenCalledWith('part-pro')
  })

  it('shows not found when parent topic metadata is missing', async () => {
    vi.mocked(listeningService.getTopicByPartId).mockResolvedValue(null)

    renderPage()

    expect(await screen.findByText('Không tìm thấy nội dung bài nghe')).toBeInTheDocument()
    expect(listeningService.getPartWithQuestions).not.toHaveBeenCalled()
  })

  it('keeps bundled demo parts accessible without remote gating', async () => {
    renderPage('/app/listening/session/ets2026-test1-part1/test')

    expect(await screen.findByTestId('audio-player')).toHaveTextContent('/audio/listening/part1-sample.mp3')
    expect(listeningService.getTopicByPartId).not.toHaveBeenCalled()
    expect(listeningService.getPartWithQuestions).not.toHaveBeenCalled()
  })
})
