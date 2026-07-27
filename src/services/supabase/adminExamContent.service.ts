import { getPresentationDefinition, isGradingModeCompatible } from '@/features/exam-content/presentationRegistry'
import { supabase } from '@/services/supabase/client'
import type { ExamGradingMode, ExamPresentationType, ExamResourceType, ExamSkill, PracticePromptSample } from '@/types/exam.types'

export interface AdminExamContentQuestion {
  id: string
  activity_id: string
  source_key: string
  prompt: string
  source_number?: string | null
  question_type?: string
  options?: unknown
  accepted_answers?: string[]
  translation?: string | null
  explanation?: string | null
  image_url?: string | null
  order_index: number
}

export interface AdminExamContentResource {
  id: string
  source_key: string
  title: string
  skill: ExamSkill
  kind: ExamResourceType
  presentation_type: ExamPresentationType | null
  grading_mode: ExamGradingMode | null
  is_published: boolean
  activity_type?: string | null
  instructions?: string | null
  content?: string | null
  passage?: string | null
  prompt?: string | null
  audio_url?: string | null
  content_blocks?: unknown
  presentation_config?: Record<string, unknown>
  review_config?: Record<string, unknown>
  samples?: PracticePromptSample[]
  questions: AdminExamContentQuestion[]
}

export interface AdminExamContentSection {
  id: string
  source_key: string
  skill: ExamSkill
  title: string
  resource_type: ExamResourceType
  resource_id: string
  order_index: number
  is_required: boolean
  suggested_time_minutes: number | null
  resource: AdminExamContentResource | null
}

export interface AdminExamContentExam {
  id: string
  title: string
  source_key: string | null
  is_published: boolean
  sections: AdminExamContentSection[]
}

async function throwOnError<T>(result: { data: T | null; error: unknown }, fallback: string): Promise<T> {
  if (result.error) throw result.error
  if (result.data === null || result.data === undefined) throw new Error(fallback)
  return result.data
}

function getStarterActivityType(presentationType: ExamPresentationType) {
  if (presentationType === 'boolean_list') return 'true_false'
  if (presentationType === 'passage_text_inline') return 'fill_blank'
  if (presentationType === 'sentence_transformation') return 'short_text'
  return 'multiple_choice'
}

function getStarterOptions(presentationType: ExamPresentationType) {
  if (presentationType === 'boolean_list') {
    return [
      { key: 'A', text: 'Đúng', is_correct: true },
      { key: 'B', text: 'Sai', is_correct: false },
    ]
  }
  if (presentationType === 'passage_text_inline' || presentationType === 'sentence_transformation') return []
  return [
    { key: 'A', text: '', is_correct: true },
    { key: 'B', text: '', is_correct: false },
    { key: 'C', text: '', is_correct: false },
    { key: 'D', text: '', is_correct: false },
  ]
}

export const adminExamContentService = {
  async getExamContent(examId: string): Promise<AdminExamContentExam> {
    const exam = await throwOnError(
      await supabase.from('exams').select('id,title,source_key,is_published').eq('id', examId).single(),
      'Không tìm thấy đề thi.',
    ) as Omit<AdminExamContentExam, 'sections'>
    const sections = await throwOnError(
      await supabase.from('exam_sections').select('*').eq('exam_id', examId).order('order_index'),
      'Không thể tải cấu trúc đề thi.',
    ) as AdminExamContentSection[]

    const activityIds = sections
      .filter((section) => section.resource_type === 'activity')
      .map((section) => section.resource_id)
    const promptIds = sections
      .filter((section) => section.resource_type === 'prompt')
      .map((section) => section.resource_id)

    const activityRows = activityIds.length > 0
      ? await throwOnError(
        await supabase.from('practice_activities').select('*').in('id', activityIds),
        'Không thể tải nội dung hoạt động.',
      ) as Array<Omit<AdminExamContentResource, 'kind' | 'questions'>>
      : []
    const promptRows = promptIds.length > 0
      ? await throwOnError(
        await supabase.from('practice_prompts').select('*').in('id', promptIds),
        'Không thể tải nội dung Writing/Speaking.',
      ) as Array<Omit<AdminExamContentResource, 'kind' | 'questions'>>
      : []
    const promptSamples = promptIds.length > 0
      ? await throwOnError<PracticePromptSample[]>(
        await supabase.from('practice_prompt_samples').select('*').in('prompt_id', promptIds),
        'Không thể tải bài mẫu Writing/Speaking.',
      )
      : []
    const questions = activityIds.length > 0
      ? await throwOnError(
        await supabase.from('practice_questions').select('*').in('activity_id', activityIds).order('order_index'),
        'Không thể tải câu hỏi.',
      ) as AdminExamContentQuestion[]
      : []

    const activitiesById = new Map(activityRows.map((resource) => [resource.id, resource]))
    const promptsById = new Map(promptRows.map((resource) => [resource.id, resource]))
    const questionsByActivityId = new Map<string, AdminExamContentQuestion[]>()
    const samplesByPromptId = new Map<string, PracticePromptSample[]>()
    questions.forEach((question) => {
      const current = questionsByActivityId.get(question.activity_id) ?? []
      current.push(question)
      questionsByActivityId.set(question.activity_id, current)
    })
    promptSamples.forEach((sample) => {
      const current = samplesByPromptId.get(sample.prompt_id) ?? []
      current.push(sample)
      samplesByPromptId.set(sample.prompt_id, current)
    })

    return {
      ...exam,
      sections: sections.map((section) => {
        const rawResource = section.resource_type === 'activity'
          ? activitiesById.get(section.resource_id)
          : promptsById.get(section.resource_id)
        return {
          ...section,
          resource: rawResource
            ? {
              ...rawResource,
              kind: section.resource_type,
              questions: section.resource_type === 'activity'
                ? questionsByActivityId.get(rawResource.id) ?? []
                : [],
              ...(section.resource_type === 'prompt'
                ? { samples: samplesByPromptId.get(rawResource.id) ?? [] }
                : {}),
            }
            : null,
        }
      }),
    }
  },

  async updateResourcePresentation(input: {
    resourceKind: ExamResourceType
    resourceId: string
    presentationType: ExamPresentationType
    gradingMode: ExamGradingMode
  }): Promise<void> {
    if (!isGradingModeCompatible(input.presentationType, input.gradingMode)) {
      throw new Error('Kiểu chấm điểm không tương thích với cách trình bày đã chọn.')
    }
    const table = input.resourceKind === 'activity' ? 'practice_activities' : 'practice_prompts'
    const { error } = await supabase
      .from(table)
      .update({ presentation_type: input.presentationType, grading_mode: input.gradingMode })
      .eq('id', input.resourceId)
    if (error) throw error
  },

  async reorderSections(sectionIds: string[]): Promise<void> {
    for (const [index, sectionId] of sectionIds.entries()) {
      const { error } = await supabase
        .from('exam_sections')
        .update({ order_index: 1_000_000 + index })
        .eq('id', sectionId)
      if (error) throw error
    }
    for (const [index, sectionId] of sectionIds.entries()) {
      const { error } = await supabase
        .from('exam_sections')
        .update({ order_index: index + 1 })
        .eq('id', sectionId)
      if (error) throw error
    }
  },

  async createSection(input: {
    examId: string
    sourceKey: string
    title: string
    skill: ExamSkill
    presentationType: ExamPresentationType
    orderIndex: number
  }): Promise<AdminExamContentSection> {
    const definition = getPresentationDefinition(input.presentationType)
    const gradingMode = definition.compatibleGradingModes[0]
    const resource = definition.resourceKind === 'activity'
      ? await throwOnError<{ id: string }>(
        await supabase.from('practice_activities').insert({
          source_key: input.sourceKey,
          skill: input.skill,
          title: input.title,
          activity_type: getStarterActivityType(input.presentationType),
          presentation_type: input.presentationType,
          grading_mode: gradingMode,
          is_published: false,
        }).select().single(),
        'Không thể tạo nội dung section.',
      )
      : await throwOnError<{ id: string }>(
        await supabase.from('practice_prompts').insert({
          source_key: input.sourceKey,
          skill: input.skill,
          title: input.title,
          prompt: '',
          presentation_type: input.presentationType,
          grading_mode: gradingMode,
          is_published: false,
        }).select().single(),
        'Không thể tạo nội dung section.',
      )

    if (definition.resourceKind === 'activity') {
      const activityType = getStarterActivityType(input.presentationType)
      await throwOnError(
        await supabase.from('practice_questions').insert({
          activity_id: resource.id,
          source_key: `${input.sourceKey}-q1`,
          source_number: '1',
          question_type: activityType,
          prompt: '',
          options: getStarterOptions(input.presentationType),
          accepted_answers: [],
          order_index: 0,
        }).select().single(),
        'Không thể tạo câu hỏi khởi đầu.',
      )
    }

    return throwOnError<AdminExamContentSection>(
      await supabase.from('exam_sections').insert({
        exam_id: input.examId,
        source_key: input.sourceKey,
        skill: input.skill,
        title: input.title,
        resource_type: definition.resourceKind,
        resource_id: resource.id,
        order_index: input.orderIndex,
        is_required: true,
      }).select().single(),
      'Không thể thêm section vào đề thi.',
    )
  },

  async deleteSection(sectionId: string): Promise<void> {
    const { error } = await supabase
      .from('exam_sections')
      .delete()
      .eq('id', sectionId)
    if (error) throw error
  },

  async createQuestion(input: {
    activityId: string
    sourceKey: string
    sourceNumber: string
    presentationType: ExamPresentationType
    orderIndex: number
  }): Promise<AdminExamContentQuestion> {
    const { data, error } = await supabase
      .from('practice_questions')
      .insert({
        activity_id: input.activityId,
        source_key: input.sourceKey,
        source_number: input.sourceNumber,
        question_type: getStarterActivityType(input.presentationType),
        prompt: '',
        options: getStarterOptions(input.presentationType),
        accepted_answers: [],
        order_index: input.orderIndex,
      })
      .select()
      .single()
    if (error) throw error
    if (!data) throw new Error('Không thể tạo câu hỏi.')
    return data as AdminExamContentQuestion
  },

  async updateQuestion(
    questionId: string,
    input: Partial<Pick<AdminExamContentQuestion, 'prompt' | 'options' | 'translation' | 'explanation' | 'accepted_answers'>>,
  ): Promise<void> {
    const { error } = await supabase
      .from('practice_questions')
      .update(input)
      .eq('id', questionId)
    if (error) throw error
  },

  async updateResourceContent(input: {
    resourceKind: ExamResourceType
    resourceId: string
    contentBlocks: unknown[]
  }): Promise<void> {
    const table = input.resourceKind === 'activity' ? 'practice_activities' : 'practice_prompts'
    const { error } = await supabase
      .from(table)
      .update({ content_blocks: input.contentBlocks })
      .eq('id', input.resourceId)
    if (error) throw error
  },

  async updatePromptText(promptId: string, input: { prompt: string; instructions: string }): Promise<void> {
    const { error } = await supabase
      .from('practice_prompts')
      .update(input)
      .eq('id', promptId)
    if (error) throw error
  },

  async listPromptSamples(promptId: string): Promise<PracticePromptSample[]> {
    return throwOnError<PracticePromptSample[]>(
      await supabase
        .from('practice_prompt_samples')
        .select('*')
        .eq('prompt_id', promptId)
        .order('created_at'),
      'Không thể tải bài mẫu.',
    )
  },

  async savePromptSample(input: {
    id?: string
    promptId: string
    title: string
    content: string
  }): Promise<PracticePromptSample> {
    if (input.id) {
      return throwOnError<PracticePromptSample>(
        await supabase
          .from('practice_prompt_samples')
          .update({ title: input.title, content: input.content })
          .eq('id', input.id)
          .select()
          .single(),
        'Không thể cập nhật bài mẫu.',
      )
    }

    return throwOnError<PracticePromptSample>(
      await supabase
        .from('practice_prompt_samples')
        .insert({ prompt_id: input.promptId, title: input.title, content: input.content })
        .select()
        .single(),
      'Không thể tạo bài mẫu.',
    )
  },

  async deletePromptSample(sampleId: string): Promise<void> {
    const { error } = await supabase
      .from('practice_prompt_samples')
      .delete()
      .eq('id', sampleId)
    if (error) throw error
  },
}
