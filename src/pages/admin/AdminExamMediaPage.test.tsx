import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminExamMediaPage from './AdminExamMediaPage'
import { adminExamMediaService } from '@/services/supabase/adminExamMedia.service'

vi.mock('@/services/supabase/adminExamMedia.service', () => ({
  adminExamMediaService: {
    listResources: vi.fn(), listSigns: vi.fn(), listQuestionReviews: vi.fn(),
    setAudioUrl: vi.fn(), clearAudioAsset: vi.fn(), setPublished: vi.fn(), setExamPublished: vi.fn(),
    uploadAudio: vi.fn(), uploadSignImage: vi.fn(), setSignImage: vi.fn(), updateSignImageAlt: vi.fn(), updateSignImageCrop: vi.fn(), updateQuestionReview: vi.fn(),
    listAssets: vi.fn(), createExternalAudioAsset: vi.fn(), attachAudioAsset: vi.fn(), attachSignImage: vi.fn(), deleteAsset: vi.fn(),
  },
}))
vi.mock('@/services/api/generateAudio.api', () => ({ generateAudio: vi.fn() }))

describe('AdminExamMediaPage', () => {
  beforeEach(() => vi.clearAllMocks())

  const renderPage = (path = '/app/admin/exams/exam-1/media') => render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/admin/exams/:id/media" element={<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AdminExamMediaPage /></QueryClientProvider>} />
      </Routes>
    </MemoryRouter>,
  )

  it('asks for confirmation before replacing audio on a published resource', async () => {
    vi.mocked(adminExamMediaService.listResources).mockResolvedValue([{
      id: 'listen-1', source_key: 'listening-1', title: 'Listening 1', skill: 'listening', kind: 'activity', text: 'Listen.', audio_url: 'https://cdn.example/old.mp3', is_published: true,
    }])
    vi.mocked(adminExamMediaService.listSigns).mockResolvedValue([])
    vi.mocked(adminExamMediaService.listQuestionReviews).mockResolvedValue([])
    vi.mocked(adminExamMediaService.listAssets).mockResolvedValue([])

    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Quản lý' }))
    fireEvent.change(screen.getByLabelText('Đường dẫn audio'), { target: { value: 'https://cdn.example/new.mp3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu đường dẫn audio' }))

    expect(await screen.findByRole('dialog', { name: 'Thay audio đã xuất bản?' })).toBeInTheDocument()
    expect(screen.getByText(/attempt đã bắt đầu giữ nguyên snapshot/i)).toBeInTheDocument()
    expect(adminExamMediaService.setAudioUrl).not.toHaveBeenCalled()
    expect(adminExamMediaService.listResources).toHaveBeenCalledWith('exam-1')
    expect(adminExamMediaService.listSigns).toHaveBeenCalledWith('exam-1')
    expect(adminExamMediaService.listQuestionReviews).toHaveBeenCalledWith('exam-1')
    expect(adminExamMediaService.listAssets).toHaveBeenCalledWith('exam-1')
    expect(screen.getByRole('link', { name: /Quay lại trình xây dựng đề/i })).toHaveAttribute('href', '/app/admin/exams/exam-1')
  })

  it('shows usage impact before an admin manages shared media', async () => {
    vi.mocked(adminExamMediaService.listResources).mockResolvedValue([{
      id: 'listen-1', source_key: 'listening-1', title: 'Listening 1', skill: 'listening', kind: 'activity', text: 'Listen.', audio_url: null, is_published: false,
      usage: { sectionCount: 2, exams: ['B1 DeFull', 'B1 luyện tập'] },
    }])
    vi.mocked(adminExamMediaService.listSigns).mockResolvedValue([])
    vi.mocked(adminExamMediaService.listQuestionReviews).mockResolvedValue([])
    vi.mocked(adminExamMediaService.listAssets).mockResolvedValue([])

    renderPage()

    expect(await screen.findByText(/Đang được dùng trong 2 section/i)).toBeInTheDocument()
    expect(screen.getByText(/B1 DeFull.*B1 luyện tập/i)).toBeInTheDocument()
  })

  it('clears a selected resource through the scoped clear service while its old asset has another usage', async () => {
    vi.mocked(adminExamMediaService.listResources).mockResolvedValue([{
      id: 'listen-1', source_key: 'listening-1', title: 'Listening 1', skill: 'listening', kind: 'activity', text: 'Listen.', audio_url: 'https://cdn.example/old.mp3', is_published: false,
    }])
    vi.mocked(adminExamMediaService.listSigns).mockResolvedValue([])
    vi.mocked(adminExamMediaService.listQuestionReviews).mockResolvedValue([])
    vi.mocked(adminExamMediaService.listAssets).mockResolvedValue([{
      id: 'asset-old-shared', media_kind: 'audio', bucket_id: 'audio_assets', storage_path: 'b1/old.mp3', public_url: 'https://cdn.example/old.mp3', display_name: 'Shared audio', version_number: 1, replaces_asset_id: null, created_at: '2026-08-01T00:00:00Z', usage_count: 2,
      usages: [
        { resource_type: 'activity', resource_id: 'listen-1', usage_role: 'audio' },
        { resource_type: 'activity', resource_id: 'listen-2', usage_role: 'audio' },
      ],
    }])
    vi.mocked(adminExamMediaService.clearAudioAsset).mockResolvedValue(undefined)

    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Quản lý' }))
    fireEvent.change(screen.getByLabelText('Đường dẫn audio'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu đường dẫn audio' }))

    await waitFor(() => expect(adminExamMediaService.clearAudioAsset).toHaveBeenCalledWith('exam-1', expect.objectContaining({ id: 'listen-1' })))
    expect(adminExamMediaService.clearAudioAsset).toHaveBeenCalledTimes(1)
    expect(adminExamMediaService.setAudioUrl).not.toHaveBeenCalled()
  })

  it('lets an admin set accessible alt text and a display crop for a sign image', async () => {
    vi.mocked(adminExamMediaService.listResources).mockResolvedValue([])
    vi.mocked(adminExamMediaService.listSigns).mockResolvedValue([{
      id: 'sign-1', source_key: 'sign-1', source_number: '1', prompt: 'What does this sign mean?', image_url: 'https://cdn.example/sign.png', image_alt: '', image_crop: 'contain', metadata: {},
    }])
    vi.mocked(adminExamMediaService.listQuestionReviews).mockResolvedValue([])
    vi.mocked(adminExamMediaService.listAssets).mockResolvedValue([])

    renderPage()

    const input = await screen.findByLabelText('Mô tả ảnh biển báo 1')
    expect(input).toBeInTheDocument()
    const cropSelect = screen.getByLabelText('Hiển thị ảnh')
    fireEvent.change(input, { target: { value: 'Biển cấm đỗ xe' } })
    fireEvent.blur(input)
    expect(adminExamMediaService.updateSignImageAlt).toHaveBeenCalledWith('exam-1', expect.objectContaining({ id: 'sign-1' }), 'Biển cấm đỗ xe')
    fireEvent.change(cropSelect, { target: { value: 'top' } })
    await waitFor(() => expect(adminExamMediaService.updateSignImageCrop).toHaveBeenCalledWith('exam-1', expect.objectContaining({ id: 'sign-1' }), 'top'))
  })

  it('shows governed asset usage and disables deletion while content still uses it', async () => {
    vi.mocked(adminExamMediaService.listResources).mockResolvedValue([])
    vi.mocked(adminExamMediaService.listSigns).mockResolvedValue([])
    vi.mocked(adminExamMediaService.listQuestionReviews).mockResolvedValue([])
    vi.mocked(adminExamMediaService.listAssets).mockResolvedValue([{
      id: 'asset-1', media_kind: 'audio', bucket_id: 'audio_assets', storage_path: 'b1/listen.mp3', public_url: 'https://cdn.example/listen.mp3', display_name: 'Listening 1', version_number: 2, replaces_asset_id: 'asset-0', created_at: '2026-07-28T00:00:00Z', usage_count: 1,
      usages: [{ resource_type: 'activity', resource_id: 'listen-1', usage_role: 'audio' }],
    }])

    renderPage()

    expect(await screen.findByText('Thư viện media')).toBeInTheDocument()
    expect(await screen.findByText(/đang được dùng ở 1 nơi/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đang được sử dụng' })).toBeDisabled()
  })

  it('renders an accessible missing-exam state instead of loading unscoped media', () => {
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={['/app/admin/exams//media']}><AdminExamMediaPage /></MemoryRouter></QueryClientProvider>)

    expect(screen.getByRole('alert')).toHaveTextContent(/Không tìm thấy mã đề thi/i)
    expect(adminExamMediaService.listResources).not.toHaveBeenCalled()
  })
})
