import { describe, expect, it } from 'vitest'
import { getPresentationConfigurationIssue } from './presentationFallback'

describe('getPresentationConfigurationIssue', () => {
  it('explains when an objective presentation has no questions to render', () => {
    expect(getPresentationConfigurationIssue('choice_list', { questions: [] }))
      .toBe('Phần chọn đáp án này chưa có câu hỏi hợp lệ.')
  })

  it('explains when an inline passage has no passage text', () => {
    expect(getPresentationConfigurationIssue('passage_text_inline', { questions: [{ source_key: 'q1' }] }))
      .toBe('Phần điền đáp án này chưa có đoạn văn hợp lệ.')
  })

  it('accepts a structured inline-passage block without a legacy passage field', () => {
    expect(getPresentationConfigurationIssue('passage_text_inline', {
      content_blocks: [{ type: 'inline_gap_passage', segments: [{ type: 'text', value: 'Hello' }] }],
      questions: [{ source_key: 'q1' }],
    } as never)).toBeNull()
  })

  it('explains when a long-form prompt is empty', () => {
    expect(getPresentationConfigurationIssue('speaking_script_prompt', { prompt: '  ' }))
      .toBe('Phần bài nói này chưa có đề bài hợp lệ.')
  })

  it('leaves matching and ordering validation to their typed renderers', () => {
    expect(getPresentationConfigurationIssue('matching', {})).toBeNull()
    expect(getPresentationConfigurationIssue('ordering', {})).toBeNull()
  })
})
