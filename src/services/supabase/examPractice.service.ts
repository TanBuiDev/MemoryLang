import { supabase } from '@/services/supabase/client'
import type {
  Exam,
  ExamAttempt,
  ExamSectionAttempt,
  ExamSectionAttemptStatus,
  PracticeDraftVersion,
} from '@/types/exam.types'

export interface SaveExamSectionProgressInput {
  attemptId: string
  sectionSourceKey: string
  progress: Record<string, unknown>
  status?: ExamSectionAttemptStatus
  draftVersionId?: string | null
}

export interface LearnerExamAttemptDetail {
  attempt: ExamAttempt
  sections: ExamSectionAttempt[]
}

export const examPracticeService = {
  async listAvailableExams(): Promise<Exam[]> {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('cefr_level', 'B1')
      .eq('is_published', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as Exam[]
  },

  async startAttempt(examId: string, targetDurationSeconds: number): Promise<ExamAttempt> {
    const { data, error } = await supabase.rpc('start_b1_exam_attempt', {
      p_exam_id: examId,
      p_target_duration_seconds: targetDurationSeconds,
    })

    if (error) throw error
    return data as ExamAttempt
  },

  async getAttempt(attemptId: string): Promise<LearnerExamAttemptDetail | null> {
    const { data: attempt, error: attemptError } = await supabase
      .from('exam_attempts')
      .select('*')
      .eq('id', attemptId)
      .maybeSingle()

    if (attemptError) throw attemptError
    if (!attempt) return null

    const { data: sections, error: sectionsError } = await supabase
      .from('exam_section_attempts')
      .select('*')
      .eq('attempt_id', attemptId)
      .order('created_at', { ascending: true })

    if (sectionsError) throw sectionsError
    return {
      attempt: attempt as ExamAttempt,
      sections: (sections ?? []) as ExamSectionAttempt[],
    }
  },

  async saveSectionProgress(input: SaveExamSectionProgressInput): Promise<ExamSectionAttempt> {
    const { data, error } = await supabase.rpc('save_b1_section_attempt_progress', {
      p_attempt_id: input.attemptId,
      p_exam_section_source_key: input.sectionSourceKey,
      p_progress: input.progress,
      p_status: input.status ?? 'in_progress',
      p_draft_version_id: input.draftVersionId ?? null,
    })

    if (error) throw error
    return data as ExamSectionAttempt
  },

  async listDraftVersions(promptId: string): Promise<PracticeDraftVersion[]> {
    const { data, error } = await supabase
      .from('practice_draft_versions')
      .select('*')
      .eq('prompt_id', promptId)
      .order('version_number', { ascending: false })

    if (error) throw error
    return (data ?? []) as PracticeDraftVersion[]
  },

  async createDraftVersion(promptId: string, content: string): Promise<PracticeDraftVersion> {
    const { data, error } = await supabase.rpc('create_practice_draft_version', {
      p_prompt_id: promptId,
      p_content: content,
    })

    if (error) throw error
    return data as PracticeDraftVersion
  },
}
