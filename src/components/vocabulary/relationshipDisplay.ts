import type { RelationType, VocabularyItem } from '@/types/vocabulary.types'

export const relationshipLabelKeys: Record<RelationType, string> = {
  synonym: 'vocabulary.relationshipSynonym',
  antonym: 'vocabulary.relationshipAntonym',
  noun: 'vocabulary.relationshipNoun',
  verb: 'vocabulary.relationshipVerb',
  adjective: 'vocabulary.relationshipAdjective',
  adverb: 'vocabulary.relationshipAdverb',
}

export const relationshipDisplayOrder: RelationType[] = [
  'synonym',
  'antonym',
  'noun',
  'verb',
  'adjective',
  'adverb',
]

export function hasRelatedTerms(relationships: Record<RelationType, VocabularyItem[]>): boolean {
  return relationshipDisplayOrder.some((relationType) => relationships[relationType].length > 0)
}
