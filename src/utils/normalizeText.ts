export function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function inferItemType(value: string) {
  const normalized = normalizeText(value)

  if (!normalized) return 'word'
  if (/[.!?]$/.test(value.trim()) || normalized.split(' ').length > 5) return 'sentence'
  if (['break the ice', 'piece of cake', 'once in a blue moon'].includes(normalized)) return 'idiom'
  if (normalized.includes(' ')) return 'phrase'

  return 'word'
}
