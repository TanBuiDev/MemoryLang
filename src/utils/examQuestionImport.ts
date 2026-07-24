export interface ParsedExamQuestion {
  questionNumber: number | null
  questionText: string
  options: { key: string; text: string; is_correct: boolean }[]
  explanationHtml?: string
  rawBlock: string
  error?: string
}

/**
 * Smart Parser for Copy-Pasted Exam Questions (PDFs, Word, ETS books, Websites)
 * Supports multi-line blocks and single-line questions with choices (A), (B), (C), (D) or A., B., C., D.
 */
export function parseExamQuestionsText(rawInput: string): ParsedExamQuestion[] {
  if (!rawInput || !rawInput.trim()) return []

  // Normalize line endings
  const text = rawInput.replace(/\r\n/g, '\n').trim()

  // Find all question start markers (e.g., "101.", "101)", "Question 101:", "101 ")
  const questionStartRegex = /(?:^|\n)\s*(?:Question\s+|Câu\s+)?(\d+)[\s.:)]+/gi
  const matches = Array.from(text.matchAll(questionStartRegex))

  const questionBlocks: string[] = []

  if (matches.length === 0) {
    // If no numbered prefix found, treat the whole string as one question block
    questionBlocks.push(text)
  } else {
    for (let i = 0; i < matches.length; i++) {
      const startIndex = matches[i].index!
      const endIndex = matches[i + 1] ? matches[i + 1].index! : text.length
      questionBlocks.push(text.slice(startIndex, endIndex).trim())
    }
  }

  return questionBlocks.map((block) => {
    // Extract Question Number
    const numMatch = block.match(/^(?:Question\s+|Câu\s+)?(\d+)[\s.:)]+/i)
    const questionNumber = numMatch ? parseInt(numMatch[1], 10) : null
    const content = numMatch ? block.slice(numMatch[0].length).trim() : block

    // Find choices markers e.g., (A), (B), (C), (D) or A., B., C., D. or A), B), C), D)
    const choiceRegex = /(?:^|\s|\n)(?:\(([A-D])\)|([A-D])\s*[.)：:])\s*/gi
    const choiceMatches = Array.from(content.matchAll(choiceRegex))

    if (choiceMatches.length < 4) {
      return {
        questionNumber,
        questionText: content.replace(/\s+/g, ' '),
        options: [
          { key: 'A', text: '', is_correct: true },
          { key: 'B', text: '', is_correct: false },
          { key: 'C', text: '', is_correct: false },
          { key: 'D', text: '', is_correct: false },
        ],
        rawBlock: block,
        error: 'Chưa phát hiện đủ 4 lựa chọn (A, B, C, D)',
      }
    }

    // Question text is everything before the first choice
    const firstChoiceIndex = choiceMatches[0].index!
    const questionText = content.slice(0, firstChoiceIndex).trim().replace(/\s+/g, ' ')

    const options: { key: string; text: string; is_correct: boolean }[] = []
    const defaultKeys = ['A', 'B', 'C', 'D']

    for (let i = 0; i < 4; i++) {
      const m = choiceMatches[i]
      if (!m) {
        options.push({ key: defaultKeys[i], text: '', is_correct: i === 0 })
        continue
      }

      const key = (m[1] || m[2] || defaultKeys[i]).toUpperCase()
      const start = m.index! + m[0].length
      const end = choiceMatches[i + 1] ? choiceMatches[i + 1].index! : content.length
      const optionText = content.slice(start, end).trim().replace(/\s+/g, ' ')

      options.push({
        key,
        text: optionText,
        is_correct: i === 0, // Default A to true, user picks correct radio in UI
      })
    }

    return {
      questionNumber,
      questionText,
      options,
      rawBlock: block,
    }
  })
}

/**
 * Parse a single question line or text block into question text + choices
 */
export function parseSingleQuestionText(text: string): {
  questionNumber: number | null
  questionText: string
  options: { key: string; text: string; is_correct: boolean }[]
} | null {
  const parsed = parseExamQuestionsText(text)
  if (parsed.length === 0) return null
  return parsed[0]
}
