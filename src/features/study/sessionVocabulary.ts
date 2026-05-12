import type { VocabularyItem } from '@/types/vocabulary.types'
import type { SessionLimit } from '@/types/study.types'
import { shuffle as shuffleItems } from '@/utils/shuffle'

interface PrepareSessionVocabularyOptions {
  limit: SessionLimit
  shuffle: boolean
  random?: () => number
}

export function prepareSessionVocabulary(
  vocabulary: VocabularyItem[],
  { limit, shuffle, random = Math.random }: PrepareSessionVocabularyOptions,
) {
  const prepared = shuffle ? shuffleItems(vocabulary, random) : [...vocabulary]
  if (limit === 'all') return prepared
  return prepared.slice(0, limit)
}
