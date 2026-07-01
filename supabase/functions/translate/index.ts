interface TranslateRequest {
  text: string
  sourceLanguage: string
  nativeLanguage: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = (await request.json()) as TranslateRequest
    const { text, sourceLanguage, nativeLanguage } = body

    const value = text.trim()
    if (!value || sourceLanguage === nativeLanguage) {
      return Response.json({ translatedText: value }, { headers: corsHeaders })
    }

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
          if (typeof translated === 'string' && translated.trim()) {
            return Response.json({ translatedText: translated.trim() }, { headers: corsHeaders })
          }
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
      if (!response.ok) {
        return Response.json({ translatedText: value }, { headers: corsHeaders })
      }

      const payload = await response.json()
      const translated = payload?.responseData?.translatedText
      return Response.json(
        { translatedText: typeof translated === 'string' && translated.trim() ? translated.trim() : value },
        { headers: corsHeaders },
      )
    } catch {
      return Response.json({ translatedText: value }, { headers: corsHeaders })
    }
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 400, headers: corsHeaders },
    )
  }
})
