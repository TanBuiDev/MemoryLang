import { describe, expect, it } from 'vitest'
import {
  getPresentationDefinition,
  isGradingModeCompatible,
  validatePresentationContent,
} from './presentationRegistry'

describe('presentationRegistry', () => {
  it('describes the inline-text passage as a normalized-text compatible presentation', () => {
    const definition = getPresentationDefinition('passage_text_inline')

    expect(definition.label).toBe('Điền từ trong đoạn văn')
    expect(definition.compatibleGradingModes).toContain('normalized_text')
    expect(definition.requiresStructuredGaps).toBe(true)
    expect(isGradingModeCompatible('passage_text_inline', 'single_choice')).toBe(false)
  })

  it('rejects a choice-list payload without one correct option', () => {
    const result = validatePresentationContent('choice_list', {
      blocks: [{ type: 'question_list' }],
      questions: [{ id: 'question-1', prompt: 'Choose.', options: [{ id: 'a', text: 'A' }] }],
    })

    expect(result.success).toBe(false)
  })

  it('accepts a structured inline gap rather than a regex placeholder', () => {
    const result = validatePresentationContent('passage_text_inline', {
      blocks: [{
        type: 'inline_gap_passage',
        segments: [
          { type: 'text', value: 'I have to ' },
          { type: 'gap', gapId: 'gap-1', label: '1' },
          { type: 'text', value: ' early.' },
        ],
      }],
      gaps: [{ id: 'gap-1', acceptedAnswers: ['get up'] }],
    })

    expect(result.success).toBe(true)
  })
})
