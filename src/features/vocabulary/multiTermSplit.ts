export interface SplitInput {
  id: string
  user_id: string
  source_text: string
  translation: string | null
  source_language: string
  native_language: string
  item_type: string
  part_of_speech: string | null
  ipa: string | null
  note: string | null
  meanings: { text: string; language: string }[]
  examples: { sentence: string; translation?: string }[]
  tags: string[]
  status: string
  deck_ids: string[]
  relationship_ids: string[]
}

export interface SplitResult {
  source_text: string
  translation: string | null
  user_id: string
  source_language: string
  native_language: string
  item_type: string
  part_of_speech: string | null
  ipa: string | null
  note: string | null
  meanings: { text: string; language: string }[]
  examples: { sentence: string; translation?: string }[]
  tags: string[]
  status: string
  original_id: string
  deck_ids: string[]
  relationship_ids: string[]
}

const SLASH_SEPARATOR = /\s*\/\s*/

function countSlashes(text: string | null): number {
  if (!text) return 0
  return text.split(SLASH_SEPARATOR).length - 1
}

export function isSplittable(entry: { source_text: string; translation: string | null }): boolean {
  const sourceSlashes = countSlashes(entry.source_text)
  const translationSlashes = countSlashes(entry.translation)

  if (sourceSlashes === 0 && translationSlashes === 0) return false

  if (sourceSlashes > 0 && translationSlashes > 0 && sourceSlashes !== translationSlashes) {
    return false
  }

  return true
}

export function getSplitParts(text: string | null): string[] {
  if (!text) return ['']
  const rawParts = text.split(SLASH_SEPARATOR).map((part) => part.trim())
  if (rawParts.length <= 1) return rawParts

  const firstPartWords = rawParts[0]!.split(/\s+/)
  const secondPartFirstWord = rawParts[1]!.split(/\s+/)[0]!

  const matchIndex = firstPartWords.findIndex(
    (word) => word.toLowerCase() === secondPartFirstWord.toLowerCase(),
  )

  if (matchIndex > 0) {
    const sharedPrefix = firstPartWords.slice(0, matchIndex).join(' ')
    return rawParts.map((part, i) => {
      if (i === 0 || part.startsWith(sharedPrefix)) return part
      return `${sharedPrefix} ${part}`
    })
  }

  return rawParts
}

export function splitMultiTermEntry(entry: SplitInput): SplitResult[] {
  if (!isSplittable(entry)) return []

  const sourceParts = getSplitParts(entry.source_text)
  const translationParts = getSplitParts(entry.translation)
  const maxParts = Math.max(sourceParts.length, translationParts.length)

  const shared = {
    user_id: entry.user_id,
    source_language: entry.source_language,
    native_language: entry.native_language,
    item_type: entry.item_type,
    part_of_speech: entry.part_of_speech,
    ipa: entry.ipa,
    note: entry.note,
    meanings: entry.meanings,
    examples: entry.examples,
    tags: entry.tags,
    status: entry.status,
    deck_ids: entry.deck_ids,
    relationship_ids: entry.relationship_ids,
    original_id: entry.id,
  }

  return Array.from({ length: maxParts }, (_, i) => ({
    ...shared,
    source_text: sourceParts[i] ?? sourceParts[sourceParts.length - 1]!,
    translation: translationParts[i] ?? translationParts[translationParts.length - 1]!,
  }))
}
