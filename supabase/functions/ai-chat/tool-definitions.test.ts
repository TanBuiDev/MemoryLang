import { describe, expect, it } from 'vitest'
import { validateToolCall } from './tool-definitions'

describe('validateToolCall', () => {
  it('accepts the overview tool without arguments', () => {
    expect(validateToolCall({ name: 'get_learning_overview', args: {} })).toEqual({
      ok: true,
      value: { name: 'get_learning_overview', args: {} },
    })
  })

  it('clamps a review queue limit to the safe maximum', () => {
    expect(validateToolCall({ name: 'get_review_queue', args: { kind: 'due', limit: 99 } })).toEqual({
      ok: true,
      value: { name: 'get_review_queue', args: { kind: 'due', limit: 10 } },
    })
  })

  it('rejects an unrecognised tool', () => {
    expect(validateToolCall({ name: 'delete_all_terms', args: {} })).toEqual({
      ok: false,
      message: 'Unsupported AI Tutor tool.',
    })
  })

  it('rejects an empty vocabulary search query', () => {
    expect(validateToolCall({ name: 'search_my_vocabulary', args: { query: '   ' } })).toEqual({
      ok: false,
      message: 'Vocabulary search query must contain 1 to 80 characters.',
    })
  })
})
