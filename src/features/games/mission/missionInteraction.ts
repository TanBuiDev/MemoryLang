import type { GameTerm } from './mission.types'

export function selectMatchingTranslation(
  selections: Record<string, string>,
  questionId: string,
  value: string,
): Record<string, string> {
  const next = { ...selections }
  const previous = next[questionId]
  if (!value) {
    delete next[questionId]
    return next
  }
  const occupied = Object.keys(next).find((id) => id !== questionId && next[id] === value)
  if (occupied) {
    if (previous) next[occupied] = previous
    else delete next[occupied]
  }
  next[questionId] = value
  return next
}

export function scoreMissionAnswer(correct: boolean, attempts: number, hintLevel: number): number {
  if (!correct) return 0
  return attempts === 1 && hintLevel === 0 ? 100 : 50
}

export function getMissionContextTranslation(
  question: { targetTermId: string; sourceExampleIndex?: number },
  terms: GameTerm[],
): string | null {
  if (question.sourceExampleIndex === undefined) return null
  const target = terms.find((term) => term.globalTermId === question.targetTermId)
  return target?.examples[question.sourceExampleIndex]?.translation?.trim() || null
}
