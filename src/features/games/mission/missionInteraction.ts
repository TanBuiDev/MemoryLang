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
