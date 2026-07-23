import { describe, expect, it } from 'vitest'
import { parseBulkReadingQuestions } from '@/utils/readingQuestionImport'

describe('parseBulkReadingQuestions', () => {
  it('parses numbered A-D choices with multi-word answers', () => {
    expect(
      parseBulkReadingQuestions(
        '1. A. to B. off C. for D. with\n2) A) called back B) looked after C) waited for D) ran into'
      )
    ).toEqual([
      {
        number: 1,
        questionText: 'Chọn đáp án phù hợp cho chỗ trống (1)',
        options: ['to', 'off', 'for', 'with'],
        sourceLine: '1. A. to B. off C. for D. with',
        error: null,
      },
      {
        number: 2,
        questionText: 'Chọn đáp án phù hợp cho chỗ trống (2)',
        options: ['called back', 'looked after', 'waited for', 'ran into'],
        sourceLine: '2) A) called back B) looked after C) waited for D) ran into',
        error: null,
      },
    ])
  })

  it('keeps invalid lines visible with a helpful error', () => {
    expect(parseBulkReadingQuestions('3. A. one B. two')).toEqual([
      {
        number: 3,
        questionText: 'Chọn đáp án phù hợp cho chỗ trống (3)',
        options: ['one', 'two'],
        sourceLine: '3. A. one B. two',
        error: 'Cần đủ 4 lựa chọn A, B, C và D.',
      },
    ])
  })

  it('ignores blank lines and reports text without a question number', () => {
    expect(parseBulkReadingQuestions('\nA. one B. two C. three D. four\n')).toEqual([
      {
        number: null,
        questionText: '',
        options: ['one', 'two', 'three', 'four'],
        sourceLine: 'A. one B. two C. three D. four',
        error: 'Không tìm thấy số câu ở đầu dòng.',
      },
    ])
  })

  it('supports choices wrapped in parentheses', () => {
    expect(
      parseBulkReadingQuestions('4: (A) first (B) second (C) third (D) fourth')[0]
        .options
    ).toEqual(['first', 'second', 'third', 'fourth'])
  })

  it('rejects duplicated choice labels even when four values are present', () => {
    expect(
      parseBulkReadingQuestions('5. A. one A. two C. three D. four')[0].error
    ).toBe('Cần đủ 4 lựa chọn A, B, C và D.')
  })
})
