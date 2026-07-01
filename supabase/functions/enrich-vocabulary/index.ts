import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.4'

type LanguageCode = 'vi' | 'en' | 'ko' | 'ja' | 'zh' | 'fr' | 'de' | 'other'

interface EnrichRequest {
  text: string
  sourceLanguage: LanguageCode
  nativeLanguage: LanguageCode
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TTS_LANG_MAP: Record<string, string> = {
  vi: 'vi-VN',
  en: 'en-US',
  ko: 'ko-KR',
  ja: 'ja-JP',
  zh: 'zh-CN',
  fr: 'fr-FR',
  de: 'de-DE',
}

function getTtsLanguage(sourceLanguage: LanguageCode): string | null {
  return TTS_LANG_MAP[sourceLanguage] ?? null
}

async function generateTtsAudio(supabase: any, text: string, sourceLanguage: LanguageCode): Promise<string | null> {
  const lang = getTtsLanguage(sourceLanguage)
  if (!lang) return null

  try {
    const { data: voiceConfig } = await supabase
      .from('tts_voice_config')
      .select('voice_name')
      .eq('language_code', lang)
      .eq('enabled', true)
      .maybeSingle()

    const voiceName = voiceConfig?.voice_name ?? undefined

    const functionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-audio`
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const res = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: text.trim(), language: lang, voice: voiceName }),
    })
    if (!res.ok) return null
    const data = await res.json() as { audioUrl?: string; cached?: boolean }
    return data.audioUrl ?? null
  } catch {
    return null
  }
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function inferItemType(value: string) {
  const normalized = normalizeText(value)
  if (/[.!?]$/.test(value.trim()) || normalized.split(' ').length > 5) return 'sentence'
  if (['break the ice', 'piece of cake', 'once in a blue moon'].includes(normalized)) return 'idiom'
  if (normalized.includes(' ')) return 'phrase'
  return 'word'
}

async function dictionaryLookup(text: string, nativeLanguage: LanguageCode) {
  const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(text)}`)
  if (!response.ok) return null
  const [entry] = await response.json()
  const meaning = entry?.meanings?.[0]
  const definition = meaning?.definitions?.[0]

  const examples: { sentence: string; translation: string }[] = []
  if (entry?.meanings) {
    for (const m of entry.meanings) {
      if (m.definitions) {
        for (const def of m.definitions) {
          if (def.example && def.example.trim()) {
            const sentence = def.example.trim()
            if (!examples.some(ex => ex.sentence.toLowerCase() === sentence.toLowerCase())) {
              examples.push({ sentence, translation: '' })
            }
          }
        }
      }
    }
  }

  if (examples.length === 0 && definition?.example) {
    examples.push({ sentence: definition.example.trim(), translation: '' })
  }

  const limitExamples = examples.slice(0, 3)

  return {
    ipa: entry?.phonetics?.find((phonetic: { text?: string }) => phonetic.text)?.text ?? null,
    partOfSpeech: meaning?.partOfSpeech ?? null,
    meanings: [{ text: definition?.definition ?? '', language: nativeLanguage }],
    examples: limitExamples,
  }
}

async function translateText(text: string, sourceLanguage: LanguageCode, nativeLanguage: LanguageCode) {
  const value = text.trim()
  if (!value || sourceLanguage === nativeLanguage || sourceLanguage === 'other' || nativeLanguage === 'other') return value

  const langMap: Record<string, string> = {
    en: 'EN', vi: 'VI', ko: 'KO', ja: 'JA', zh: 'ZH', fr: 'FR', de: 'DE',
  }
  const sourceLang = langMap[sourceLanguage]
  const targetLang = langMap[nativeLanguage]

  const deepLApiKey = Deno.env.get('DEEPL_API_KEY')
  if (deepLApiKey && sourceLang && targetLang) {
    try {
      const params = new URLSearchParams()
      params.set('text', value)
      params.set('source_lang', sourceLang)
      params.set('target_lang', targetLang)

      const response = await fetch('https://api-free.deepl.com/v2/translate', {
        method: 'POST',
        headers: {
          Authorization: `DeepL-Auth-Key ${deepLApiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      })

      if (response.ok) {
        const payload = await response.json() as { translations?: Array<{ text: string }> }
        const translated = payload?.translations?.[0]?.text
        if (typeof translated === 'string' && translated.trim()) return translated.trim()
      }
    } catch {
      // fall through to MyMemory
    }
  }

  const url = new URL('https://api.mymemory.translated.net/get')
  url.searchParams.set('q', value)
  url.searchParams.set('langpair', `${sourceLanguage}|${nativeLanguage}`)
  url.searchParams.set('mt', '1')

  try {
    const response = await fetch(url)
    if (!response.ok) return value

    const payload = await response.json()
    const translated = payload?.responseData?.translatedText
    return typeof translated === 'string' && translated.trim() ? translated.trim() : value
  } catch {
    return value
  }
}

async function addDictionaryTranslations(
  sourceText: string,
  sourceLanguage: LanguageCode,
  nativeLanguage: LanguageCode,
  dictionary: Awaited<ReturnType<typeof dictionaryLookup>>,
) {
  if (!dictionary) return null

  const translatedWord = await translateText(sourceText, sourceLanguage, nativeLanguage)
  const examples = await Promise.all(
    dictionary.examples.map(async (example: { sentence: string; translation?: string }) => ({
      sentence: example.sentence,
      translation: await translateText(example.sentence, sourceLanguage, nativeLanguage),
    })),
  )

  return {
    ...dictionary,
    translationText: translatedWord,
    examples,
  }
}

async function addCachedTranslations(term: Record<string, unknown>, sourceLanguage: LanguageCode, nativeLanguage: LanguageCode) {
  const sourceText = String(term.source_text ?? '')
  const meanings = Array.isArray(term.meanings) ? term.meanings : []
  const examples = Array.isArray(term.examples) ? term.examples : []
  const translatedWord = await translateText(sourceText, sourceLanguage, nativeLanguage)

  return {
    sourceText,
    normalizedText: String(term.normalized_text ?? normalizeText(sourceText)),
    itemType: term.item_type,
    ipa: term.ipa,
    partOfSpeech: term.part_of_speech,
    meanings,
    examples: await Promise.all(
      examples.map(async (example) => ({
        sentence: String(example?.sentence ?? ''),
        translation: await translateText(String(example?.sentence ?? ''), sourceLanguage, nativeLanguage),
      })),
    ),
    translationText: translatedWord,
    audioUrl: term.audio_url,
    imageUrl: term.image_url,
    source: 'cache',
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = (await request.json()) as EnrichRequest
    const normalizedText = normalizeText(body.text)
    const itemType = inferItemType(body.text)
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

    const { data: cached } = await supabase
      .from('global_terms')
      .select('*')
      .eq('normalized_text', normalizedText)
      .eq('source_language', body.sourceLanguage)
      .eq('native_language', body.nativeLanguage)
      .maybeSingle()

    if (cached) {
      if (cached.ipa) {
        if (body.sourceLanguage !== body.nativeLanguage) {
          const translated = await addCachedTranslations(cached, body.sourceLanguage, body.nativeLanguage)
          return Response.json({ ...translated, globalTermId: cached.id }, { headers: corsHeaders })
        }

        return Response.json(
          {
            globalTermId: cached.id,
            sourceText: cached.source_text,
            normalizedText: cached.normalized_text,
            itemType: cached.item_type,
            ipa: cached.ipa,
            partOfSpeech: cached.part_of_speech,
            meanings: cached.meanings,
            examples: cached.examples,
            translationText: '',
            audioUrl: cached.audio_url,
            imageUrl: cached.image_url,
            source: 'cache',
          },
          { headers: corsHeaders },
        )
      }
    }

    // Dictionary API dùng cho IPA, partOfSpeech, meanings, examples (không dùng cho audio)
    const dictionary = itemType === 'word' && body.sourceLanguage === 'en' ? await dictionaryLookup(body.text, body.nativeLanguage) : null
    const translatedDictionary = await addDictionaryTranslations(body.text, body.sourceLanguage, body.nativeLanguage, dictionary)
    const translationText = translatedDictionary?.translationText ?? await translateText(body.text, body.sourceLanguage, body.nativeLanguage)

    // Audio chỉ lấy từ Google Cloud TTS
    const audioUrl = await generateTtsAudio(supabase, body.text, body.sourceLanguage)

    const payload = {
      source_text: body.text,
      normalized_text: normalizedText,
      source_language: body.sourceLanguage,
      native_language: body.nativeLanguage,
      item_type: itemType,
      part_of_speech: dictionary?.partOfSpeech ?? null,
      ipa: dictionary?.ipa ?? null,
      audio_url: audioUrl,
      image_url: null,
      meanings: translatedDictionary?.meanings?.[0]?.text ? translatedDictionary.meanings : [{ text: '', language: body.nativeLanguage }],
      examples: translatedDictionary?.examples ?? [],
      source: dictionary ? 'dictionary' : 'system',
    }

    const { data: upserted } = await supabase
      .from('global_terms')
      .upsert(payload, { onConflict: 'normalized_text,source_language,native_language' })
      .select('id')
      .single()

    return Response.json(
      {
        globalTermId: upserted?.id ?? null,
        sourceText: payload.source_text,
        normalizedText: payload.normalized_text,
        itemType: payload.item_type,
        ipa: payload.ipa,
        partOfSpeech: payload.part_of_speech,
        meanings: payload.meanings,
        examples: payload.examples,
        translationText,
        audioUrl: payload.audio_url,
        imageUrl: payload.image_url,
        source: dictionary ? 'dictionary' : 'fallback',
      },
      { headers: corsHeaders },
    )
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 400, headers: corsHeaders })
  }
})
