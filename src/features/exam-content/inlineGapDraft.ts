export type InlineGapSegment =
  | { type: 'text'; value: string }
  | { type: 'gap'; gapId: string; label: string }

export interface InlineGapDraftGap {
  id: string
  label: string
  acceptedAnswers: string[]
}

export interface InlineGapDraft {
  segments: InlineGapSegment[]
  gaps: InlineGapDraftGap[]
}

interface InlineGapQuestionSeed {
  id: string
  source_number?: string | null
  accepted_answers?: string[]
}

export function createInlineGapDraft(text: string, questions: InlineGapQuestionSeed[]): InlineGapDraft {
  const questionByNumber = new Map(questions.map((question, index) => [question.source_number ?? String(index + 1), question]))
  const segments: InlineGapSegment[] = []
  const gaps: InlineGapDraftGap[] = []
  const marker = /(\((\d+)\)\s*(?:_{2,}|\.{3,}))/g
  let previousIndex = 0
  let match: RegExpExecArray | null

  while ((match = marker.exec(text)) !== null) {
    if (match.index > previousIndex) segments.push({ type: 'text', value: text.slice(previousIndex, match.index) })
    const label = match[2]
    const question = questionByNumber.get(label)
    const gapId = question?.id ?? `gap-${label}`
    segments.push({ type: 'gap', gapId, label })
    gaps.push({ id: gapId, label, acceptedAnswers: question?.accepted_answers ?? [] })
    previousIndex = match.index + match[1].length
  }

  if (previousIndex < text.length || segments.length === 0) {
    segments.push({ type: 'text', value: text.slice(previousIndex) })
  }

  return { segments, gaps }
}

export function serializeInlineGapDraft(draft: InlineGapDraft) {
  return {
    blocks: [{ type: 'inline_gap_passage' as const, segments: draft.segments }],
    gaps: draft.gaps.map((gap) => ({ id: gap.id, acceptedAnswers: gap.acceptedAnswers })),
  }
}
