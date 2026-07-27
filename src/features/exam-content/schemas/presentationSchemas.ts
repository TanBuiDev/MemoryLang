import { z } from 'zod'

const textSegmentSchema = z.object({
  type: z.literal('text'),
  value: z.string().min(1),
})

const gapSegmentSchema = z.object({
  type: z.literal('gap'),
  gapId: z.string().min(1),
  label: z.string().min(1),
})

const inlineGapPassageBlockSchema = z.object({
  type: z.literal('inline_gap_passage'),
  segments: z.array(z.discriminatedUnion('type', [textSegmentSchema, gapSegmentSchema])).min(1),
})

const questionListBlockSchema = z.object({
  type: z.literal('question_list'),
})

const choiceQuestionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  options: z.array(z.object({
    id: z.string().min(1),
    text: z.string().min(1),
    isCorrect: z.boolean(),
  })).min(2),
}).refine(
  (question) => question.options.filter((option) => option.isCorrect).length === 1,
  'Mỗi câu chọn đáp án phải có đúng một đáp án đúng.',
)

export const choiceListContentSchema = z.object({
  blocks: z.array(questionListBlockSchema).min(1),
  questions: z.array(choiceQuestionSchema).min(1),
})

export const inlineGapContentSchema = z.object({
  blocks: z.array(inlineGapPassageBlockSchema).min(1),
  gaps: z.array(z.object({
    id: z.string().min(1),
    acceptedAnswers: z.array(z.string().min(1)).min(1),
  })).min(1),
}).superRefine((content, ctx) => {
  const segmentGapIds = content.blocks
    .flatMap((block) => block.segments)
    .filter((segment): segment is z.infer<typeof gapSegmentSchema> => segment.type === 'gap')
    .map((segment) => segment.gapId)
  const configuredGapIds = content.gaps.map((gap) => gap.id)

  if (new Set(segmentGapIds).size !== segmentGapIds.length) {
    ctx.addIssue({ code: 'custom', message: 'Mỗi ô trống chỉ được xuất hiện một lần trong passage.' })
  }
  if (segmentGapIds.some((gapId) => !configuredGapIds.includes(gapId))) {
    ctx.addIssue({ code: 'custom', message: 'Mỗi ô trống trong passage phải có đáp án.' })
  }
})

export const longFormPromptContentSchema = z.object({
  blocks: z.array(z.object({
    type: z.enum(['rich_text', 'audio', 'image', 'callout']),
    value: z.string().min(1),
  })).min(1),
  prompt: z.string().min(1),
})
