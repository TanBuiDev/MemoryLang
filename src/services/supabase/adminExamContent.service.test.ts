import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '@/services/supabase/client'
import { adminExamContentService } from './adminExamContent.service'

vi.mock('@/services/supabase/client', () => ({ supabase: { from: vi.fn() } }))

const from = vi.mocked(supabase.from)

describe('adminExamContentService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads ordered B1 sections with their typed activity resources and questions', async () => {
    const exam = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'exam-1', title: 'B1 Mock', source_key: 'b1-de-full-copy', is_published: false }, error: null }) }
    const sections = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [{ id: 'section-1', exam_id: 'exam-1', source_key: 'grammar', skill: 'grammar', title: 'Grammar', resource_type: 'activity', resource_id: 'activity-1', order_index: 0, is_required: true }], error: null }) }
    const activities = { select: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: [{ id: 'activity-1', source_key: 'grammar', title: 'Grammar', skill: 'grammar', activity_type: 'multiple_choice', presentation_type: 'choice_list', grading_mode: 'single_choice', is_published: false }], error: null }) }
    const questions = { select: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [{ id: 'question-1', activity_id: 'activity-1', source_key: 'grammar-1', prompt: 'Choose one', order_index: 0 }], error: null }) }
    from.mockReturnValueOnce(exam as never).mockReturnValueOnce(sections as never).mockReturnValueOnce(activities as never).mockReturnValueOnce(questions as never)

    await expect(adminExamContentService.getExamContent('exam-1')).resolves.toMatchObject({
      id: 'exam-1',
      sections: [{
        source_key: 'grammar',
        resource: { id: 'activity-1', presentation_type: 'choice_list', questions: [{ id: 'question-1' }] },
      }],
    })
  })

  it('saves a compatible presentation and grading mode on the correct resource table', async () => {
    const update = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) }
    from.mockReturnValueOnce(update as never)

    await expect(adminExamContentService.updateResourcePresentation({
      resourceKind: 'activity', resourceId: 'activity-1', presentationType: 'passage_text_inline', gradingMode: 'normalized_text',
    })).resolves.toBeUndefined()

    expect(from).toHaveBeenCalledWith('practice_activities')
    expect(update.update).toHaveBeenCalledWith({ presentation_type: 'passage_text_inline', grading_mode: 'normalized_text' })
    expect(update.eq).toHaveBeenCalledWith('id', 'activity-1')
  })

  it('updates an objective question together with options and review content', async () => {
    const update = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) }
    from.mockReturnValueOnce(update as never)

    await expect(adminExamContentService.updateQuestion('question-1', {
      prompt: 'Choose the best answer.',
      options: [{ key: 'A', text: 'First', is_correct: false }, { key: 'B', text: 'Second', is_correct: true }],
      translation: 'Chọn đáp án đúng nhất.',
      explanation: 'B phù hợp với ngữ cảnh.',
    })).resolves.toBeUndefined()

    expect(from).toHaveBeenCalledWith('practice_questions')
    expect(update.update).toHaveBeenCalledWith({
      prompt: 'Choose the best answer.',
      options: [{ key: 'A', text: 'First', is_correct: false }, { key: 'B', text: 'Second', is_correct: true }],
      translation: 'Chọn đáp án đúng nhất.',
      explanation: 'B phù hợp với ngữ cảnh.',
    })
  })
})
