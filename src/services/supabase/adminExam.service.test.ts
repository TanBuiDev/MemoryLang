import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '@/services/supabase/client'
import { adminExamService } from './adminExam.service'

vi.mock('@/services/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

const from = vi.mocked(supabase.from)
const rpc = vi.mocked(supabase.rpc)
const service = adminExamService as Record<string, (...args: any[]) => Promise<unknown>>

describe('adminExamService B1 creation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists non-deleted B1 clone sources with a relational section count', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{
          id: 'source-1',
          title: 'B1 Source',
          is_published: true,
          updated_at: '2026-08-01T00:00:00.000Z',
          exam_sections: [{ count: 4 }],
        }],
        error: null,
      }),
    }
    from.mockReturnValueOnce(query as never)

    await expect(service.listB1CloneSources()).resolves.toEqual([{
      id: 'source-1',
      title: 'B1 Source',
      is_published: true,
      section_count: 4,
      updated_at: '2026-08-01T00:00:00.000Z',
    }])

    expect(from).toHaveBeenCalledTimes(1)
    expect(from).toHaveBeenCalledWith('exams')
    expect(query.select).toHaveBeenCalledWith('id, title, is_published, updated_at, exam_sections(count)')
    expect(query.eq).toHaveBeenCalledWith('exam_format', 'b1_practice')
    expect(query.is).toHaveBeenCalledWith('deleted_at', null)
    expect(query.order).toHaveBeenCalledWith('updated_at', { ascending: false })
    expect(query.limit).toHaveBeenCalledWith(1000)
    expect(query.ilike).not.toHaveBeenCalled()
  })

  it('applies an escaped title search only when the search text is non-empty', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    from.mockReturnValueOnce(query as never)

    await expect(service.listB1CloneSources(' A_%\\B ')).resolves.toEqual([])

    expect(query.ilike).toHaveBeenCalledWith('title', '%A\\_\\%\\\\B%')
  })

  it('sends the normalized B1 creation payload to the guarded RPC', async () => {
    rpc.mockResolvedValueOnce({ data: 'created-exam-id', error: null } as never)
    const input = {
      requestId: 'request-1',
      title: '  B1 Practice Set  ',
      description: '  A test description  ',
      accessTier: 'pro' as const,
      defaultTimeMinutes: 120,
      initializationMode: 'full_content' as const,
      sourceExamId: 'source-1',
    }

    await expect(service.createB1Exam(input)).resolves.toBe('created-exam-id')

    expect(rpc).toHaveBeenCalledWith('create_b1_exam', {
      p_request_id: 'request-1',
      p_title: 'B1 Practice Set',
      p_description: 'A test description',
      p_access_tier: 'pro',
      p_default_time_minutes: 120,
      p_initialization_mode: 'full_content',
      p_source_exam_id: 'source-1',
    })
  })

  it.each([
    ['B1_CREATE_FORBIDDEN', 'Bạn không có quyền tạo đề B1.'],
    ['B1_SOURCE_UNAVAILABLE', 'Đề nguồn không còn khả dụng. Vui lòng chọn đề khác.'],
    ['B1_TITLE_REQUIRED', 'Vui lòng nhập tiêu đề đề B1.'],
    ['B1_DURATION_INVALID', 'Thời lượng phải từ 1 đến 480 phút.'],
  ])('maps %s to a stable Vietnamese message', async (code, message) => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: code } } as never)

    await expect(service.createB1Exam({
      requestId: 'request-1',
      title: 'B1 Practice Set',
      description: '',
      accessTier: 'free',
      defaultTimeMinutes: 120,
      initializationMode: 'blank',
      sourceExamId: null,
    })).rejects.toThrow(message)
  })
})
