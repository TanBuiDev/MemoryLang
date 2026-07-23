export interface ReadingVocabularyMatch {
  global_term_id: string
  normalized_text: string
}

const WORD_PATTERN = /[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu
const SKIPPED_ANCESTORS = new Set(['A', 'BUTTON', 'CODE', 'PRE', 'SCRIPT', 'STYLE'])

export function annotateReadingHtml(
  html: string,
  terms: ReadingVocabularyMatch[]
): string {
  if (!html || terms.length === 0) return html

  const termIds = new Map(
    terms.map((term) => [term.normalized_text.trim().toLocaleLowerCase('en'), term.global_term_id])
  )
  const doc = document.implementation.createHTMLDocument('')
  doc.body.innerHTML = html

  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
  const textNodes: Text[] = []
  let currentNode = walker.nextNode()
  while (currentNode) {
    textNodes.push(currentNode as Text)
    currentNode = walker.nextNode()
  }

  textNodes.forEach((textNode) => {
    const parent = textNode.parentElement
    if (
      !parent
      || parent.closest('[data-reading-term-id]')
      || Array.from(SKIPPED_ANCESTORS).some((tag) => parent.closest(tag.toLowerCase()))
    ) {
      return
    }

    const source = textNode.data
    const fragment = doc.createDocumentFragment()
    let lastIndex = 0
    let hasMatch = false

    for (const match of source.matchAll(WORD_PATTERN)) {
      const token = match[0]
      const start = match.index ?? 0
      const termId = termIds.get(token.toLocaleLowerCase('en'))
      if (!termId) continue

      hasMatch = true
      fragment.append(source.slice(lastIndex, start))

      const marker = doc.createElement('span')
      marker.setAttribute('role', 'button')
      marker.setAttribute('tabindex', '0')
      marker.setAttribute('data-reading-term-id', termId)
      marker.className = 'reading-vocabulary-term'
      marker.setAttribute(
        'style',
        'text-decoration-line: underline; text-decoration-style: dotted; text-decoration-thickness: 2px; text-underline-offset: 4px; cursor: pointer; font-weight: 700;'
      )
      marker.textContent = token
      fragment.append(marker)
      lastIndex = start + token.length
    }

    if (hasMatch) {
      fragment.append(source.slice(lastIndex))
      textNode.replaceWith(fragment)
    }
  })

  return doc.body.innerHTML
}
