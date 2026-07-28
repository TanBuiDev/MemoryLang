const UNSAFE_TAGS = new Set(['script', 'style', 'iframe', 'object', 'embed', 'link', 'meta'])

export function getRichPassageHtml(contentBlocks: unknown): string | null {
  if (!Array.isArray(contentBlocks)) return null
  const block = contentBlocks.find((item): item is Record<string, unknown> => (
    Boolean(item)
    && typeof item === 'object'
    && (item as Record<string, unknown>).type === 'rich_text'
    && typeof (item as Record<string, unknown>).value === 'string'
  ))
  return typeof block?.value === 'string' && block.value.trim() ? block.value : null
}

export function sanitizeRichPassageHtml(value: string): string {
  const template = document.createElement('template')
  template.innerHTML = value

  template.content.querySelectorAll('*').forEach((element) => {
    if (UNSAFE_TAGS.has(element.tagName.toLowerCase())) {
      element.remove()
      return
    }
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.trim().toLowerCase()
      if (name.startsWith('on') || ((name === 'href' || name === 'src') && value.startsWith('javascript:'))) {
        element.removeAttribute(attribute.name)
      }
    })
  })

  return template.innerHTML
}
