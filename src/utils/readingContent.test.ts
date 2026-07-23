import { describe, expect, it } from 'vitest'
import {
  buildReadingOption,
  isRestrictedReadingTier,
  normalizeReadingContent,
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
