import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AdminExamMediaPage from './AdminExamMediaPage'
import { adminExamMediaService } from '@/services/supabase/adminExamMedia.service'

vi.mock('@/services/supabase/adminExamMedia.service', () => ({
  adminExamMediaService: {
    listResources: vi.fn(), listSigns: vi.fn(), listQuestionReviews: vi.fn(),
    setAudioUrl: vi.fn(), setPublished: vi.fn(), setB1ExamPublished: vi.fn(),
    uploadAudio: vi.fn(), uploadSignImage: vi.fn(), setSignImage: vi.fn(), updateQuestionReview: vi.fn(),
  },
}))
vi.mock('@/services/api/generateAudio.api', () => ({ generateAudio: vi.fn() }))

describe('AdminExamMediaPage', () => {
  it('asks for confirmation before replacing audio on a published resource', async () => {
    vi.mocked(adminExamMediaService.listResources).mockResolvedValue([{
      id: 'listen-1', source_key: 'listening-1', title: 'Listening 1', skill: 'listening', kind: 'activity', text: 'Listen.', audio_url: 'https://cdn.example/old.mp3', is_published: true,
    }])
    vi.mocked(adminExamMediaService.listSigns).mockResolvedValue([])
    vi.mocked(adminExamMediaService.listQuestionReviews).mockResolvedValue([])

    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AdminExamMediaPage /></QueryClientProvider>)

    fireEvent.click(await screen.findByRole('button', { name: 'Quản lý' }))
    fireEvent.change(screen.getByLabelText('Đường dẫn audio'), { target: { value: 'https://cdn.example/new.mp3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu đường dẫn audio' }))

    expect(await screen.findByRole('dialog', { name: 'Thay audio đã xuất bản?' })).toBeInTheDocument()
    expect(screen.getByText(/attempt đã bắt đầu giữ nguyên snapshot/i)).toBeInTheDocument()
    expect(adminExamMediaService.setAudioUrl).not.toHaveBeenCalled()
  })

  it('shows usage impact before an admin manages shared media', async () => {
    vi.mocked(adminExamMediaService.listResources).mockResolvedValue([{
      id: 'listen-1', source_key: 'listening-1', title: 'Listening 1', skill: 'listening', kind: 'activity', text: 'Listen.', audio_url: null, is_published: false,
      usage: { sectionCount: 2, exams: ['B1 DeFull', 'B1 luyện tập'] },
    }])
    vi.mocked(adminExamMediaService.listSigns).mockResolvedValue([])
    vi.mocked(adminExamMediaService.listQuestionReviews).mockResolvedValue([])

    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AdminExamMediaPage /></QueryClientProvider>)

    expect(await screen.findByText(/Đang được dùng trong 2 section/i)).toBeInTheDocument()
    expect(screen.getByText(/B1 DeFull.*B1 luyện tập/i)).toBeInTheDocument()
  })
})
