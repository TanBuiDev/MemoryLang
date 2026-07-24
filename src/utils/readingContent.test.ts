import { describe, expect, it } from 'vitest'
import {
  buildReadingOption,
  cleanPastedText,
  isRestrictedReadingTier,
  normalizeReadingContent,
  prepareTextForTts,
} from '@/utils/readingContent'

describe('normalizeReadingContent', () => {
  it('converts pasted plain text paragraphs to safe HTML and plain text', () => {
    expect(normalizeReadingContent('First <idea>.\n\nSecond paragraph.')).toEqual({
      contentHtml: '<p>First &lt;idea&gt;.</p><p>Second paragraph.</p>',
      plainText: 'First <idea>. Second paragraph.',
    })
  })

  it('preserves HTML input while deriving readable plain text', () => {
    expect(normalizeReadingContent('<h2>Heading</h2><p>Hello <strong>world</strong>.</p>')).toEqual({
      contentHtml: '<h2>Heading</h2><p>Hello <strong>world</strong>.</p>',
      plainText: 'Heading Hello world.',
    })
  })
})

describe('buildReadingOption', () => {
  it('creates a normalized custom option and keeps its display label', () => {
    expect(buildReadingOption('Exam Preparation', 'Luyện thi chuyên sâu')).toEqual({
      value: 'exam-preparation',
      label: 'Luyện thi chuyên sâu',
    })
  })

  it('rejects an empty option', () => {
    expect(() => buildReadingOption('   ', '')).toThrow('Giá trị tùy chọn không được để trống.')
  })
})

describe('isRestrictedReadingTier', () => {
  it('keeps Free public and treats every custom tier as restricted by default', () => {
    expect(isRestrictedReadingTier('free')).toBe(false)
    expect(isRestrictedReadingTier('pro')).toBe(true)
    expect(isRestrictedReadingTier('enterprise')).toBe(true)
  })
})

describe('prepareTextForTts', () => {
  it('fills correct answers into blanks and strips question markers (1), (2) for smooth TTS reading', () => {
    const html = '<p>William quickly rang (1) ____________ an ambulance when he discovered (2) ____________.</p>'
    const questions = [
      {
        id: 'q1',
        article_id: 'art-1',
        question_text: 'Blank 1',
        question_type: 'multiple_choice' as const,
        options: [
          { text: 'called', is_correct: true },
          { text: 'texted', is_correct: false },
        ],
        order_index: 1,
        points: 1,
      },
      {
        id: 'q2',
        article_id: 'art-1',
        question_text: 'Blank 2',
        question_type: 'multiple_choice' as const,
        options: [
          { text: 'her leg was broken', is_correct: true },
        ],
        order_index: 2,
        points: 1,
      },
    ]

    expect(prepareTextForTts(html, questions)).toBe(
      'William quickly rang called an ambulance when he discovered her leg was broken.'
    )
  })
})

describe('cleanPastedText', () => {
  it('converts non-breaking spaces and collapses multi-spaces into single spaces', () => {
    const raw = 'Fill\u00A0 in\u00A0 each\u00A0 numbered\u00A0 blank\u00A0 with\u00A0 one\u00A0 suitable\u00A0 word\u00A0 or\u00A0 phrase.'
    expect(cleanPastedText(raw)).toBe(
      'Fill in each numbered blank with one suitable word or phrase.'
    )
  })

  it('collapses multi-space strings and converts tabs/newlines to single space', () => {
    const raw = 'Fill   in   each\t\tnumbered\nblank'
    expect(cleanPastedText(raw)).toBe('Fill in each numbered blank')
  })
})

