import { describe, expect, it } from 'vitest'
import {
  isB1ContentArtifact,
  type B1ExamCloneSource,
  type B1InitializationMode,
  type Exam,
  type ExamAttempt,
  type ExamAttemptStatus,
  type ExamFormat,
  type PracticeDraftVersion,
} from './exam.types'

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

  it('rejects a prompt with a non-writing or non-speaking skill', () => {
    const invalid = validLinkedArtifact()
    invalid.prompts[0].skill = 'grammar'
    invalid.sections[1].skill = 'grammar'

    expect(isB1ContentArtifact(invalid)).toBe(false)
  })

  it('rejects a question source page outside the 18-page PDF', () => {
    const invalid = validLinkedArtifact()
    invalid.activities[0].questions[0].source_page = 19

    expect(isB1ContentArtifact(invalid)).toBe(false)
  })

  it('rejects a prompt source page outside the 18-page PDF', () => {
    const invalid = validLinkedArtifact()
    invalid.prompts[0].source_page = 19

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

describe('learner B1 attempt contracts', () => {
  it('models an in-progress attempt with a server-owned target duration', () => {
    const status: ExamAttemptStatus = 'in_progress'
    const attempt: ExamAttempt = {
      id: 'attempt-1',
      exam_id: 'exam-1',
      user_id: 'user-1',
      status,
      target_duration_seconds: 7200,
      exam_snapshot: { sections: [] },
      current_section_source_key: null,
      started_at: '2026-07-27T00:00:00.000Z',
      last_activity_at: '2026-07-27T00:00:00.000Z',
      submitted_at: null,
      elapsed_seconds: 0,
      overtime_seconds: 0,
      created_at: '2026-07-27T00:00:00.000Z',
      updated_at: '2026-07-27T00:00:00.000Z',
    }

    expect(attempt.target_duration_seconds).toBe(7200)
    expect(attempt.status).toBe('in_progress')
  })

  it('models immutable writing and speaking draft snapshots', () => {
    const version: PracticeDraftVersion = {
      id: 'version-1',
      user_id: 'user-1',
      prompt_id: 'prompt-1',
      version_number: 3,
      content: 'My revised response.',
      word_count: 4,
      created_at: '2026-07-27T00:00:00.000Z',
    }

    expect(version.version_number).toBe(3)
    expect(version.word_count).toBe(4)
  })
})

describe('B1 exam creation contracts', () => {
  it('models explicit legacy and B1 clone metadata', () => {
    const legacyFormat: ExamFormat = 'legacy'
    const cloneMode: B1InitializationMode = 'full_content'
    const legacyExam: Exam = {
      id: 'exam-legacy-1',
      title: 'Legacy exam',
      category: 'GENERAL',
      description: null,
      source_key: null,
      cefr_level: null,
      default_time_minutes: null,
      time_limit_minutes: 60,
      total_questions: 20,
      is_published: true,
      access_tier: 'free',
      exam_format: legacyFormat,
      cloned_from_exam_id: null,
      clone_mode: null,
      created_by: null,
      created_at: '2026-08-01T00:00:00.000Z',
      updated_at: '2026-08-01T00:00:00.000Z',
      deleted_at: null,
    }
    const cloneSource: B1ExamCloneSource = {
      id: 'exam-source-1',
      title: 'B1 source exam',
      is_published: true,
      section_count: 8,
      updated_at: '2026-08-01T00:00:00.000Z',
    }
    const exam: Exam = {
      id: 'exam-1',
      title: 'B1 clone',
      category: 'GENERAL',
      description: null,
      source_key: null,
      cefr_level: 'B1',
      default_time_minutes: 120,
      time_limit_minutes: 120,
      total_questions: 0,
      is_published: false,
      access_tier: 'free',
      created_by: null,
      created_at: '2026-08-01T00:00:00.000Z',
      updated_at: '2026-08-01T00:00:00.000Z',
      deleted_at: null,
      exam_format: 'b1_practice',
      cloned_from_exam_id: cloneSource.id,
      clone_mode: cloneMode,
    }

    expect(legacyFormat).toBe('legacy')
    expect(legacyExam.cloned_from_exam_id).toBeNull()
    expect(exam.clone_mode).toBe('full_content')
    expect(cloneSource.section_count).toBe(8)
  })
})
