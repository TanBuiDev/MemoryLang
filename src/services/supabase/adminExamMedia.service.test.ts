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
    from.mockReturnValueOnce(sections as never)

    await expect(adminExamMediaService.listResources()).resolves.toMatchObject([
      { id: 'a-1', kind: 'activity', text: 'Hallo' },
      { id: 'a-2', kind: 'activity', text: 'x' },
      { id: 'p-1', kind: 'prompt', text: 'Nói về bạn' },
    ])
    expect(from).toHaveBeenCalledWith('exam_sections')
    expect(sections.eq).toHaveBeenCalledWith('exam.source_key', 'b1-de-full-copy')
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
})
