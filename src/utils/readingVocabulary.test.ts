import { describe, expect, it } from 'vitest'
import { annotateReadingHtml } from '@/utils/readingVocabulary'

const terms = [
  { global_term_id: 'term-grace', normalized_text: 'grace' },
  { global_term_id: 'term-work', normalized_text: 'work' },
]

describe('annotateReadingHtml', () => {
  it('annotates repeated whole words without changing punctuation or casing', () => {
    const result = annotateReadingHtml('<p>Grace works with grace.</p>', terms)
    const container = document.createElement('div')
    container.innerHTML = result

    const matches = container.querySelectorAll('[data-reading-term-id="term-grace"]')
    expect(matches).toHaveLength(2)
    expect(matches[0].textContent).toBe('Grace')
    expect(matches[1].textContent).toBe('grace')
    expect(matches[0].getAttribute('style')).not.toContain('text-decoration')
    expect(container.textContent).toBe('Grace works with grace.')
  })

  it('matches whole words only and leaves HTML attributes untouched', () => {
    const result = annotateReadingHtml(
      '<p title="grace">Graceful work should work.</p><code>work</code>',
      terms
    )
    const container = document.createElement('div')
    container.innerHTML = result

    expect(container.querySelector('p')?.getAttribute('title')).toBe('grace')
    expect(container.querySelectorAll('[data-reading-term-id="term-grace"]')).toHaveLength(0)
    expect(container.querySelectorAll('[data-reading-term-id="term-work"]')).toHaveLength(2)
    expect(container.querySelector('code [data-reading-term-id]')).toBeNull()
  })
})
