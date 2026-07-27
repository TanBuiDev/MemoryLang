import { describe, expect, it } from 'vitest'
import { createInlineGapDraft, serializeInlineGapDraft } from './inlineGapDraft'

describe('inline gap draft', () => {
  it('turns a legacy passage into labelled visual gaps without requiring an admin to edit markers', () => {
    const draft = createInlineGapDraft('I like (1) ____ after school.', [{ id: 'q-1', source_number: '1', accepted_answers: ['football'] }])

    expect(draft.segments).toEqual([
      { type: 'text', value: 'I like ' },
      { type: 'gap', gapId: 'q-1', label: '1' },
      { type: 'text', value: ' after school.' },
    ])
    expect(draft.gaps).toEqual([{ id: 'q-1', label: '1', acceptedAnswers: ['football'] }])
  })

  it('serializes the visual gap model into the structured resource contract', () => {
    const content = serializeInlineGapDraft({
      segments: [{ type: 'text', value: 'I like ' }, { type: 'gap', gapId: 'q-1', label: '1' }],
      gaps: [{ id: 'q-1', label: '1', acceptedAnswers: ['football'] }],
    })

    expect(content).toEqual({
      blocks: [{ type: 'inline_gap_passage', segments: [{ type: 'text', value: 'I like ' }, { type: 'gap', gapId: 'q-1', label: '1' }] }],
      gaps: [{ id: 'q-1', acceptedAnswers: ['football'] }],
    })
  })
})
