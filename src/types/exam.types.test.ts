import { describe, expect, it } from 'vitest'
import { isB1ContentArtifact } from './exam.types'

function validLinkedArtifact() {
  return {
    source: { file_name: 'DeFull Copy.pdf', page_count: 18 },
    exam: { source_key: 'b1-de-full-copy', title: 'B1 Tổng hợp', default_time_minutes: 120 },
    activities: [{
      source_key: 'b1-grammar-use-of-english',
      skill: 'grammar',
      activity_type: 'multiple_choice',
      title: 'Grammar and Use of English',
      instructions: 'Choose the best answer.',
      content: 'Grammar source content.',
      passage: null,
      audio_url: null,
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
    prompts: [{
      source_key: 'writing-topic-7',
      skill: 'writing',
      title: 'Writing Topic 7',
      prompt: 'Write an email.',
      source_page: 10,
      image_url: null,
      audio_url: null,
    }],
    sections: [
      {
        source_key: 'section-grammar-1',
        skill: 'grammar',
        resource_type: 'activity',
        resource_source_key: 'b1-grammar-use-of-english',
        order_index: 1,
        is_required: true,
      },
      {
        source_key: 'section-writing',
        skill: 'writing',
        resource_type: 'prompt',
        resource_source_key: 'writing-topic-7',
        order_index: 2,
        is_required: true,
      },
    ],
  }
}

describe('isB1ContentArtifact', () => {
  it('accepts a linked draft exam with activities and prompts', () => {
    expect(isB1ContentArtifact(validLinkedArtifact())).toBe(true)
  })

  it('rejects duplicate section order indexes', () => {
    const invalid = validLinkedArtifact()
    invalid.sections[1].order_index = invalid.sections[0].order_index

    expect(isB1ContentArtifact(invalid)).toBe(false)
  })

  it('rejects a section skill that differs from its resource', () => {
    const invalid = validLinkedArtifact()
    invalid.sections[0].skill = 'reading'

    expect(isB1ContentArtifact(invalid)).toBe(false)
  })

  it('rejects a prompt section skill that differs from its resource', () => {
    const invalid = validLinkedArtifact()
    invalid.sections[1].skill = 'speaking'

    expect(isB1ContentArtifact(invalid)).toBe(false)
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

  it('rejects invalid activity and prompt content fields', () => {
    const invalid = {
      source: { file_name: 'DeFull Copy.pdf', page_count: 18 },
      exam: { source_key: 'b1', title: 'B1', default_time_minutes: 120 },
      activities: [{
        source_key: 'listening-text-1',
        skill: 'listening',
        activity_type: 'fill_blank',
        title: 'Listening Text 1',
        audio_url: 42,
        passage: [],
        questions: [],
      }],
      prompts: [{
        source_key: 'writing-topic-7',
        skill: 'writing',
        title: 'Writing Topic 7',
        prompt: 'Write an email.',
        source_page: 10,
        image_url: null,
        audio_url: { url: 'invalid' },
      }],
      sections: [],
    }

    expect(isB1ContentArtifact(invalid)).toBe(false)
  })

  it('rejects invalid source provenance metadata', () => {
    const invalid = {
      source: {
        file_name: 'DeFull Copy.pdf',
        page_count: 18,
        provenance: {
          annotation_count: -1,
          extraction: 'text layer',
          answer_source: 'PDF annotations',
          excluded_source_numbers: { signs: [11, 12, 13, 14, 15] },
        },
      },
      exam: { source_key: 'b1', title: 'B1', default_time_minutes: 120 },
      activities: [],
      prompts: [],
      sections: [],
    }

    expect(isB1ContentArtifact(invalid)).toBe(false)
  })
})
