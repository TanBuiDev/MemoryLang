import { describe, expect, it } from 'vitest'
import { fillReadingQuizBlanks } from '@/utils/readingQuizContent'
import type { ReadingQuestion } from '@/types/reading.types'

const questions: ReadingQuestion[] = [
  {
    id: 'q1',
    article_id: 'article-1',
    question_text: 'Chọn đáp án cho chỗ trống (1)',
    question_type: 'multiple_choice',
    options: [
      { text: 'to', is_correct: true },
      { text: 'off', is_correct: false },
    ],
    order_index: 1,
    points: 1,
  },
  {
    id: 'q2',
    article_id: 'article-1',
    question_text: 'Chọn đáp án cho chỗ trống (2)',
    question_type: 'multiple_choice',
    options: [
      { text: 'a very long correct answer', is_correct: true },
      { text: 'short', is_correct: false },
    ],
    order_index: 2,
    points: 1,
  },
]

describe('fillReadingQuizBlanks', () => {
  it('replaces numbered blanks with highlighted correct answers', () => {
    const result = fillReadingQuizBlanks(
      '<p>William rang (1) __________ an ambulance and gave (2) __________.</p>',
      questions
    )
    const doc = new DOMParser().parseFromString(result, 'text/html')

    expect(doc.body.textContent).toContain('William rang (1) to an ambulance')
    expect(doc.body.textContent).toContain('(2) a very long correct answer.')
    expect(
      Array.from(doc.querySelectorAll('[data-reading-quiz-answer]')).map(
        (node) => node.textContent
      )
    ).toEqual(['to', 'a very long correct answer'])
  })

  it('leaves unmatched blanks unchanged', () => {
    expect(fillReadingQuizBlanks('<p>Unknown (3) ________.</p>', questions))
      .toContain('(3) ________')
  })

  it('inserts space after answer marker when adjacent text has no leading space', () => {
    const result = fillReadingQuizBlanks(
      '<p>he (1) ____________the emergency services</p>',
      questions
    )
    const doc = new DOMParser().parseFromString(result, 'text/html')
    expect(doc.body.textContent).toBe('he (1) to the emergency services')
  })
})

