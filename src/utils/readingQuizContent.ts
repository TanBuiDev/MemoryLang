import type { ReadingQuestion } from '@/types/reading.types'

// Matches combinations of underscores, hyphens, or dots and numbers like:
// "_______ 131." or "(131) _______" or "[ 131 ] _______" or "131. _______" or just "_______"
const BLANK_PATTERN = /(?:[-_.—–]{2,}(?:\s|&nbsp;|<[^>]+>)*(?:\[|\()?(\d+)(?:<[^>]+>)?(?:\.|\]|\))?(?:<[^>]+>)?)|(?:(?:\[|\()?(\d+)(?:<[^>]+>)?(?:\.|\]|\))?(?:<[^>]+>)?(?:\s|&nbsp;|<[^>]+>)*[-_.—–]{2,})|(?:[-_.—–]{2,})/g

export function fillReadingQuizBlanks(
  html: string,
  questions: ReadingQuestion[]
): string {
  if (!html || questions.length === 0) return html

  // We will map questions in order of appearance
  let questionIndex = 0

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
    const matches = Array.from(source.matchAll(BLANK_PATTERN))
    if (matches.length === 0) return

    const fragment = doc.createDocumentFragment()
    let lastIndex = 0
    let replaced = false

    matches.forEach((match) => {
      const start = match.index ?? 0
      
      const prevSlice = source.slice(lastIndex, start)
      fragment.append(prevSlice)
      lastIndex = start + match[0].length

      if (questionIndex >= questions.length) {
        // Just append the original blank
        fragment.append(match[0])
        return
      }
      
      const question = questions[questionIndex]
      const answer = question.options.find((option) => option.is_correct)?.text.trim()
      questionIndex++

      if (!answer) {
        fragment.append(match[0])
        return
      }

      replaced = true

      // Ensure space before if needed
      if (/[a-zA-Z0-9]$/.test(prevSlice)) {
        fragment.append(' ')
      }

      const numberMatches = match[0].match(/\d+/)
      const qNum = numberMatches ? numberMatches[0] : String(questionIndex)

      fragment.append(`[ ${qNum} ] `)

      const marker = doc.createElement('span')
      marker.setAttribute('data-reading-quiz-answer', String(qNum))
      marker.setAttribute(
        'style',
        'background: #fde047; color: #0f172a; font-weight: 900; padding: 0.05em 0.3em; border: 1px solid #0f172a; border-radius: 0.35em; box-decoration-break: clone; -webkit-box-decoration-break: clone; white-space: normal; overflow-wrap: anywhere; line-height: 1.5;'
      )
      marker.textContent = answer
      fragment.append(marker)

      // Ensure space after if needed
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
