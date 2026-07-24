import type { SelectOption } from '@/components/ui/select'
import type { ReadingQuestion } from '@/types/reading.types'
import { fillReadingQuizBlanks } from '@/utils/readingQuizContent'

const HTML_TAG_PATTERN = /<\/?(?:p|div|h[1-6]|ul|ol|li|blockquote|pre|strong|em|b|i|u|a|br|span)(?:\s[^>]*)?>/i

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function htmlToPlainText(value: string): string {
  const container = document.createElement('div')
  container.innerHTML = value.replace(/<\/(?:p|div|h[1-6]|li|blockquote|pre)>/gi, '$& ')
  return (container.textContent || '').replace(/\s+/g, ' ').trim()
}

export function normalizeReadingContent(value: string): {
  contentHtml: string
  plainText: string
} {
  const trimmed = value.trim()

  if (HTML_TAG_PATTERN.test(trimmed)) {
    return {
      contentHtml: trimmed,
      plainText: htmlToPlainText(trimmed),
    }
  }

  const paragraphs = trimmed
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  return {
    contentHtml: paragraphs
      .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
      .join(''),
    plainText: paragraphs.join(' ').replace(/\s+/g, ' ').trim(),
  }
}

export function buildReadingOption(value: string, label: string): SelectOption {
  const normalizedValue = value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!normalizedValue) {
    throw new Error('Giá trị tùy chọn không được để trống.')
  }

  return {
    value: normalizedValue,
    label: label.trim() || value.trim(),
  }
}

export function isRestrictedReadingTier(tier: string): boolean {
  return tier !== 'free'
}

export function prepareTextForTts(
  htmlOrText: string,
  questions?: ReadingQuestion[]
): string {
  let source = htmlOrText || ''

  if (questions && questions.length > 0) {
    source = fillReadingQuizBlanks(source, questions)
  }

  const container = document.createElement('div')
  container.innerHTML = source.replace(/<\/(?:p|div|h[1-6]|li|blockquote|pre)>/gi, '$& ')
  let text = (container.textContent || '').replace(/\s+/g, ' ').trim()

  return text
    .replace(/\(\s*\d+\s*\)/g, '')
    .replace(/\[\s*\d+\s*\]/g, '')
    .replace(/_{2,}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function cleanPastedText(value: string): string {
  return value
    .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF\u00AD]/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/ {2,}/g, ' ')
}

