import type { ExamGradingMode, ExamPresentationType } from '@/types/exam.types'
import {
  choiceListContentSchema,
  inlineGapContentSchema,
  longFormPromptContentSchema,
} from './schemas/presentationSchemas'

export interface PresentationDefinition {
  type: ExamPresentationType
  label: string
  description: string
  compatibleGradingModes: readonly ExamGradingMode[]
  requiresStructuredGaps: boolean
  resourceKind: 'activity' | 'prompt'
  isReadyForPublication?: boolean
}

const sharedChoiceModes: readonly ExamGradingMode[] = ['single_choice']

export const PRESENTATION_REGISTRY: Record<ExamPresentationType, PresentationDefinition> = {
  choice_list: {
    type: 'choice_list', label: 'Chọn một đáp án', description: 'Câu hỏi độc lập cùng các lựa chọn.',
    compatibleGradingModes: sharedChoiceModes, requiresStructuredGaps: false, resourceKind: 'activity',
  },
  boolean_list: {
    type: 'boolean_list', label: 'Đúng hoặc sai', description: 'Mỗi câu có hai lựa chọn đúng/sai.',
    compatibleGradingModes: sharedChoiceModes, requiresStructuredGaps: false, resourceKind: 'activity',
  },
  image_choice_list: {
    type: 'image_choice_list', label: 'Ảnh hoặc biển báo và đáp án', description: 'Ảnh đi kèm câu hỏi chọn đáp án.',
    compatibleGradingModes: sharedChoiceModes, requiresStructuredGaps: false, resourceKind: 'activity',
  },
  passage_choice_inline: {
    type: 'passage_choice_inline', label: 'Chọn đáp án trong đoạn văn', description: 'Mỗi ô trống trong passage nhận một lựa chọn.',
    compatibleGradingModes: sharedChoiceModes, requiresStructuredGaps: true, resourceKind: 'activity', isReadyForPublication: false,
  },
  passage_text_inline: {
    type: 'passage_text_inline', label: 'Điền từ trong đoạn văn', description: 'Học viên điền đáp án trực tiếp vào từng ô trống.',
    compatibleGradingModes: ['exact_text', 'normalized_text'], requiresStructuredGaps: true, resourceKind: 'activity',
  },
  passage_questions: {
    type: 'passage_questions', label: 'Đọc đoạn văn và trả lời', description: 'Đoạn đọc đi kèm danh sách câu hỏi.',
    compatibleGradingModes: sharedChoiceModes, requiresStructuredGaps: false, resourceKind: 'activity',
  },
  sentence_transformation: {
    type: 'sentence_transformation', label: 'Viết lại câu với từ gợi ý', description: 'Câu gốc, từ khóa và ô nhập phần viết lại.',
    compatibleGradingModes: ['exact_text', 'normalized_text'], requiresStructuredGaps: false, resourceKind: 'activity',
  },
  short_answer_list: {
    type: 'short_answer_list', label: 'Câu trả lời ngắn', description: 'Danh sách các ô nhập câu trả lời ngắn.',
    compatibleGradingModes: ['exact_text', 'normalized_text'], requiresStructuredGaps: false, resourceKind: 'activity', isReadyForPublication: false,
  },
  long_form_prompt: {
    type: 'long_form_prompt', label: 'Viết bài', description: 'Đề bài dài, autosave phiên bản và bài mẫu.',
    compatibleGradingModes: ['manual', 'sample_compare'], requiresStructuredGaps: false, resourceKind: 'prompt',
  },
  speaking_script_prompt: {
    type: 'speaking_script_prompt', label: 'Chuẩn bị bài nói', description: 'Đề nói, script nháp và bài mẫu.',
    compatibleGradingModes: ['manual', 'sample_compare'], requiresStructuredGaps: false, resourceKind: 'prompt',
  },
  matching: {
    type: 'matching', label: 'Ghép cặp', description: 'Ghép hai danh sách nội dung tương ứng.',
    compatibleGradingModes: ['matching'], requiresStructuredGaps: false, resourceKind: 'activity', isReadyForPublication: false,
  },
  ordering: {
    type: 'ordering', label: 'Sắp xếp', description: 'Sắp xếp các mục theo thứ tự đúng.',
    compatibleGradingModes: ['ordered_list'], requiresStructuredGaps: false, resourceKind: 'activity', isReadyForPublication: false,
  },
}

export function getPresentationDefinition(type: ExamPresentationType): PresentationDefinition {
  return PRESENTATION_REGISTRY[type]
}

export function isGradingModeCompatible(type: ExamPresentationType, gradingMode: ExamGradingMode): boolean {
  return getPresentationDefinition(type).compatibleGradingModes.includes(gradingMode)
}

export function isPresentationReadyForPublication(type: ExamPresentationType): boolean {
  return getPresentationDefinition(type).isReadyForPublication !== false
}

export function validatePresentationContent(type: ExamPresentationType, value: unknown) {
  switch (type) {
    case 'choice_list':
    case 'boolean_list':
    case 'image_choice_list':
    case 'passage_questions':
      return choiceListContentSchema.safeParse(value)
    case 'passage_choice_inline':
    case 'passage_text_inline':
      return inlineGapContentSchema.safeParse(value)
    case 'long_form_prompt':
    case 'speaking_script_prompt':
      return longFormPromptContentSchema.safeParse(value)
    default:
      return longFormPromptContentSchema.safeParse(value)
  }
}
