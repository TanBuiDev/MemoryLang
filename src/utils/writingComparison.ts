export type WritingTokenStatus = 'same' | 'added' | 'missing'

export interface WritingComparisonToken {
  value: string
  status: WritingTokenStatus
}

export interface WritingComparison {
  isContentMatch: boolean
  learnerTokens: WritingComparisonToken[]
  sampleTokens: WritingComparisonToken[]
}

export interface ExactTextComparison {
  isExactMatch: boolean
  learner: WritingComparisonToken[]
  expected: WritingComparisonToken[]
}

function getWords(content: string) {
  return content.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) ?? []
}

export function normalizeWritingContent(content: string) {
  return getWords(content).join(' ').toLocaleLowerCase()
}

export function compareWritingContent(learnerContent: string, sampleContent: string): WritingComparison {
  const learnerWords = getWords(learnerContent)
  const sampleWords = getWords(sampleContent)
  const learnerNormalized = learnerWords.map((word) => word.toLocaleLowerCase())
  const sampleNormalized = sampleWords.map((word) => word.toLocaleLowerCase())
  const lcs: number[][] = Array.from({ length: learnerWords.length + 1 }, () =>
    Array(sampleWords.length + 1).fill(0),
  )

  for (let learnerIndex = learnerWords.length - 1; learnerIndex >= 0; learnerIndex -= 1) {
    for (let sampleIndex = sampleWords.length - 1; sampleIndex >= 0; sampleIndex -= 1) {
      lcs[learnerIndex][sampleIndex] = learnerNormalized[learnerIndex] === sampleNormalized[sampleIndex]
        ? lcs[learnerIndex + 1][sampleIndex + 1] + 1
        : Math.max(lcs[learnerIndex + 1][sampleIndex], lcs[learnerIndex][sampleIndex + 1])
    }
  }

  const learnerTokens: WritingComparisonToken[] = []
  const sampleTokens: WritingComparisonToken[] = []
  let learnerIndex = 0
  let sampleIndex = 0

  while (learnerIndex < learnerWords.length || sampleIndex < sampleWords.length) {
    if (
      learnerIndex < learnerWords.length
      && sampleIndex < sampleWords.length
      && learnerNormalized[learnerIndex] === sampleNormalized[sampleIndex]
    ) {
      learnerTokens.push({ value: learnerWords[learnerIndex], status: 'same' })
      sampleTokens.push({ value: sampleWords[sampleIndex], status: 'same' })
      learnerIndex += 1
      sampleIndex += 1
    } else if (
      learnerIndex < learnerWords.length
      && (sampleIndex === sampleWords.length || lcs[learnerIndex + 1][sampleIndex] >= lcs[learnerIndex][sampleIndex + 1])
    ) {
      learnerTokens.push({ value: learnerWords[learnerIndex], status: 'added' })
      learnerIndex += 1
    } else if (sampleIndex < sampleWords.length) {
      sampleTokens.push({ value: sampleWords[sampleIndex], status: 'missing' })
      sampleIndex += 1
    }
  }

  return {
    isContentMatch: normalizeWritingContent(learnerContent) === normalizeWritingContent(sampleContent),
    learnerTokens,
    sampleTokens,
  }
}

export function compareExactText(learnerContent: string, expectedContent: string): ExactTextComparison {
  const learnerCharacters = Array.from(learnerContent)
  const expectedCharacters = Array.from(expectedContent)
  const lcs: number[][] = Array.from({ length: learnerCharacters.length + 1 }, () =>
    Array(expectedCharacters.length + 1).fill(0),
  )

  for (let learnerIndex = learnerCharacters.length - 1; learnerIndex >= 0; learnerIndex -= 1) {
    for (let expectedIndex = expectedCharacters.length - 1; expectedIndex >= 0; expectedIndex -= 1) {
      lcs[learnerIndex][expectedIndex] = learnerCharacters[learnerIndex] === expectedCharacters[expectedIndex]
        ? lcs[learnerIndex + 1][expectedIndex + 1] + 1
        : Math.max(lcs[learnerIndex + 1][expectedIndex], lcs[learnerIndex][expectedIndex + 1])
    }
  }

  const learner: WritingComparisonToken[] = []
  const expected: WritingComparisonToken[] = []
  let learnerIndex = 0
  let expectedIndex = 0

  while (learnerIndex < learnerCharacters.length || expectedIndex < expectedCharacters.length) {
    if (
      learnerIndex < learnerCharacters.length
      && expectedIndex < expectedCharacters.length
      && learnerCharacters[learnerIndex] === expectedCharacters[expectedIndex]
    ) {
      learner.push({ value: learnerCharacters[learnerIndex], status: 'same' })
      expected.push({ value: expectedCharacters[expectedIndex], status: 'same' })
      learnerIndex += 1
      expectedIndex += 1
    } else if (
      learnerIndex < learnerCharacters.length
      && (expectedIndex === expectedCharacters.length || lcs[learnerIndex + 1][expectedIndex] >= lcs[learnerIndex][expectedIndex + 1])
    ) {
      learner.push({ value: learnerCharacters[learnerIndex], status: 'added' })
      learnerIndex += 1
    } else if (expectedIndex < expectedCharacters.length) {
      expected.push({ value: expectedCharacters[expectedIndex], status: 'missing' })
      expectedIndex += 1
    }
  }

  return { isExactMatch: learnerContent === expectedContent, learner, expected }
}
