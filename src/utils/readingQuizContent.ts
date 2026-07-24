import type { ReadingQuestion } from '@/types/reading.types'

const NUMBERED_BLANK_PATTERN = /(\(\s*(\d+)\s*\))\s*_{2,}/g

export function fillReadingQuizBlanks(
  html: string,
  questions: ReadingQuestion[]
): string {
  if (!html || questions.length === 0) return html

  const answers = new Map(
    questions.map((question, index) => [
      index + 1,
      question.options.find((option) => option.is_correct)?.text.trim() || '',
    ])
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
    const source = textNode.data
    const matches = Array.from(source.matchAll(NUMBERED_BLANK_PATTERN))
    if (matches.length === 0) return

    const fragment = doc.createDocumentFragment()
    let lastIndex = 0
    let replaced = false

    matches.forEach((match) => {
      const start = match.index ?? 0
      const blankNumber = Number(match[2])
      const answer = answers.get(blankNumber)
      if (!answer) return

      replaced = true
      const prevSlice = source.slice(lastIndex, start)
      fragment.append(prevSlice)

      // Ensure space before (1) if preceding text ends with a word/number character
      if (/[a-zA-Z0-9]$/.test(prevSlice)) {
        fragment.append(' ')
      }

      fragment.append(`${match[1]} `)

      const marker = doc.createElement('span')
      marker.setAttribute('data-reading-quiz-answer', String(blankNumber))
      marker.setAttribute(
        'style',
        'background: #fde047; color: #0f172a; font-weight: 900; padding: 0.05em 0.3em; border: 1px solid #0f172a; border-radius: 0.35em; box-decoration-break: clone; -webkit-box-decoration-break: clone; white-space: normal; overflow-wrap: anywhere; line-height: 1.5;'
      )
      marker.textContent = answer
      fragment.append(marker)

      lastIndex = start + match[0].length

      // Ensure space after answer marker if following text starts with a word/number character
      const nextSlice = source.slice(lastIndex)
      if (/^[a-zA-Z0-9]/.test(nextSlice)) {
        fragment.append(' ')
      }
    })

    if (replaced) {
      fragment.append(source.slice(lastIndex))
      textNode.replaceWith(fragment)
    }
  })

  return doc.body.innerHTML
}
