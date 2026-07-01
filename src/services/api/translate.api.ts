import { supabase } from '@/services/supabase/client'
import type { LanguageCode } from '@/types/language.types'

interface TranslateResponse {
  translatedText: string
}

export async function translateText(
  text: string,
  sourceLanguage: LanguageCode,
  nativeLanguage: LanguageCode,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke<TranslateResponse>('translate', {
    body: { text, sourceLanguage, nativeLanguage },
  })

  if (error || !data) throw new Error(error?.message ?? 'Translation failed')

  return data.translatedText
}
