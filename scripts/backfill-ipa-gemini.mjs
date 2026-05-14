import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const PROJECT_REF = 'brwvbpkgimhamivmaflu'
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite'
const DRY_RUN = process.argv.includes('--dry-run')
const LIMIT = readNumberArg('--limit', Number.POSITIVE_INFINITY)
const BATCH_SIZE = readNumberArg('--batch-size', 20)
const DELAY_MS = readNumberArg('--delay-ms', 600)
const MAX_RETRIES = readNumberArg('--retries', 3)

const env = loadEnv()
const SUPABASE_URL = process.env.SUPABASE_URL || env.VITE_SUPABASE_URL
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || getServiceRoleKey()

if (!SUPABASE_URL) fail('Missing SUPABASE_URL or VITE_SUPABASE_URL')
if (!SUPABASE_SERVICE_ROLE_KEY) fail('Missing SUPABASE_SERVICE_ROLE_KEY')
if (!GEMINI_API_KEY) fail('Missing GEMINI_API_KEY')

const supabaseHeaders = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
}

const stats = {
  scanned: 0,
  generated: 0,
  updated: 0,
  skipped: 0,
  failed: 0,
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

async function main() {
  const terms = await fetchMissingTerms()
  const selected = terms.slice(0, Number.isFinite(LIMIT) ? LIMIT : terms.length)

  console.log(`Found ${terms.length} terms missing IPA. Processing ${selected.length}. Dry run: ${DRY_RUN}`)

  for (let index = 0; index < selected.length; index += BATCH_SIZE) {
    const batch = selected.slice(index, index + BATCH_SIZE)
    stats.scanned += batch.length

    try {
      const ipaById = await generateIpaBatch(batch)

      for (const term of batch) {
        const ipa = ipaById.get(term.id)
        if (!ipa) {
          stats.skipped += 1
          console.log(`skip  ${term.source_text}`)
          continue
        }

        stats.generated += 1
        if (DRY_RUN) {
          console.log(`dry   ${term.source_text} -> ${ipa}`)
        } else {
          const globalTermId = await upsertGlobalTerm(term, ipa)
          await updateUserTerm(term.id, ipa, globalTermId)
          stats.updated += 1
          console.log(`ok    ${term.source_text} -> ${ipa}`)
        }
      }
    } catch (error) {
      stats.failed += batch.length
      console.error(`fail  batch ${index + 1}-${index + batch.length}: ${error.message}`)
    }

    await sleep(DELAY_MS)
  }

  console.log(JSON.stringify(stats, null, 2))
}

async function fetchMissingTerms() {
  const params = new URLSearchParams()
  params.set(
    'select',
    'id,user_id,global_term_id,source_text,normalized_text,source_language,native_language,item_type,part_of_speech,meanings,translation,examples,note',
  )
  params.set('source_language', 'eq.en')
  params.set('or', '(ipa.is.null,ipa.eq.)')
  params.set('order', 'source_text.asc')
  params.set('limit', '1000')

  const response = await fetch(`${SUPABASE_URL}/rest/v1/user_terms?${params}`, {
    headers: supabaseHeaders,
  })
  if (!response.ok) throw new Error(`Fetch terms failed: ${response.status} ${await response.text()}`)
  return response.json()
}

async function generateIpaBatch(terms) {
  const entries = terms.map((term) => ({
    id: term.id,
    entry: term.source_text,
    type: term.item_type ?? '',
    partOfSpeech: term.part_of_speech ?? '',
    meaning: term.meanings ?? [],
    translation: term.translation ?? '',
    examples: term.examples ?? [],
    note: term.note ?? '',
  }))

  const prompt = [
    'You are an expert English phonetician.',
    'Return JSON only with this exact shape: {"items":[{"id": string, "ipa": string|null}]}.',
    'Use IPA in slashes, for example "/ˈrek.ɔːrd/".',
    'Prefer General American pronunciation unless the phrase strongly implies another standard.',
    'Use the provided part of speech, meaning, translation, examples, and notes to resolve heteronyms.',
    'For phrases, idioms, and sentences, include natural connected-speech IPA when appropriate.',
    'If an entry contains alternatives separated by "/" or ";", provide IPA for each alternative in the same order, separated by " / " or ";".',
    'If the entry is not pronounceable English, return {"ipa":null}.',
    'Return exactly one item for each input id.',
    '',
    JSON.stringify({ entries }),
  ].join('\n')

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
    },
  }

  const data = await retry(async () => {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    )
    if (!response.ok) throw new Error(`Gemini failed: ${response.status} ${await response.text()}`)
    return response.json()
  })

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  const parsed = parseJsonText(text)
  const ipaById = new Map()
  for (const item of parsed?.items ?? []) {
    ipaById.set(item.id, sanitizeIpa(item.ipa))
  }
  return ipaById
}

async function upsertGlobalTerm(term, ipa) {
  const payload = {
    source_text: term.source_text,
    normalized_text: term.normalized_text,
    source_language: term.source_language,
    native_language: term.native_language,
    item_type: term.item_type ?? 'word',
    part_of_speech: term.part_of_speech,
    ipa,
    pronunciation_text: null,
    audio_url: null,
    image_url: null,
    meanings: Array.isArray(term.meanings) ? term.meanings : [],
    examples: Array.isArray(term.examples) ? term.examples : [],
    source: 'gemini',
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/global_terms?on_conflict=normalized_text,source_language,native_language`, {
    method: 'POST',
    headers: {
      ...supabaseHeaders,
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) throw new Error(`Upsert global_terms failed: ${response.status} ${await response.text()}`)
  const [row] = await response.json()
  return row?.id ?? null
}

async function updateUserTerm(id, ipa, globalTermId) {
  const payload = globalTermId ? { ipa, global_term_id: globalTermId } : { ipa }
  const response = await fetch(`${SUPABASE_URL}/rest/v1/user_terms?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      ...supabaseHeaders,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) throw new Error(`Update user_terms failed: ${response.status} ${await response.text()}`)
}

function loadEnv() {
  const result = {}
  try {
    const content = readFileSync('.env', 'utf8')
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^([^#=\s]+)=(.*)$/)
      if (match) result[match[1]] = match[2]
    }
  } catch {
    // .env is optional when process env is populated.
  }
  return result
}

function getServiceRoleKey() {
  const result = spawnSync(
    'npx',
    ['supabase', 'projects', 'api-keys', '--project-ref', PROJECT_REF, '-o', 'json'],
    { encoding: 'utf8', shell: true },
  )
  if (result.status !== 0) return ''

  try {
    const keys = JSON.parse(result.stdout)
    return keys.find((entry) => entry.name === 'service_role')?.api_key ?? ''
  } catch {
    return ''
  }
}

function parseJsonText(text) {
  if (!text) return null
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : null
  }
}

function sanitizeIpa(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.toLowerCase() === 'null') return null
  const withoutOuterQuotes = trimmed.replace(/^["']|["']$/g, '')
  return withoutOuterQuotes.startsWith('/') ? withoutOuterQuotes : `/${withoutOuterQuotes.replace(/^\/|\/$/g, '')}/`
}

function summarizeJson(value) {
  if (!value) return ''
  const text = JSON.stringify(value)
  return text.length > 900 ? `${text.slice(0, 900)}...` : text
}

async function retry(fn) {
  let lastError
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt < MAX_RETRIES) await sleep(1000 * attempt)
    }
  }
  throw lastError
}

function readNumberArg(name, fallback) {
  const index = process.argv.indexOf(name)
  if (index === -1) return fallback
  const value = Number(process.argv[index + 1])
  return Number.isFinite(value) ? value : fallback
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function fail(message) {
  console.error(message)
  process.exit(1)
}
