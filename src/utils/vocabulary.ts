import type { VocabularyItem } from '@/types/vocabulary.types'

export function filterActiveVocabulary(items: VocabularyItem[]) {
  return items.filter((item) => !item.deleted_at)
}
