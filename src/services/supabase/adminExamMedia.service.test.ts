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
    const activities = { select: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [
      { id: 'a-1', source_key: 'listen', title: 'Nghe', skill: 'listening', content: 'Hallo', audio_url: null, is_published: false },
      { id: 'a-2', source_key: 'grammar', title: 'Ngữ pháp', skill: 'grammar', content: 'x', audio_url: null, is_published: false },
    ], error: null }) }
    const prompts = { select: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [
      { id: 'p-1', source_key: 'speak', title: 'Nói', skill: 'speaking', prompt: 'Nói về bạn', audio_url: null, is_published: false },
    ], error: null }) }
    from.mockReturnValueOnce(activities as never).mockReturnValueOnce(prompts as never)

    await expect(adminExamMediaService.listResources()).resolves.toMatchObject([
      { id: 'a-1', kind: 'activity', text: 'Hallo' },
      { id: 'p-1', kind: 'prompt', text: 'Nói về bạn' },
    ])
  })
})
