import type { GameTerm } from './mission.types'

export const STANDARD_SCRIPT_VERSION = 1
export const GENERATOR_VERSION = 1

function stableHash(input: string) {
  let hash = 0x811c9dc5
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function splitIntoMissions<T>(items: T[], termsPerMission = 10, minFinalMission = 5): T[][] {
  if (termsPerMission < 1) throw new Error('termsPerMission must be positive')
  if (items.length === 0) return []
  const missions: T[][] = []
  for (let offset = 0; offset < items.length; offset += termsPerMission) {
    missions.push(items.slice(offset, offset + termsPerMission))
  }
  const last = missions.at(-1)
  if (missions.length > 1 && last && last.length < minFinalMission) {
    missions[missions.length - 2] = [...missions[missions.length - 2], ...last]
    missions.pop()
  }
  return missions
}

export function createCurriculumFingerprint(input: {
  deckId: string
  orderedTermIds: string[]
  termsPerMission: number
  scriptKey: string
  scriptVersion?: number
  generatorVersion?: number
  overrideVersion?: string
  contentVersion?: string
}) {
  const canonical = JSON.stringify({
    deckId: input.deckId,
    orderedTermIds: input.orderedTermIds,
    termsPerMission: input.termsPerMission,
    scriptKey: input.scriptKey,
    scriptVersion: input.scriptVersion ?? STANDARD_SCRIPT_VERSION,
    generatorVersion: input.generatorVersion ?? GENERATOR_VERSION,
    overrideVersion: input.overrideVersion ?? 'none',
    contentVersion: input.contentVersion ?? 'content-v1',
  })
  return 'v1-' + stableHash(canonical)
}

export function createCurriculumContentVersion(terms: GameTerm[]) {
  const content = terms.map((term) => ({
    id: term.globalTermId,
    sourceText: term.sourceText,
    translation: term.translation,
    itemType: term.itemType,
    examples: term.examples.map((example) => example.sentence),
  }))
  return 'c1-' + stableHash(JSON.stringify(content))
}

export function buildMissionTermGroups(terms: GameTerm[], termsPerMission: number) {
  return splitIntoMissions(terms, termsPerMission, 5)
}

export function seededShuffle<T>(items: T[], seedText: string): T[] {
  let seed = parseInt(stableHash(seedText), 16) || 1
  const result = [...items]
  const random = () => {
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    return (seed >>> 0) / 4294967296
  }
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}
