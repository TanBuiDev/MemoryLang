import { PRESENTATION_REGISTRY } from './presentationRegistry'
import type { ExamPresentationType } from '@/types/exam.types'

interface AttemptPresentationInput {
  resourceType: 'activity' | 'prompt'
  sectionSkill: string
  resource: {
    presentation_type?: string | null
    activity_type?: string | null
    passage?: string | null
    content?: string | null
  }
}

function isPresentationType(value: string | null | undefined): value is ExamPresentationType {
  return Boolean(value && value in PRESENTATION_REGISTRY)
}

export function resolveAttemptPresentation({
  resourceType,
  sectionSkill,
  resource,
}: AttemptPresentationInput): ExamPresentationType {
  if (isPresentationType(resource.presentation_type)) return resource.presentation_type

  if (resourceType === 'prompt') {
    return sectionSkill === 'speaking' ? 'speaking_script_prompt' : 'long_form_prompt'
  }

  if (resource.activity_type === 'sentence_transformation') return 'sentence_transformation'
  if (sectionSkill === 'transformation') return 'sentence_transformation'
  if (sectionSkill === 'signs') return 'image_choice_list'
  if (sectionSkill === 'cloze') return 'passage_choice_inline'
  if (resource.activity_type === 'true_false') return 'boolean_list'
  if (resource.activity_type === 'fill_blank') {
    return resource.passage || resource.content ? 'passage_text_inline' : 'short_answer_list'
  }
  if (sectionSkill === 'reading' && resource.passage) return 'passage_questions'
  return 'choice_list'
}

export function isInlineGapPresentation(type: ExamPresentationType): boolean {
  return type === 'passage_choice_inline' || type === 'passage_text_inline'
}

export function isLongFormPresentation(type: ExamPresentationType): boolean {
  return type === 'long_form_prompt' || type === 'speaking_script_prompt'
}
