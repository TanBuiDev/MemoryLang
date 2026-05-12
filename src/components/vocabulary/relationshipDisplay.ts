import type { RelationType, VocabularyItem } from '@/types/vocabulary.types'

export const relationshipLabelKeys: Record<RelationType, string> = {
  derivative: 'vocabulary.relationshipDerivative',
  collocation: 'vocabulary.relationshipCollocation',
  synonym: 'vocabulary.relationshipSynonym',
  antonym: 'vocabulary.relationshipAntonym',
  idiom: 'vocabulary.relationshipIdiom',
  related: 'vocabulary.relationshipRelated',
}

export const relationshipDisplayOrder: RelationType[] = [
  'derivative',
  'collocation',
  'synonym',
  'antonym',
  'idiom',
  'related',
]

export function hasRelatedTerms(relationships: Record<RelationType, VocabularyItem[]>): boolean {
  return relationshipDisplayOrder.some((relationType) => relationships[relationType].length > 0)
}
