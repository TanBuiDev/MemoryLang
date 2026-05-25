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

  if (!error && data?.ipa) return data

  const words = text.trim().split(/\s+/)
  if (words.length > 1) {
    const ipaParts: (string | null)[] = []
    for (const word of words) {
      try {
        const { data: wordData } = await supabase.functions.invoke<EnrichedVocabulary>('enrich-vocabulary', {
          body: { text: word, sourceLanguage, nativeLanguage },
        })
        ipaParts.push(wordData?.ipa ?? null)
      } catch {
        ipaParts.push(null)
      }
    }
    const phraseIpa = ipaParts.some((p) => p !== null) ? ipaParts.filter((p): p is string => p !== null).join(' ') : null
    return {
      sourceText: text,
      normalizedText: normalizeText(text),
      itemType: inferItemType(text),
      ipa: phraseIpa,
      partOfSpeech: data?.partOfSpeech ?? null,
      pronunciationText: data?.pronunciationText ?? null,
      meanings: data?.meanings ?? [{ text: '', language: nativeLanguage }],
      examples: data?.examples ?? [],
      translationText: data?.translationText ?? '',
      audioUrl: data?.audioUrl ?? null,
      imageUrl: data?.imageUrl ?? null,
      source: data?.source ?? 'fallback',
    }
  }

  return {
    sourceText: text,
    normalizedText: normalizeText(text),
    itemType: inferItemType(text),
    ipa: null,
    partOfSpeech: null,
    pronunciationText: null,
    meanings: [{ text: '', language: nativeLanguage }],
    examples: [],
    translationText: '',
    audioUrl: null,
    imageUrl: null,
    source: 'fallback',
  }
}
