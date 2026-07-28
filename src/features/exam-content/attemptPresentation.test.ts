import { describe, expect, it } from 'vitest'
import { resolveAttemptPresentation } from './attemptPresentation'

describe('resolveAttemptPresentation', () => {
  it('uses the presentation type embedded in a new learner snapshot', () => {
    expect(resolveAttemptPresentation({
      resourceType: 'activity',
      sectionSkill: 'listening',
      resource: { presentation_type: 'passage_text_inline', activity_type: 'multiple_choice' },
    })).toBe('passage_text_inline')
  })

  it('keeps legacy attempts working by deriving a sentence transformation from skill', () => {
    expect(resolveAttemptPresentation({
      resourceType: 'activity',
      sectionSkill: 'transformation',
      resource: { activity_type: 'fill_blank' },
    })).toBe('sentence_transformation')
  })

  it('treats a legacy speaking prompt as a speaking script workspace', () => {
    expect(resolveAttemptPresentation({
      resourceType: 'prompt',
      sectionSkill: 'speaking',
      resource: {},
    })).toBe('speaking_script_prompt')
  })

  it('uses the inline-gap renderer for a legacy snapshot that only has structured content blocks', () => {
    expect(resolveAttemptPresentation({
      resourceType: 'activity',
      sectionSkill: 'listening',
      resource: {
        activity_type: 'fill_blank',
        content_blocks: [{ type: 'inline_gap_passage', segments: [{ type: 'text', value: 'I like ' }] }],
      } as never,
    })).toBe('passage_text_inline')
  })
})
