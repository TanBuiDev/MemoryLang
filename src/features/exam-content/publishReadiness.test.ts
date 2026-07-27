import { describe, expect, it } from 'vitest'
import { getExamPublishReadiness } from './publishReadiness'

describe('getExamPublishReadiness', () => {
  it('blocks publication when a required Listening section has no audio', () => {
    const readiness = getExamPublishReadiness({
      sections: [{ id: 'section-1', title: 'Listening Text 1', skill: 'listening', is_required: true, resource: {
        id: 'activity-1', kind: 'activity', presentation_type: 'choice_list', grading_mode: 'single_choice', audio_url: null,
        questions: [{ id: 'q-1', prompt: 'Choose one', options: [{ key: 'A', text: 'First', is_correct: true }, { key: 'B', text: 'Second', is_correct: false }], accepted_answers: [], translation: 'Chọn một.', explanation: 'A đúng.' }],
      }}],
    })

    expect(readiness.canPublish).toBe(false)
    expect(readiness.issues).toContainEqual(expect.objectContaining({ severity: 'error', message: expect.stringMatching(/audio/i) }))
  })

  it('requires a correct answer and detailed review content for objective questions', () => {
    const readiness = getExamPublishReadiness({
      sections: [{ id: 'section-1', title: 'Grammar', skill: 'grammar', is_required: true, resource: {
        id: 'activity-1', kind: 'activity', presentation_type: 'choice_list', grading_mode: 'single_choice', audio_url: null,
        questions: [{ id: 'q-1', prompt: 'Choose one', options: [{ key: 'A', text: 'First', is_correct: false }, { key: 'B', text: 'Second', is_correct: false }], accepted_answers: [], translation: null, explanation: null }],
      }}],
    })

    expect(readiness.canPublish).toBe(false)
    expect(readiness.issues.map((issue) => issue.message)).toEqual(expect.arrayContaining([
      expect.stringMatching(/đáp án đúng/i), expect.stringMatching(/bản dịch/i), expect.stringMatching(/lời giải/i),
    ]))
  })

  it('requires a sample when a Writing or Speaking prompt uses sample comparison', () => {
    const readiness = getExamPublishReadiness({
      sections: [{ id: 'section-1', title: 'Writing Topic 7', skill: 'writing', is_required: true, resource: {
        id: 'prompt-1', kind: 'prompt', presentation_type: 'long_form_prompt', grading_mode: 'sample_compare', prompt: 'Write an email.', instructions: 'Write 100 words.', samples: [], questions: [],
      }}],
    })

    expect(readiness.canPublish).toBe(false)
    expect(readiness.issues).toContainEqual(expect.objectContaining({ severity: 'error', message: expect.stringMatching(/bài mẫu/i) }))
  })

  it('accepts a complete required section and ignores an incomplete optional section', () => {
    const readiness = getExamPublishReadiness({
      sections: [
        { id: 'section-1', title: 'Writing Topic 7', skill: 'writing', is_required: true, resource: {
          id: 'prompt-1', kind: 'prompt', presentation_type: 'long_form_prompt', grading_mode: 'sample_compare', prompt: 'Write an email.', instructions: 'Write 100 words.', samples: [{ id: 'sample-1' }], questions: [],
        }},
        { id: 'section-2', title: 'Extra', skill: 'reading', is_required: false, resource: null },
      ],
    })

    expect(readiness.canPublish).toBe(true)
  })
})
