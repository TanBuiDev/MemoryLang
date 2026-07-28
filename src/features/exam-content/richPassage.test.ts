import { describe, expect, it } from 'vitest'
import { getRichPassageHtml, sanitizeRichPassageHtml } from './richPassage'

describe('rich passage content blocks', () => {
  it('extracts a rich-text content block without depending on a legacy passage field', () => {
    expect(getRichPassageHtml([{ type: 'rich_text', value: '<p>A reading passage</p>' }]))
      .toBe('<p>A reading passage</p>')
  })

  it('removes executable markup and event handlers before learner rendering', () => {
    expect(sanitizeRichPassageHtml('<p onclick="alert(1)">Safe</p><script>alert(1)</script><a href="javascript:alert(1)">Link</a>'))
      .toBe('<p>Safe</p><a>Link</a>')
  })
})
