import type { ExamPresentationType } from '@/types/exam.types'

interface PresentationResourcePreview {
  prompt?: string | null
  passage?: string | null
  content?: string | null
  questions?: unknown[] | null
}

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim())
}

function hasQuestions(resource: PresentationResourcePreview) {
  return Array.isArray(resource.questions) && resource.questions.length > 0
}

export function getPresentationConfigurationIssue(
  presentationType: ExamPresentationType,
  resource: PresentationResourcePreview,
): string | null {
  if (presentationType === 'long_form_prompt' && !hasText(resource.prompt)) {
    return 'Phần bài viết này chưa có đề bài hợp lệ.'
  }

  if (presentationType === 'speaking_script_prompt' && !hasText(resource.prompt)) {
    return 'Phần bài nói này chưa có đề bài hợp lệ.'
  }

  if (presentationType === 'passage_choice_inline' || presentationType === 'passage_text_inline') {
    if (!hasText(resource.passage) && !hasText(resource.content)) {
      return 'Phần điền đáp án này chưa có đoạn văn hợp lệ.'
    }
    if (!hasQuestions(resource)) return 'Phần điền đáp án này chưa có ô đáp án hợp lệ.'
    return null
  }

  if (['choice_list', 'boolean_list', 'image_choice_list', 'passage_questions', 'sentence_transformation', 'short_answer_list'].includes(presentationType) && !hasQuestions(resource)) {
    return presentationType === 'sentence_transformation'
      ? 'Phần viết lại câu này chưa có câu hỏi hợp lệ.'
      : 'Phần chọn đáp án này chưa có câu hỏi hợp lệ.'
  }

  return null
}
