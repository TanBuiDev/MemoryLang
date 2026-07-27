import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '@/services/supabase/client'
import { adminExamMediaService } from './adminExamMedia.service'

vi.mock('@/services/supabase/client', () => ({
  supabase: { from: vi.fn(), storage: { from: vi.fn() } },
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
})
