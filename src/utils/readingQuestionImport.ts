export interface ParsedReadingQuestion {
  number: number | null
  questionText: string
  options: string[]
  sourceLine: string
  error: string | null
}

const choiceMarkerPattern =
  /(?:^|\s)(?:([A-D])\s*[.)：:]|\(([A-D])\))\s*/gi

function parseChoices(line: string): { labels: string[]; options: string[] } {
  const matches = Array.from(line.matchAll(choiceMarkerPattern))

  return {
    labels: matches.map((match) => (match[1] || match[2]).toUpperCase()),
    options: matches.map((match, index) => {
      const start = (match.index || 0) + match[0].length
      const end = matches[index + 1]?.index ?? line.length
      return line.slice(start, end).trim()
    }),
  }
}

export function parseBulkReadingQuestions(input: string): ParsedReadingQuestion[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((sourceLine) => {
      const numberMatch = sourceLine.match(/^(\d+)\s*[.)：:]\s*/)
      const number = numberMatch ? Number(numberMatch[1]) : null
      const { labels, options } = parseChoices(sourceLine)
      const questionText = number === null
        ? ''
        : `Chọn đáp án phù hợp cho chỗ trống (${number})`

      let error: string | null = null
      if (number === null) {
        error = 'Không tìm thấy số câu ở đầu dòng.'
      } else if (
        labels.join('') !== 'ABCD' ||
        options.length !== 4 ||
        options.some((option) => !option)
      ) {
        error = 'Cần đủ 4 lựa chọn A, B, C và D.'
      }

      return {
        number,
        questionText,
        options,
        sourceLine,
        error,
      }
    })
}
