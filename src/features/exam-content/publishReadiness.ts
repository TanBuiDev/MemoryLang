import { isGradingModeCompatible } from './presentationRegistry'
import type { ExamGradingMode, ExamPresentationType, ExamResourceType, ExamSkill } from '@/types/exam.types'

export interface PublishReadinessIssue {
  severity: 'error' | 'warning'
  sectionId: string
  message: string
}

export interface PublishReadinessQuestion {
  id: string
  prompt: string
  options?: Array<{ key: string; text: string; is_correct: boolean }>
  accepted_answers?: string[]
  acceptedAnswers?: string[]
  translation?: string | null
  explanation?: string | null
  image_url?: string | null
}

export interface PublishReadinessResource {
  id: string
  kind: ExamResourceType
  presentation_type: ExamPresentationType | null
  grading_mode: ExamGradingMode | null
  audio_url?: string | null
  prompt?: string | null
  instructions?: string | null
  content?: string | null
  passage?: string | null
  content_blocks?: unknown
  samples?: Array<{ id: string }>
  questions: PublishReadinessQuestion[]
}

export interface PublishReadinessExam {
  sections: Array<{
    id: string
    title: string
    skill: ExamSkill
    is_required: boolean
    resource: PublishReadinessResource | null
  }>
}

const textTypes = new Set<ExamPresentationType>(['passage_text_inline', 'sentence_transformation', 'short_answer_list'])
const choiceTypes = new Set<ExamPresentationType>(['choice_list', 'boolean_list', 'image_choice_list', 'passage_choice_inline', 'passage_questions'])
const promptTypes = new Set<ExamPresentationType>(['long_form_prompt', 'speaking_script_prompt'])

function questionAnswers(question: PublishReadinessQuestion): string[] {
  return question.accepted_answers ?? question.acceptedAnswers ?? []
}

export function getExamPublishReadiness(exam: PublishReadinessExam): { canPublish: boolean; issues: PublishReadinessIssue[] } {
  const issues: PublishReadinessIssue[] = []
  for (const section of exam.sections) {
    if (!section.is_required) continue
    const resource = section.resource
    if (!resource) {
      issues.push({ severity: 'error', sectionId: section.id, message: `${section.title}: chưa có nội dung section.` })
      continue
    }
    if (!resource.presentation_type || !resource.grading_mode) {
      issues.push({ severity: 'error', sectionId: section.id, message: `${section.title}: chưa chọn cách trình bày hoặc cách chấm.` })
      continue
    }
    if (!isGradingModeCompatible(resource.presentation_type, resource.grading_mode)) {
      issues.push({ severity: 'error', sectionId: section.id, message: `${section.title}: cách chấm không tương thích với cách trình bày.` })
    }
    if (section.skill === 'listening' && !resource.audio_url) {
      issues.push({ severity: 'error', sectionId: section.id, message: `${section.title}: thiếu audio bắt buộc cho phần Listening.` })
    }
    if (promptTypes.has(resource.presentation_type)) {
      if (!resource.prompt?.trim()) issues.push({ severity: 'error', sectionId: section.id, message: `${section.title}: chưa có đề bài.` })
      if (!resource.instructions?.trim()) issues.push({ severity: 'error', sectionId: section.id, message: `${section.title}: chưa có hướng dẫn cho học viên.` })
      if (resource.grading_mode === 'sample_compare' && !(resource.samples?.length)) {
        issues.push({ severity: 'error', sectionId: section.id, message: `${section.title}: cần ít nhất một bài mẫu để học viên so sánh.` })
      }
      continue
    }
    if (!resource.questions.length) {
      issues.push({ severity: 'error', sectionId: section.id, message: `${section.title}: chưa có câu hỏi.` })
      continue
    }
    if (['passage_text_inline', 'passage_choice_inline', 'passage_questions'].includes(resource.presentation_type)
      && !resource.passage?.trim() && !resource.content?.trim() && !Array.isArray(resource.content_blocks)) {
      issues.push({ severity: 'error', sectionId: section.id, message: `${section.title}: thiếu đoạn văn hoặc content block.` })
    }
    resource.questions.forEach((question, index) => {
      const number = index + 1
      if (!question.prompt.trim()) issues.push({ severity: 'error', sectionId: section.id, message: `${section.title}, câu ${number}: chưa có nội dung câu hỏi.` })
      if (choiceTypes.has(resource.presentation_type!)) {
        const options = question.options ?? []
        if (options.length < 2 || options.some((option) => !option.text.trim())) {
          issues.push({ severity: 'error', sectionId: section.id, message: `${section.title}, câu ${number}: cần tối thiểu hai lựa chọn hợp lệ.` })
        }
        if (options.filter((option) => option.is_correct).length !== 1) {
          issues.push({ severity: 'error', sectionId: section.id, message: `${section.title}, câu ${number}: cần đúng một đáp án đúng.` })
        }
        if (resource.presentation_type === 'image_choice_list' && !question.image_url) {
          issues.push({ severity: 'error', sectionId: section.id, message: `${section.title}, câu ${number}: thiếu ảnh/biển báo.` })
        }
      }
      if (textTypes.has(resource.presentation_type!) && questionAnswers(question).every((answer) => !answer.trim())) {
        issues.push({ severity: 'error', sectionId: section.id, message: `${section.title}, câu ${number}: chưa có đáp án chấp nhận.` })
      }
      if (!question.translation?.trim()) issues.push({ severity: 'error', sectionId: section.id, message: `${section.title}, câu ${number}: thiếu bản dịch.` })
      if (!question.explanation?.trim()) issues.push({ severity: 'error', sectionId: section.id, message: `${section.title}, câu ${number}: thiếu lời giải chi tiết.` })
    })
  }
  return { canPublish: !issues.some((issue) => issue.severity === 'error'), issues }
}
