// Batch enrichment script for global_terms
// Enriches entries missing IPA, meanings, examples, or audio
// Usage: npx tsx scripts/batch-enrich-global-terms.ts [--dry-run] [--limit 50] [--language en]

// Load .env file manually
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
try {
  const envContent = readFileSync(resolve(import.meta.dirname ?? '.', '..', '.env'), 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim()
        const val = trimmed.slice(eqIdx + 1).trim()
        if (!(key in process.env)) process.env[key] = val
      }
    }
  }
} catch { /* .env not found, skip */ }

import { createClient } from '@supabase/supabase-js'

const DRY_RUN = process.argv.includes('--dry-run')
const NO_AUDIO = process.argv.includes('--no-audio')
const LIMIT_ARG = process.argv.find((a) => a.startsWith('--limit'))
const LIMIT = LIMIT_ARG
  ? parseInt(LIMIT_ARG.includes('=') ? LIMIT_ARG.split('=')[1]! : process.argv[process.argv.indexOf('--limit') + 1] ?? '100', 10)
  : 100
const LANG_ARG = process.argv.find((a) => a.startsWith('--language'))
const FILTER_LANG = LANG_ARG
  ? (LANG_ARG.includes('=') ? LANG_ARG.split('=')[1] : process.argv[process.argv.indexOf('--language') + 1]) ?? 'en'
  : null

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? ''

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

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

async function dictionaryLookup(text: string) {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(text)}`)
    if (!response.ok) return null
    const [entry] = await response.json()
    const meaning = entry?.meanings?.[0]
    const definition = meaning?.definitions?.[0]
    return {
      ipa: entry?.phonetics?.find((p: { text?: string }) => p.text)?.text ?? null,
      partOfSpeech: meaning?.partOfSpeech ?? null,
      definition: definition?.definition ?? '',
      example: definition?.example ?? '',
      audioUrl: entry?.phonetics?.find((p: { audio?: string }) => p.audio)?.audio ?? null,
    }
  } catch {
    return null
  }
}

async function translateText(text: string, sourceLang: string, nativeLang: string) {
  const value = text.trim()
  if (!value || sourceLang === nativeLang || sourceLang === 'other' || nativeLang === 'other') return value
  try {
    const url = new URL('https://api.mymemory.translated.net/get')
    url.searchParams.set('q', value)
    url.searchParams.set('langpair', `${sourceLang}|${nativeLang}`)
    url.searchParams.set('mt', '1')
    const response = await fetch(url)
    if (!response.ok) return value
    const payload = await response.json()
    const translated = payload?.responseData?.translatedText
    return typeof translated === 'string' && translated.trim() ? translated.trim() : value
  } catch {
    return value
  }
}

async function generateTtsAudio(text: string, language: string) {
  try {
    const { data: voiceConfig } = await supabase
      .from('tts_voice_config')
      .select('voice_name')
      .eq('language_code', language)
      .eq('enabled', true)
      .maybeSingle()

    const functionUrl = `${SUPABASE_URL}/functions/v1/generate-audio`
    const res = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: text.trim(), language, voice: voiceConfig?.voice_name }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { audioUrl?: string }
    return data.audioUrl ?? null
  } catch {
    return null
  }
}

const TTS_LANG_MAP: Record<string, string> = {
  vi: 'vi-VN', en: 'en-US', ko: 'ko-KR', ja: 'ja-JP',
  zh: 'zh-CN', fr: 'fr-FR', de: 'de-DE',
}

async function enrichTerm(term: {
  id: string
  source_text: string
  normalized_text: string
  source_language: string
  native_language: string
  item_type: string
  ipa: string | null
  part_of_speech: string | null
  meanings: any[]
  examples: any[]
  audio_url: string | null
}) {
  const updates: Record<string, any> = {}
  const sourceText = term.source_text
  const sourceLang = term.source_language
  const nativeLang = term.native_language

  // 1. Dictionary lookup for English words
  let dictResult: any = null
  if (sourceLang === 'en' && term.item_type === 'word') {
    dictResult = await dictionaryLookup(sourceText)
    if (dictResult) {
      if (!term.ipa && dictResult.ipa) updates.ipa = dictResult.ipa
      if (!term.part_of_speech && dictResult.partOfSpeech) updates.part_of_speech = dictResult.partOfSpeech
    }
  }

  // 2. Meanings
  const hasMeaning = Array.isArray(term.meanings) && term.meanings.length > 0 &&
    term.meanings.some((m: any) => m.text && m.text.trim())
  if (!hasMeaning) {
    const definitionText = dictResult?.definition ?? ''
    if (definitionText) {
      const translated = await translateText(definitionText, sourceLang, nativeLang)
      updates.meanings = [{ text: translated, language: nativeLang }]
    } else {
      const translated = await translateText(sourceText, sourceLang, nativeLang)
      updates.meanings = [{ text: translated, language: nativeLang }]
    }
  }

  // 3. Examples
  const hasExample = Array.isArray(term.examples) && term.examples.length > 0 &&
    term.examples.some((e: any) => e.sentence && e.sentence.trim())
  if (!hasExample) {
    if (dictResult?.example) {
      const translated = await translateText(dictResult.example, sourceLang, nativeLang)
      updates.examples = [{ sentence: dictResult.example, translation: translated }]
    } else if (sourceText && sourceText.trim()) {
      const sentence = sourceText.endsWith('.') ? sourceText : sourceText + '.'
      const translated = await translateText(sentence, sourceLang, nativeLang)
      updates.examples = [{ sentence, translation: translated }]
    }
  }

  // 4. Audio
  if (!term.audio_url && !NO_AUDIO) {
    const ttsLang = TTS_LANG_MAP[sourceLang]
    if (ttsLang) {
      const audioUrl = await generateTtsAudio(sourceText, ttsLang)
      if (audioUrl) updates.audio_url = audioUrl
    }
  }

  if (Object.keys(updates).length === 0) return null

  if (!DRY_RUN) {
    const { error } = await supabase
      .from('global_terms')
      .update(updates)
      .eq('id', term.id)
    if (error) {
      console.error(`  Error updating ${sourceText}:`, error.message)
      return null
    }
  }

  return updates
}

async function main() {
  console.log(`Batch enrichment ${DRY_RUN ? '(DRY RUN)' : ''} | limit: ${LIMIT} | language: ${FILTER_LANG ?? 'all'}`)

  let query = supabase
    .from('global_terms')
    .select('id, source_text, normalized_text, source_language, native_language, item_type, ipa, part_of_speech, meanings, examples, audio_url')
    .order('created_at', { ascending: true })
    .limit(LIMIT)

  if (FILTER_LANG) {
    query = query.eq('source_language', FILTER_LANG)
  }

  const { data: terms, error } = await query
  if (error) {
    console.error('Query error:', error.message)
    process.exit(1)
  }

  if (!terms || terms.length === 0) {
    console.log('No terms to enrich')
    return
  }

  console.log(`Found ${terms.length} terms to process`)

  let enriched = 0
  let skipped = 0

  for (let i = 0; i < terms.length; i++) {
    const term = terms[i]
    const needsEnrichment =
      (!term.ipa && term.source_language === 'en' && term.item_type === 'word') ||
      !(Array.isArray(term.meanings) && term.meanings.some((m: any) => m.text?.trim())) ||
      !(Array.isArray(term.examples) && term.examples.some((e: any) => e.sentence?.trim())) ||
      (!NO_AUDIO && !term.audio_url)

    if (!needsEnrichment) {
      skipped++
      continue
    }

    process.stdout.write(`  [${i + 1}/${terms.length}] ${term.source_text}... `)
    const updates = await enrichTerm(term)
    if (updates) {
      enriched++
      console.log(`updated: ${Object.keys(updates).join(', ')}`)
    } else {
      console.log('no changes')
    }

    // Rate limiting: delay between requests to avoid API throttling
    if (i < terms.length - 1) {
      await new Promise((r) => setTimeout(r, 100))
    }
  }

  console.log(`\nDone: ${enriched} enriched, ${skipped} skipped, ${terms.length - enriched - skipped} had no API data`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
