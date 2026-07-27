import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '@/services/supabase/client'
import { adminExamContentService } from './adminExamContent.service'

vi.mock('@/services/supabase/client', () => ({ supabase: { from: vi.fn() } }))

const from = vi.mocked(supabase.from)

describe('adminExamContentService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    from.mockReset()
  })

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

  it('loads Writing and Speaking samples with each prompt resource for publish validation', async () => {
    const exam = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'exam-1', title: 'B1 Mock', source_key: 'b1-de-full-copy', is_published: false }, error: null }) }
    const sections = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: [{ id: 'section-1', exam_id: 'exam-1', source_key: 'writing', skill: 'writing', title: 'Writing', resource_type: 'prompt', resource_id: 'prompt-1', order_index: 0, is_required: true }], error: null }) }
    const prompts = { select: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: [{ id: 'prompt-1', source_key: 'writing', title: 'Writing', skill: 'writing', presentation_type: 'long_form_prompt', grading_mode: 'sample_compare', is_published: false }], error: null }) }
    const samples = { select: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: [{ id: 'sample-1', prompt_id: 'prompt-1', title: 'Bài mẫu', content: 'Dear ...' }], error: null }) }
    from.mockReturnValueOnce(exam as never).mockReturnValueOnce(sections as never).mockReturnValueOnce(prompts as never).mockReturnValueOnce(samples as never)

    await expect(adminExamContentService.getExamContent('exam-1')).resolves.toMatchObject({
      sections: [{ resource: { id: 'prompt-1', samples: [{ id: 'sample-1' }] } }],
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

  it('persists structured inline-gap blocks for an activity without exposing a raw editor', async () => {
    const update = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) }
    from.mockReturnValueOnce(update as never)
    const blocks = [{ type: 'inline_gap_passage', segments: [{ type: 'text', value: 'I like ' }, { type: 'gap', gapId: 'q-1', label: '1' }] }]

    await expect(adminExamContentService.updateResourceContent({
      resourceKind: 'activity', resourceId: 'activity-1', contentBlocks: blocks,
    })).resolves.toBeUndefined()

    expect(from).toHaveBeenCalledWith('practice_activities')
    expect(update.update).toHaveBeenCalledWith({ content_blocks: blocks })
  })

  it('updates accepted text answers for a visual inline gap', async () => {
    const update = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) }
    from.mockReturnValueOnce(update as never)

    await expect(adminExamContentService.updateQuestion('question-1', { accepted_answers: ['football', 'soccer'] })).resolves.toBeUndefined()

    expect(update.update).toHaveBeenCalledWith({ accepted_answers: ['football', 'soccer'] })
  })

  it('persists the requested B1 section order with consecutive positions', async () => {
    const firstUpdate = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) }
    const secondUpdate = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) }
    const finalFirstUpdate = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) }
    const finalSecondUpdate = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) }
    from.mockReturnValueOnce(firstUpdate as never).mockReturnValueOnce(secondUpdate as never)
      .mockReturnValueOnce(finalFirstUpdate as never).mockReturnValueOnce(finalSecondUpdate as never)

    await expect(adminExamContentService.reorderSections(['section-2', 'section-1'])).resolves.toBeUndefined()

    expect(from).toHaveBeenNthCalledWith(1, 'exam_sections')
    expect(firstUpdate.update).toHaveBeenCalledWith({ order_index: 1000000 })
    expect(firstUpdate.eq).toHaveBeenCalledWith('id', 'section-2')
    expect(from).toHaveBeenNthCalledWith(2, 'exam_sections')
    expect(secondUpdate.update).toHaveBeenCalledWith({ order_index: 1000001 })
    expect(secondUpdate.eq).toHaveBeenCalledWith('id', 'section-1')
    expect(from).toHaveBeenNthCalledWith(3, 'exam_sections')
    expect(finalFirstUpdate.update).toHaveBeenCalledWith({ order_index: 1 })
    expect(from).toHaveBeenNthCalledWith(4, 'exam_sections')
    expect(finalSecondUpdate.update).toHaveBeenCalledWith({ order_index: 2 })
  })

  it('creates a draft objective section with an editable starter question', async () => {
    const activity = { insert: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'activity-2' }, error: null }) }
    const question = { insert: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'question-2' }, error: null }) }
    const section = { insert: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'section-2', source_key: 'new-grammar', skill: 'grammar', title: 'Ngữ pháp mới', resource_type: 'activity', resource_id: 'activity-2', order_index: 18, is_required: true, suggested_time_minutes: null }, error: null }) }
    from.mockReturnValueOnce(activity as never).mockReturnValueOnce(question as never).mockReturnValueOnce(section as never)

    await expect(adminExamContentService.createSection({
      examId: 'exam-1', sourceKey: 'new-grammar', title: 'Ngữ pháp mới', skill: 'grammar', presentationType: 'choice_list', orderIndex: 18,
    })).resolves.toMatchObject({ id: 'section-2', resource_id: 'activity-2' })

    expect(activity.insert).toHaveBeenCalledWith(expect.objectContaining({
      source_key: 'new-grammar', skill: 'grammar', title: 'Ngữ pháp mới', activity_type: 'multiple_choice',
      presentation_type: 'choice_list', grading_mode: 'single_choice', is_published: false,
    }))
    expect(question.insert).toHaveBeenCalledWith(expect.objectContaining({
      activity_id: 'activity-2', source_key: 'new-grammar-q1', question_type: 'multiple_choice', order_index: 0,
    }))
    expect(section.insert).toHaveBeenCalledWith(expect.objectContaining({
      exam_id: 'exam-1', source_key: 'new-grammar', resource_type: 'activity', resource_id: 'activity-2', order_index: 18,
    }))
  })

  it('updates a Writing or Speaking prompt and its learner instructions', async () => {
    const update = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) }
    from.mockReturnValueOnce(update as never)

    await expect(adminExamContentService.updatePromptText('prompt-1', {
      prompt: 'Write about your hobby.', instructions: 'Write 100 words.',
    })).resolves.toBeUndefined()

    expect(from).toHaveBeenCalledWith('practice_prompts')
    expect(update.update).toHaveBeenCalledWith({ prompt: 'Write about your hobby.', instructions: 'Write 100 words.' })
  })

  it('loads prompt samples in a stable order for a Writing or Speaking prompt', async () => {
    const samples = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ id: 'sample-1', prompt_id: 'prompt-1', title: 'Bài mẫu 1', content: 'Dear ...', created_at: '2026-07-28T00:00:00Z', updated_at: '2026-07-28T00:00:00Z' }],
        error: null,
      }),
    }
    from.mockReturnValueOnce(samples as never)

    await expect(adminExamContentService.listPromptSamples('prompt-1')).resolves.toMatchObject([{ id: 'sample-1', title: 'Bài mẫu 1' }])

    expect(from).toHaveBeenCalledWith('practice_prompt_samples')
    expect(samples.eq).toHaveBeenCalledWith('prompt_id', 'prompt-1')
    expect(samples.order).toHaveBeenCalledWith('created_at')
  })

  it('creates a prompt sample without requiring an admin to use raw content storage', async () => {
    const insert = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'sample-1', prompt_id: 'prompt-1', title: 'Bài mẫu 1', content: 'Dear ...', created_at: '2026-07-28T00:00:00Z', updated_at: '2026-07-28T00:00:00Z' },
        error: null,
      }),
    }
    from.mockReturnValueOnce(insert as never)

    await expect(adminExamContentService.savePromptSample({
      promptId: 'prompt-1', title: 'Bài mẫu 1', content: 'Dear ...',
    })).resolves.toMatchObject({ id: 'sample-1', prompt_id: 'prompt-1' })

    expect(insert.insert).toHaveBeenCalledWith({ prompt_id: 'prompt-1', title: 'Bài mẫu 1', content: 'Dear ...' })
  })

  it('updates and deletes an existing prompt sample', async () => {
    const update = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'sample-1', prompt_id: 'prompt-1', title: 'Bài mẫu mới', content: 'Updated', created_at: '2026-07-28T00:00:00Z', updated_at: '2026-07-28T00:01:00Z' }, error: null }) }
    const remove = { delete: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) }
    from.mockReturnValueOnce(update as never).mockReturnValueOnce(remove as never)

    await expect(adminExamContentService.savePromptSample({ id: 'sample-1', promptId: 'prompt-1', title: 'Bài mẫu mới', content: 'Updated' })).resolves.toMatchObject({ title: 'Bài mẫu mới' })
    await expect(adminExamContentService.deletePromptSample('sample-1')).resolves.toBeUndefined()

    expect(update.update).toHaveBeenCalledWith({ title: 'Bài mẫu mới', content: 'Updated' })
    expect(update.eq).toHaveBeenCalledWith('id', 'sample-1')
    expect(remove.delete).toHaveBeenCalledOnce()
    expect(remove.eq).toHaveBeenCalledWith('id', 'sample-1')
  })
})
