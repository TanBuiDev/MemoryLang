import { describe, expect, it } from 'vitest'
import { isB1ContentArtifact } from './exam.types'

describe('isB1ContentArtifact', () => {
  it('accepts a linked draft exam with activities and prompts', () => {
    expect(isB1ContentArtifact({
      source: { file_name: 'DeFull Copy.pdf', page_count: 18 },
      exam: { source_key: 'b1-de-full-copy', title: 'B1 Tổng hợp', default_time_minutes: 120 },
      activities: [{
        source_key: 'b1-grammar-use-of-english',
        skill: 'grammar',
        activity_type: 'multiple_choice',
        title: 'Grammar and Use of English',
        questions: [{
          source_key: 'grammar-101',
          source_number: '101',
          question_type: 'multiple_choice',
          prompt: 'Andrew managed ___ a promotion.',
          options: [
            { key: 'A', text: 'in getting', is_correct: false },
            { key: 'B', text: 'to get', is_correct: true },
          ],
          accepted_answers: [],
          source_page: 1,
          image_url: null,
        }],
      }],
      prompts: [],
      sections: [{
        source_key: 'section-grammar',
        skill: 'grammar',
        resource_type: 'activity',
        resource_source_key: 'b1-grammar-use-of-english',
        order_index: 1,
        is_required: true,
      }],
    })).toBe(true)
  })

  it('rejects a multiple-choice question without exactly one correct answer', () => {
    const invalid = {
      source: { file_name: 'DeFull Copy.pdf', page_count: 18 },
      exam: { source_key: 'b1', title: 'B1', default_time_minutes: 120 },
      activities: [{
        source_key: 'a',
        skill: 'grammar',
        activity_type: 'multiple_choice',
        title: 'A',
        questions: [{
          source_key: 'q',
          source_number: '1',
          question_type: 'multiple_choice',
          prompt: 'Question',
          options: [],
          accepted_answers: [],
          source_page: 1,
          image_url: null,
        }],
      }],
      prompts: [],
      sections: [],
    }

    expect(isB1ContentArtifact(invalid)).toBe(false)
  })
})
