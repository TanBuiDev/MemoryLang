import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '@/services/supabase/client'
import { adminExamMediaService } from './adminExamMedia.service'

vi.mock('@/services/supabase/client', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn(), storage: { from: vi.fn() } },
}))

const from = vi.mocked(supabase.from)

describe('adminExamMediaService', () => {
  beforeEach(() => {
    from.mockReset()
    vi.mocked(supabase.rpc).mockReset()
  })

  it('lists resources owned by the requested exam sections without using a seeded source key', async () => {
    const sections = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [
      { resource_type: 'activity', resource_id: 'a-1' },
      { resource_type: 'activity', resource_id: 'a-2' },
      { resource_type: 'prompt', resource_id: 'p-1' },
    ], error: null }) }
    const activities = { select: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: [
      { id: 'a-1', source_key: 'listen', title: 'Nghe', skill: 'listening', content: 'Hallo', passage: null, audio_url: null, is_published: false },
      { id: 'a-2', source_key: 'grammar', title: 'Ngữ pháp', skill: 'grammar', content: 'x', passage: null, audio_url: null, is_published: false },
    ], error: null }) }
    const prompts = { select: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: [
      { id: 'p-1', source_key: 'speak', title: 'Nói', skill: 'speaking', prompt: 'Nói về bạn', content: null, audio_url: null, is_published: false },
    ], error: null }) }
    const usage = { select: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: [
      { resource_id: 'a-1', resource_type: 'activity', exam: [{ title: 'Đề B1 chính' }] },
      { resource_id: 'a-1', resource_type: 'activity', exam: [{ title: 'Đề B1 phụ' }] },
    ], error: null }) }
    from.mockReturnValueOnce(sections as never)
    from.mockReturnValueOnce(activities as never)
    from.mockReturnValueOnce(prompts as never)
    from.mockReturnValueOnce(usage as never)

    await expect(adminExamMediaService.listResources('exam-1')).resolves.toMatchObject([
      { id: 'a-1', kind: 'activity', text: 'Hallo', usage: { sectionCount: 2, exams: ['Đề B1 chính', 'Đề B1 phụ'] } },
      { id: 'a-2', kind: 'activity', text: 'x' },
      { id: 'p-1', kind: 'prompt', text: 'Nói về bạn' },
    ])
    expect(from).not.toHaveBeenCalledWith('exams')
    expect(sections.eq).toHaveBeenCalledWith('exam_id', 'exam-1')
    expect(activities.in).toHaveBeenCalledWith('id', ['a-1', 'a-2'])
    expect(prompts.in).toHaveBeenCalledWith('id', ['p-1'])
    expect(usage.in).toHaveBeenCalledWith('resource_id', ['a-1', 'a-2', 'p-1'])
  })

  it('lists Signs questions only after resolving Signs activity IDs from the requested exam', async () => {
    const sections = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [
      { resource_type: 'activity', resource_id: 'activity-signs', skill: 'signs' },
      { resource_type: 'activity', resource_id: 'activity-grammar', skill: 'grammar' },
    ], error: null }) }
    const questions = { select: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [{ id: 'sign-1', source_key: 'sign-1', source_number: '1', prompt: 'What does this sign mean?', image_url: null, metadata: {} }], error: null }) }
    from.mockReturnValueOnce(sections as never)
    from.mockReturnValueOnce(questions as never)

    await expect(adminExamMediaService.listSigns('exam-1')).resolves.toEqual([expect.objectContaining({ id: 'sign-1' })])

    expect(sections.eq).toHaveBeenCalledWith('exam_id', 'exam-1')
    expect(questions.in).toHaveBeenCalledWith('activity_id', ['activity-signs'])
  })

  it('lists question reviews through the requested exam section resource IDs', async () => {
    const sections = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [{ resource_type: 'activity', resource_id: 'activity-1' }], error: null }) }
    const questions = { select: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [{ id: 'question-1', source_key: 'q-1', source_number: '1', prompt: 'Question', translation: null, explanation: null, activity: { title: 'Grammar' } }], error: null }) }
    from.mockReturnValueOnce(sections as never)
    from.mockReturnValueOnce(questions as never)

    await expect(adminExamMediaService.listQuestionReviews('exam-1')).resolves.toEqual([expect.objectContaining({ id: 'question-1', activity_title: 'Grammar' })])

    expect(sections.eq).toHaveBeenNthCalledWith(1, 'exam_id', 'exam-1')
    expect(questions.in).toHaveBeenCalledWith('activity_id', ['activity-1'])
  })

  it('updates Vietnamese translations and explanations for a B1 question', async () => {
    const sections = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [{ resource_type: 'activity', resource_id: 'activity-1' }], error: null }) }
    const ownedQuestion = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'question-1' }, error: null }) }
    const update = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) }
    from.mockReturnValueOnce(sections as never)
    from.mockReturnValueOnce(ownedQuestion as never)
    from.mockReturnValueOnce(update as never)

    await expect(adminExamMediaService.updateQuestionReview('exam-1', 'question-1', {
      translation: 'Bản dịch tiếng Việt',
      explanation: 'Lời giải chi tiết',
    })).resolves.toBeUndefined()

    expect(from).toHaveBeenCalledWith('practice_questions')
    expect(ownedQuestion.in).toHaveBeenCalledWith('activity_id', ['activity-1'])
    expect(update.update).toHaveBeenCalledWith({ translation: 'Bản dịch tiếng Việt', explanation: 'Lời giải chi tiết' })
    expect(update.eq).toHaveBeenCalledWith('id', 'question-1')
  })

  it('uses the guarded publish RPC with the requested exam ID', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never)

    await expect(adminExamMediaService.setExamPublished('exam-1', true)).resolves.toBeUndefined()

    expect(supabase.rpc).toHaveBeenCalledWith('set_b1_exam_published_guarded', { p_exam_id: 'exam-1', p_is_published: true })
    expect(from).not.toHaveBeenCalledWith('exams')
  })

  it('lists every governed asset with its current usage references', async () => {
    const sections = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [{ resource_type: 'activity', resource_id: 'activity-1' }], error: null }) }
    const questions = { select: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: [], error: null }) }
    const scopedUsages = { select: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: [{ asset_id: 'asset-1' }], error: null }) }
    const assets = { select: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [
      { id: 'asset-1', media_kind: 'audio', bucket_id: 'audio_assets', storage_path: 'b1/a.mp3', public_url: 'https://cdn.example/a.mp3', display_name: 'Listening 1', version_number: 2, replaces_asset_id: 'asset-0', created_at: '2026-07-28T00:00:00Z' },
    ], error: null }) }
    const usages = { select: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: [
      { asset_id: 'asset-1', resource_type: 'activity', resource_id: 'activity-1', usage_role: 'audio' },
    ], error: null }) }
    from.mockReturnValueOnce(sections as never)
    from.mockReturnValueOnce(questions as never)
    from.mockReturnValueOnce(scopedUsages as never)
    from.mockReturnValueOnce(assets as never)
    from.mockReturnValueOnce(usages as never)

    await expect(adminExamMediaService.listAssets('exam-1')).resolves.toMatchObject([{
      id: 'asset-1', media_kind: 'audio', usage_count: 1,
      usages: [{ resource_type: 'activity', resource_id: 'activity-1', usage_role: 'audio' }],
    }])
    expect(scopedUsages.in).toHaveBeenCalledWith('resource_id', ['activity-1'])
    expect(assets.in).toHaveBeenCalledWith('id', ['asset-1'])
  })

  it('replaces only the target resource usage while another usage of the old shared asset remains', async () => {
    const sections = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [{ resource_type: 'activity', resource_id: 'activity-1' }], error: null }) }
    const update = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) }
    const removeUsage = { delete: vi.fn(), eq: vi.fn() }
    const insertUsage = { insert: vi.fn().mockResolvedValue({ error: null }) }
    removeUsage.delete.mockReturnValue(removeUsage)
    removeUsage.eq.mockReturnValueOnce(removeUsage).mockReturnValueOnce(removeUsage).mockResolvedValueOnce({ error: null })
    from.mockReturnValueOnce(sections as never)
    from.mockReturnValueOnce(update as never)
    from.mockReturnValueOnce(removeUsage as never)
    from.mockReturnValueOnce(insertUsage as never)

    await expect(adminExamMediaService.attachAudioAsset('exam-1',
      { id: 'activity-1', kind: 'activity', source_key: 'listen', title: 'Listening', skill: 'listening', text: '', audio_url: null, is_published: false },
      { id: 'asset-1', media_kind: 'audio', bucket_id: 'audio_assets', storage_path: 'b1/a.mp3', public_url: 'https://cdn.example/a.mp3', display_name: 'Listening', version_number: 1, replaces_asset_id: null, created_at: '2026-07-28T00:00:00Z', usages: [], usage_count: 0 },
    )).resolves.toBeUndefined()

    expect(sections.eq).toHaveBeenCalledWith('exam_id', 'exam-1')
    expect(update.update).toHaveBeenCalledWith({ audio_url: 'https://cdn.example/a.mp3' })
    expect(removeUsage.delete).toHaveBeenCalled()
    expect(removeUsage.eq).toHaveBeenNthCalledWith(1, 'resource_type', 'activity')
    expect(removeUsage.eq).toHaveBeenNthCalledWith(2, 'resource_id', 'activity-1')
    expect(removeUsage.eq).toHaveBeenNthCalledWith(3, 'usage_role', 'audio')
    expect(removeUsage.eq).not.toHaveBeenCalledWith('asset_id', 'asset-old-shared')
    expect(insertUsage.insert).toHaveBeenCalledWith({ asset_id: 'asset-1', resource_type: 'activity', resource_id: 'activity-1', usage_role: 'audio' })
  })

  it('refuses to delete an asset that is still attached to content', async () => {
    const exam = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'exam-1' }, error: null }) }
    const usages = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ count: 1, error: null }) }
    from.mockReturnValueOnce(exam as never)
    from.mockReturnValueOnce(usages as never)

    await expect(adminExamMediaService.deleteAsset('exam-1', {
      id: 'asset-1', media_kind: 'audio', bucket_id: 'audio_assets', storage_path: 'b1/a.mp3', public_url: 'https://cdn.example/a.mp3', display_name: 'Listening', version_number: 1, replaces_asset_id: null, created_at: '2026-07-28T00:00:00Z', usage_count: 1, usages: [{ resource_type: 'activity', resource_id: 'activity-1', usage_role: 'audio' }],
    })).rejects.toThrow('đang được sử dụng')
  })
})
