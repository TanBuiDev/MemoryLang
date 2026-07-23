import type { SelectOption } from '@/components/ui/select'

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
