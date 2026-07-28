import { describe, expect, it } from 'vitest'
import {
  getPresentationDefinition,
  isPresentationReadyForPublication,
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

  it('marks only presentations without a complete renderer chain as unavailable for publication', () => {
    expect(isPresentationReadyForPublication('choice_list')).toBe(true)
    expect(isPresentationReadyForPublication('matching')).toBe(true)
    expect(isPresentationReadyForPublication('ordering')).toBe(false)
  })

  it('validates explicit matching pairs and an ordered item list', () => {
    const matching = validatePresentationContent('matching', {
      leftItems: [{ id: 'left-1', text: 'English' }],
      rightItems: [{ id: 'right-1', text: 'Tiếng Anh' }],
      pairs: [{ leftId: 'left-1', rightId: 'right-1' }],
    })
    const ordering = validatePresentationContent('ordering', {
      items: [
        { id: 'step-1', text: 'First', correctPosition: 1 },
        { id: 'step-2', text: 'Second', correctPosition: 2 },
      ],
    })

    expect(matching.success).toBe(true)
    expect(ordering.success).toBe(true)
  })

  it('rejects a matching configuration that reuses one answer for multiple prompts', () => {
    const matching = validatePresentationContent('matching', {
      leftItems: [{ id: 'left-1', text: 'Monday' }, { id: 'left-2', text: 'Tuesday' }],
      rightItems: [{ id: 'right-1', text: 'Thứ Hai' }, { id: 'right-2', text: 'Thứ Ba' }],
      pairs: [{ leftId: 'left-1', rightId: 'right-1' }, { leftId: 'left-2', rightId: 'right-1' }],
    })

    expect(matching.success).toBe(false)
  })
})
