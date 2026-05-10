import { supabase } from '@/services/supabase/client'
import type { EnrichedVocabulary } from '@/types/vocabulary.types'
import type { LanguageCode } from '@/types/language.types'
import { inferItemType, normalizeText } from '@/utils/normalizeText'

export async function enrichVocabulary(
  text: string,
  sourceLanguage: LanguageCode,
  nativeLanguage: LanguageCode,
): Promise<EnrichedVocabulary> {
  const { data, error } = await supabase.functions.invoke<EnrichedVocabulary>('enrich-vocabulary', {
    body: { text, sourceLanguage, nativeLanguage },
  })

  if (!error && data) return data

  return {
    sourceText: text,
    normalizedText: normalizeText(text),
    itemType: inferItemType(text),
    ipa: null,
    partOfSpeech: null,
    pronunciationText: null,
    meanings: [{ text: '', language: nativeLanguage }],
    examples: [],
    audioUrl: null,
    imageUrl: null,
    source: 'fallback',
  }
}
