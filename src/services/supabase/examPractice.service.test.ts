import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '@/services/supabase/client'
import { examPracticeService } from './examPractice.service'

vi.mock('@/services/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

const from = vi.mocked(supabase.from)
const rpc = vi.mocked(supabase.rpc)

describe('examPracticeService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists only published B1 mock exams', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [{ id: 'b1-1', title: 'B1 Đề 1' }], error: null }),
    }
    from.mockReturnValueOnce(query as never)

    await expect(examPracticeService.listAvailableExams()).resolves.toEqual([
      { id: 'b1-1', title: 'B1 Đề 1' },
    ])

    expect(from).toHaveBeenCalledWith('exams')
    expect(query.eq).toHaveBeenCalledWith('cefr_level', 'B1')
    expect(query.eq).toHaveBeenCalledWith('is_published', true)
    expect(query.is).toHaveBeenCalledWith('deleted_at', null)
  })

  it('starts an attempt with the learner-selected shared duration', async () => {
    rpc.mockResolvedValueOnce({ data: { id: 'attempt-1' }, error: null } as never)

    await expect(examPracticeService.startAttempt('exam-1', 7200)).resolves.toEqual({ id: 'attempt-1' })

    expect(rpc).toHaveBeenCalledWith('start_b1_exam_attempt', {
      p_exam_id: 'exam-1',
      p_target_duration_seconds: 7200,
    })
  })

  it('autosaves section answers and an optional draft reference through the guarded RPC', async () => {
    rpc.mockResolvedValueOnce({ data: { id: 'section-attempt-1' }, error: null } as never)

    await expect(examPracticeService.saveSectionProgress({
      attemptId: 'attempt-1',
      sectionSourceKey: 'writing-1',
      progress: { content: 'My response.' },
      status: 'completed',
      draftVersionId: 'draft-2',
    })).resolves.toEqual({ id: 'section-attempt-1' })

    expect(rpc).toHaveBeenCalledWith('save_b1_section_attempt_progress', {
      p_attempt_id: 'attempt-1',
      p_exam_section_source_key: 'writing-1',
      p_progress: { content: 'My response.' },
      p_status: 'completed',
      p_draft_version_id: 'draft-2',
    })
  })

  it('creates the next immutable Writing or Speaking version through the guarded RPC', async () => {
    rpc.mockResolvedValueOnce({ data: { version_number: 2 }, error: null } as never)

    await expect(examPracticeService.createDraftVersion('prompt-1', 'Bản sửa thứ hai.')).resolves.toEqual({
      version_number: 2,
    })

    expect(rpc).toHaveBeenCalledWith('create_practice_draft_version', {
      p_prompt_id: 'prompt-1',
      p_content: 'Bản sửa thứ hai.',
    })
  })
})
