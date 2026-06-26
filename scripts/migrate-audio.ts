import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const envPath = resolve(__dirname, '..', '.env')
  const content = readFileSync(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (match && match[2]) {
      process.env[match[1]] = match[2].trim()
    }
  }
}

loadEnv()

const DRY_RUN = process.argv.includes('--dry-run')
const LIMIT = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? '0')
const CONCURRENCY = 8

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/generate-audio`

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const TTS_LANG_MAP: Record<string, string> = {
  vi: 'vi-VN',
  en: 'en-US',
  ko: 'ko-KR',
  ja: 'ja-JP',
  zh: 'zh-CN',
  fr: 'fr-FR',
  de: 'de-DE',
}

const OLD_AUDIO_PREFIXES = ['https://api.dictionaryapi.dev/', 'https://ssl.gstatic.com/']

interface TermRow {
  id: string
  source_text: string
  source_language: string
  audio_url: string | null
}

function needsNewAudio(row: TermRow): boolean {
  if (!row.source_text?.trim()) return false
  const lang = TTS_LANG_MAP[row.source_language]
  if (!lang) return false
  if (!row.audio_url) return true
  if (OLD_AUDIO_PREFIXES.some((prefix) => row.audio_url!.startsWith(prefix))) return true
  return false
}

async function generateOne(text: string, sourceLanguage: string): Promise<string | null> {
  const lang = TTS_LANG_MAP[sourceLanguage]
  if (!lang) return null

  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: text.trim(), language: lang }),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error(`  HTTP ${res.status}: ${errText.slice(0, 200)}`)
    return null
  }

  const data = (await res.json()) as { audioUrl?: string; cached?: boolean }
  return data.audioUrl ?? null
}

async function main() {
  const batchSize = LIMIT > 0 ? LIMIT : 10000

  const { data: terms, error } = await supabase
    .from('user_terms')
    .select('id, source_text, source_language, audio_url')
    .is('deleted_at', null)
    .limit(batchSize)
    .order('created_at')

  if (error) {
    console.error('Failed to fetch terms:', error.message)
    process.exit(1)
  }

  const candidates = terms.filter(needsNewAudio)
  console.log(`Found ${candidates.length} terms needing new audio (from ${terms.length} total)\n`)

  if (candidates.length === 0) {
    console.log('Nothing to migrate.')
    return
  }

  if (DRY_RUN) {
    console.log('[DRY RUN] Would generate audio for:')
    for (const row of candidates.slice(0, 30)) {
      console.log(`  ${row.source_text.padEnd(35)} ${row.source_language} | ${row.audio_url ?? '(none)'}`)
    }
    if (candidates.length > 30) console.log(`  ... and ${candidates.length - 30} more`)
    return
  }

  let completed = 0
  let success = 0
  let failed = 0

  const chunks: TermRow[][] = []
  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    chunks.push(candidates.slice(i, i + CONCURRENCY))
  }

  for (const chunk of chunks) {
    const results = await Promise.all(
      chunk.map(async (row) => {
        try {
          const audioUrl = await generateOne(row.source_text, row.source_language)
          return { row, audioUrl }
        } catch (err) {
          console.error(`  Error: ${row.source_text} -`, err instanceof Error ? err.message : String(err))
          return { row, audioUrl: null }
        }
      }),
    )

    for (const { row, audioUrl } of results) {
      completed++
      if (audioUrl) {
        if (row.audio_url === audioUrl) {
          console.log(`[${completed}/${candidates.length}] SKIP  ${row.source_text} (already R2)`)
          continue
        }
        const { error: updateError } = await supabase
          .from('user_terms')
          .update({ audio_url: audioUrl })
          .eq('id', row.id)
        if (updateError) {
          console.error(`[${completed}/${candidates.length}] FAIL  ${row.source_text} - ${updateError.message}`)
          failed++
        } else {
          console.log(`[${completed}/${candidates.length}] OK    ${row.source_text}`)
          success++
        }
      } else {
        console.log(`[${completed}/${candidates.length}] FAIL  ${row.source_text} (no audio)`)
        failed++
      }
    }

    await new Promise((r) => setTimeout(r, 300))
  }

  console.log(`\nDone. ${success} updated, ${failed} failed, ${candidates.length} total.`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
