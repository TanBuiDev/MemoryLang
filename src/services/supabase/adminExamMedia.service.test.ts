import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '@/services/supabase/client'
import { adminExamMediaService } from './adminExamMedia.service'

vi.mock('@/services/supabase/client', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn(), storage: { from: vi.fn() } },
}))

const from = vi.mocked(supabase.from)

describe('adminExamMediaService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists only B1 resources that can carry listening or TTS media', async () => {
    const sections = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [
      { resource_type: 'activity', activity: { id: 'a-1', source_key: 'listen', title: 'Nghe', skill: 'listening', content: 'Hallo', audio_url: null, is_published: false }, prompt: null },
      { resource_type: 'activity', activity: { id: 'a-2', source_key: 'grammar', title: 'Ngữ pháp', skill: 'grammar', content: 'x', audio_url: null, is_published: false }, prompt: null },
      { resource_type: 'prompt', activity: null, prompt: { id: 'p-1', source_key: 'speak', title: 'Nói', skill: 'speaking', prompt: 'Nói về bạn', audio_url: null, is_published: false } },
    ], error: null }) }
    const usage = { select: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: [
      { resource_id: 'a-1', resource_type: 'activity', exam: [{ title: 'Đề B1 chính' }] },
      { resource_id: 'a-1', resource_type: 'activity', exam: [{ title: 'Đề B1 phụ' }] },
    ], error: null }) }
    from.mockReturnValueOnce(sections as never)
    from.mockReturnValueOnce(usage as never)

    await expect(adminExamMediaService.listResources()).resolves.toMatchObject([
      { id: 'a-1', kind: 'activity', text: 'Hallo', usage: { sectionCount: 2, exams: ['Đề B1 chính', 'Đề B1 phụ'] } },
      { id: 'a-2', kind: 'activity', text: 'x' },
      { id: 'p-1', kind: 'prompt', text: 'Nói về bạn' },
    ])
    expect(from).toHaveBeenCalledWith('exam_sections')
    expect(sections.eq).toHaveBeenCalledWith('exam.source_key', 'b1-de-full-copy')
    expect(usage.in).toHaveBeenCalledWith('resource_id', ['a-1', 'a-2', 'p-1'])
  })

  it('updates Vietnamese translations and explanations for a B1 question', async () => {
    const update = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) }
    from.mockReturnValueOnce(update as never)

    await expect(adminExamMediaService.updateQuestionReview('question-1', {
      translation: 'Bản dịch tiếng Việt',
      explanation: 'Lời giải chi tiết',
    })).resolves.toBeUndefined()

    expect(from).toHaveBeenCalledWith('practice_questions')
    expect(update.update).toHaveBeenCalledWith({ translation: 'Bản dịch tiếng Việt', explanation: 'Lời giải chi tiết' })
    expect(update.eq).toHaveBeenCalledWith('id', 'question-1')
  })

  it('uses the guarded publish RPC instead of updating the B1 exam flag directly', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never)

    await expect(adminExamMediaService.setB1ExamPublished(true)).resolves.toBeUndefined()

    expect(supabase.rpc).toHaveBeenCalledWith('set_b1_exam_published_guarded', { p_is_published: true })
    expect(from).not.toHaveBeenCalledWith('exams')
  })

  it('lists every governed asset with its current usage references', async () => {
    const assets = { select: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [
      { id: 'asset-1', media_kind: 'audio', bucket_id: 'audio_assets', storage_path: 'b1/a.mp3', public_url: 'https://cdn.example/a.mp3', display_name: 'Listening 1', version_number: 2, replaces_asset_id: 'asset-0', created_at: '2026-07-28T00:00:00Z' },
    ], error: null }) }
    const usages = { select: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: [
      { asset_id: 'asset-1', resource_type: 'activity', resource_id: 'activity-1', usage_role: 'audio' },
    ], error: null }) }
    from.mockReturnValueOnce(assets as never)
    from.mockReturnValueOnce(usages as never)

    await expect(adminExamMediaService.listAssets()).resolves.toMatchObject([{
      id: 'asset-1', media_kind: 'audio', usage_count: 1,
      usages: [{ resource_type: 'activity', resource_id: 'activity-1', usage_role: 'audio' }],
    }])
  })

  it('attaches an asset by replacing the resource usage and keeping the learner-facing URL in sync', async () => {
    const update = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) }
    const removeUsage = { delete: vi.fn(), eq: vi.fn() }
    const insertUsage = { insert: vi.fn().mockResolvedValue({ error: null }) }
    removeUsage.delete.mockReturnValue(removeUsage)
    removeUsage.eq.mockReturnValueOnce(removeUsage).mockReturnValueOnce(removeUsage).mockResolvedValueOnce({ error: null })
    from.mockReturnValueOnce(update as never)
    from.mockReturnValueOnce(removeUsage as never)
    from.mockReturnValueOnce(insertUsage as never)

    await expect(adminExamMediaService.attachAudioAsset(
      { id: 'activity-1', kind: 'activity', source_key: 'listen', title: 'Listening', skill: 'listening', text: '', audio_url: null, is_published: false },
      { id: 'asset-1', media_kind: 'audio', bucket_id: 'audio_assets', storage_path: 'b1/a.mp3', public_url: 'https://cdn.example/a.mp3', display_name: 'Listening', version_number: 1, replaces_asset_id: null, created_at: '2026-07-28T00:00:00Z', usages: [], usage_count: 0 },
    )).resolves.toBeUndefined()

    expect(update.update).toHaveBeenCalledWith({ audio_url: 'https://cdn.example/a.mp3' })
    expect(removeUsage.delete).toHaveBeenCalled()
    expect(insertUsage.insert).toHaveBeenCalledWith({ asset_id: 'asset-1', resource_type: 'activity', resource_id: 'activity-1', usage_role: 'audio' })
  })

  it('refuses to delete an asset that is still attached to content', async () => {
    await expect(adminExamMediaService.deleteAsset({
      id: 'asset-1', media_kind: 'audio', bucket_id: 'audio_assets', storage_path: 'b1/a.mp3', public_url: 'https://cdn.example/a.mp3', display_name: 'Listening', version_number: 1, replaces_asset_id: null, created_at: '2026-07-28T00:00:00Z', usage_count: 1, usages: [{ resource_type: 'activity', resource_id: 'activity-1', usage_role: 'audio' }],
    })).rejects.toThrow('đang được sử dụng')
  })
})
