import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// --- Config ---
const DRY_RUN = process.argv.includes('--dry-run')
const SQL_MODE = process.argv.includes('--sql')
const DATA_FILE = resolve(import.meta.dirname ?? '.', '..', 'data.txt')
const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? ''
const TARGET_USER_ID = process.env.TARGET_USER_ID ?? ''
const ENRICH = process.env.ENRICH === 'true'
const BATCH_SIZE = 50

let supabase: SupabaseClient | null = null

if (!DRY_RUN && !SQL_MODE) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_KEY')
    process.exit(1)
  }
  if (!TARGET_USER_ID) {
    console.error('Missing TARGET_USER_ID env var')
    process.exit(1)
  }
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
}

// --- Types ---
const POS_TAGS = ['n', 'v', 'adj', 'adv', 'prep', 'conj', 'pron', 'det', 'interj', 'num'] as const
const BLOCKED_RELATIONSHIP_TARGETS = new Set([
  'after',
  'before',
  'effect',
  'into',
  'sth',
  'sb',
  'under',
  'ving',
])

interface ParsedEntry {
  source_text: string
  source_language: 'en'
  native_language: 'vi'
  item_type: 'word' | 'phrase' | 'idiom'
  part_of_speech: string | null
  translation: string
  note: string | null
  examples: { sentence: string; translation: string }[]
  meanings: { text: string; language: string }[]
}

interface ParsedRelationship {
  source_text: string
  target_text: string
  relation_type: string
}

interface ParseResult {
  entries: ParsedEntry[]
  relationships: ParsedRelationship[]
}

// --- Helpers ---
function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function isPOSTag(text: string): boolean {
  const clean = text.trim().toLowerCase().replace(/[^a-z]/g, '')
  return (POS_TAGS as readonly string[]).includes(clean)
}

function shouldKeepRelationship(rel: ParsedRelationship): boolean {
  const source = normalizeText(rel.source_text)
  const target = normalizeText(rel.target_text)
  if (!source || !target || source === target) return false
  if (isPOSTag(target)) return false
  if (BLOCKED_RELATIONSHIP_TARGETS.has(target)) return false
  return true
}

function hasVietnameseGrammar(text: string): boolean {
  const markers = ['thường', 'làm', 'khi', 'trước', 'sau', 'dùng', 'đứng', 'đi kèm', 'đi với']
  return markers.some((m) => text.includes(m))
}

function isExplanatory(text: string): boolean {
  const lower = text.toLowerCase()
  if (lower.includes(' = ') || lower.includes(' (~') || lower.includes('= ') || lower.includes(' beyond')) return false
  const posMatch = text.match(/\(([a-z]+)\)/)
  if (posMatch && isPOSTag(posMatch[1])) return false
  return hasVietnameseGrammar(text)
}

function extractSynonymsFromText(text: string): { word: string; type: 'synonym' | 'antonym' }[] {
  const results: { word: string; type: 'synonym' | 'antonym' }[] = []
  // Pattern: (= synonym1, synonym2) or (~ = synonym)
  const synMatches = text.matchAll(/\(=?\s*([^)]+?)\s*\)/g)
  for (const m of synMatches) {
    const content = m[1].trim()
    if (content.startsWith('~') || content.includes('>') || content.includes('<')) continue
    const words = content.split(/\s*,\s*/)
    for (const w of words) {
      const clean = w.replace(/^~\s*/, '').trim()
      if (clean && /^[a-z\s'"+-]+$/i.test(clean) && clean.split(' ').length <= 6 && clean.length > 1) {
        results.push({ word: clean.toLowerCase(), type: 'synonym' })
      }
    }
  }
  // Antonym pattern: (> < word1, word2)
  const antPattern = />(?:\s*<\s*)([^:)]+)/g
  const antMatches = text.matchAll(antPattern)
  for (const m of antMatches) {
    const words = m[1].split(/\s*,\s*/)
    for (const w of words) {
      const clean = w.trim()
      if (clean && /^[a-z\s'"+-]+$/i.test(clean) && clean.split(' ').length <= 6 && clean.length > 1) {
        results.push({ word: clean.toLowerCase(), type: 'antonym' })
      }
    }
  }
  return results
}

// --- Parser ---
function parseDataFile(content: string): ParseResult {
  const lines = content.split('\n')
  const entries: ParsedEntry[] = []
  const relationships: ParsedRelationship[] = []
  const seenSourceTexts = new Set<string>()
  let inPart2 = false

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim()
    if (!raw) continue
    if (raw.includes('Phần 2:') || raw.includes('### Phần 2')) { inPart2 = true; continue }
    if (raw.startsWith('---')) continue
    if (raw.startsWith('Dưới đây')) continue

    // Strip markdown bold markers for easier parsing
    const line = raw.replace(/\*\*/g, '')

    // Part 2: Idioms
    if (inPart2) {
      const idiomMatch = line.match(/^\d+\.\s*(.+?):\s*(.+?)\.?\s*$/)
      if (idiomMatch) {
        const idiomText = idiomMatch[1].trim()
        const translation = idiomMatch[2].trim().replace(/\.$/, '')
        const entry: ParsedEntry = {
          source_text: idiomText,
          source_language: 'en',
          native_language: 'vi',
          item_type: 'idiom',
          part_of_speech: null,
          translation,
          note: null,
          examples: [],
          meanings: [],
        }
        entries.push(entry)

        // Extract synonyms/antonyms from idiom translation (use line, not raw, to avoid ** markers)
        const idiomSyns = extractSynonymsFromText(line)
        for (const sa of idiomSyns) {
          if (!seenSourceTexts.has(normalizeText(sa.word))) {
            entries.push({
              source_text: sa.word,
              source_language: 'en',
              native_language: 'vi',
              item_type: 'phrase',
              part_of_speech: null,
              translation: '',
              note: null,
              examples: [],
              meanings: [],
            })
            seenSourceTexts.add(normalizeText(sa.word))
          }
          relationships.push({ source_text: idiomText, target_text: sa.word, relation_type: sa.type })
        }
        seenSourceTexts.add(normalizeText(idiomText))

        // Link idiom to root word if it exists
        const words = idiomText.split(/\s+/)
        for (const w of words) {
          const wn = normalizeText(w)
          if (wn.length > 2 && !['the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'for', 'by', 'with', 'one', 's', 'no', 'all', 'be', 'go'].includes(wn)) {
            relationships.push({ source_text: idiomText, target_text: wn, relation_type: 'idiom' })
          }
        }
      }
      continue
    }

    // Part 1: Main entries (line already has ** stripped)
    // Split by "*Mở rộng*:" to separate main from expanded
    const moRongSplit = line.split(/\*Mở rộng\*:\s*/)
    const mainPart = moRongSplit[0]?.trim() ?? ''
    const moRongRaw = moRongSplit[1]?.trim() ?? null

    // Match: * source_text: (pos) translation.
    const mainMatch = mainPart.match(/^\*\s*(.+?):\s*(\((?:[a-z]+(?:[,/&][a-z]+)*)\))\s*(.+?)\.?\s*$/)
    if (mainMatch) {
      const sourceText = mainMatch[1].trim()
      const posRaw = mainMatch[2]
      const translationRaw = mainMatch[3]

      // Parse POS
      const posClean = posRaw.replace(/[()]/g, '').toLowerCase()
      const primaryPos = posClean.split(/[,/&]/)[0]?.trim() ?? ''
      const pos = isPOSTag(primaryPos) ? primaryPos : null
      const translation = translationRaw.trim().replace(/\.$/, '')

      const currentMain: ParsedEntry = {
        source_text: sourceText,
        source_language: 'en',
        native_language: 'vi',
        item_type: 'word',
        part_of_speech: pos,
        translation,
        note: null,
        examples: [],
        meanings: [],
      }
      entries.push(currentMain)
      seenSourceTexts.add(normalizeText(sourceText))

      // Parse "Mở rộng"
      if (moRongRaw) {
        const noteParts: string[] = []
        const parts = moRongRaw.split(/;\s*(?=\S)/)

        for (const part of parts) {
          const p = part.trim().replace(/\.$/, '')
          if (!p) continue

          // Check synonym/antonym patterns
          const synAnts = extractSynonymsFromText(p)
          if (synAnts.length > 0) {
            for (const sa of synAnts) {
              if (!seenSourceTexts.has(normalizeText(sa.word))) {
                entries.push({
                  source_text: sa.word,
                  source_language: 'en',
                  native_language: 'vi',
                  item_type: 'word',
                  part_of_speech: null,
                  translation: '',
                  note: null,
                  examples: [],
                  meanings: [],
                })
                seenSourceTexts.add(normalizeText(sa.word))
              }
              relationships.push({ source_text: sourceText, target_text: sa.word, relation_type: sa.type })
            }
            continue
          }

          // Check example sentence
          if (/^[A-Z]/.test(p) && p.split(' ').length > 5) {
            const exMatch = p.match(/^(.+?)\s*\((.+?)\)\s*$/)
            if (exMatch) {
              currentMain.examples.push({ sentence: exMatch[1].trim(), translation: exMatch[2].trim() })
            } else {
              currentMain.examples.push({ sentence: p, translation: '' })
            }
            continue
          }

          // Check derivative or collocation
          const derMatch = p.match(/^([a-z]+(?:\s+[a-z]+)?)\s*\(([a-z, ]+)\)\s*(.+?)?$/i)
          if (derMatch && isPOSTag(derMatch[2])) {
            const derWord = derMatch[1].trim()
            const derTrans = derMatch[3]?.trim() ?? ''
            const isSingleWord = !derWord.includes(' ')

            if (isSingleWord && normalizeText(derWord) !== normalizeText(sourceText)) {
              // Derivative
              if (!seenSourceTexts.has(normalizeText(derWord))) {
                entries.push({
                  source_text: derWord,
                  source_language: 'en',
                  native_language: 'vi',
                  item_type: 'word',
                  part_of_speech: derMatch[2].trim().split(/[,/&]/)[0]?.trim() ?? null,
                  translation: derTrans,
                  note: null,
                  examples: [],
                  meanings: [],
                })
                seenSourceTexts.add(normalizeText(derWord))
              }
              relationships.push({ source_text: sourceText, target_text: derWord, relation_type: 'derivative' })
            } else if (!isSingleWord) {
              // Multi-word with POS = collocation
              if (!seenSourceTexts.has(normalizeText(derWord))) {
                entries.push({
                  source_text: derWord,
                  source_language: 'en',
                  native_language: 'vi',
                  item_type: 'phrase',
                  part_of_speech: null,
                  translation: derTrans,
                  note: null,
                  examples: [],
                  meanings: [],
                })
                seenSourceTexts.add(normalizeText(derWord))
              }
              relationships.push({ source_text: sourceText, target_text: derWord, relation_type: 'collocation' })
            }
            continue
          }

          // Check collocation with translation in parentheses
          const collMatch = p.match(/^(.+?)\s*\((.+?)\)\s*$/)
          if (collMatch && !isPOSTag(collMatch[2])) {
            const collWord = collMatch[1].trim()
            const collTrans = collMatch[2].trim()
            if (collWord.split(' ').length >= 2 && normalizeText(collWord) !== normalizeText(sourceText)) {
              if (!seenSourceTexts.has(normalizeText(collWord))) {
                entries.push({
                  source_text: collWord,
                  source_language: 'en',
                  native_language: 'vi',
                  item_type: 'phrase',
                  part_of_speech: null,
                  translation: collTrans,
                  note: null,
                  examples: [],
                  meanings: [],
                })
                seenSourceTexts.add(normalizeText(collWord))
              }
              relationships.push({ source_text: sourceText, target_text: collWord, relation_type: 'collocation' })
              continue
            }
          }

          // Explanatory text → note
          if (isExplanatory(p)) {
            noteParts.push(p)
            continue
          }

          // Fallback: try to extract as collocation/phrase
          const words = p.split(/\s+/)
          if (words.length >= 2 && words.every((w) => /^[a-z'-]+$/i.test(w))) {
            if (!seenSourceTexts.has(normalizeText(p))) {
              entries.push({
                source_text: p,
                source_language: 'en',
                native_language: 'vi',
                item_type: 'phrase',
                part_of_speech: null,
                translation: '',
                note: null,
                examples: [],
                meanings: [],
              })
              seenSourceTexts.add(normalizeText(p))
            }
            relationships.push({ source_text: sourceText, target_text: p, relation_type: 'collocation' })
          } else {
            noteParts.push(p)
          }
        }

        if (noteParts.length > 0) {
          currentMain.note = noteParts.join(' | ')
        }
      }
    }
  }

  return { entries, relationships: relationships.filter(shouldKeepRelationship) }
}

// --- Enrichment ---
async function enrichEntry(text: string): Promise<{ meanings: { text: string; language: string }[]; ipa: string | null; examples: { sentence: string; translation: string }[]; audio_url: string | null } | null> {
  if (!ENRICH) return null
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/enrich-vocabulary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_KEY}`, apikey: SUPABASE_KEY },
      body: JSON.stringify({ text, sourceLanguage: 'en', nativeLanguage: 'vi' }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return {
      meanings: Array.isArray(data.meanings) ? data.meanings : [],
      ipa: data.ipa ?? null,
      examples: Array.isArray(data.examples) ? data.examples : [],
      audio_url: data.audioUrl ?? null,
    }
  } catch {
    return null
  }
}

// --- Insert ---
async function insertData(result: ParseResult) {
  const { entries, relationships } = result
  console.log(`Parsed ${entries.length} entries, ${relationships.length} relationships`)

  // Deduplicate by normalized source_text (keep first occurrence)
  const uniqueEntries = new Map<string, ParsedEntry>()
  for (const e of entries) {
    const key = normalizeText(e.source_text)
    if (!uniqueEntries.has(key)) uniqueEntries.set(key, e)
  }
  const deduped = [...uniqueEntries.values()]
  console.log(`After dedup: ${deduped.length} unique entries`)

  // Deduplicate relationships
  const uniqueRels = new Map<string, ParsedRelationship>()
  for (const r of relationships) {
    const key = `${normalizeText(r.source_text)}|${r.relation_type}|${normalizeText(r.target_text)}`
    if (!uniqueRels.has(key)) uniqueRels.set(key, r)
  }
  const dedupedRels = [...uniqueRels.values()]

  // Insert entries in batches
  const insertedMap = new Map<string, string>() // normalized_text → id

  for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
    const batch = deduped.slice(i, i + BATCH_SIZE)
    console.log(`Inserting entries ${i + 1}-${Math.min(i + BATCH_SIZE, deduped.length)}...`)

    for (const entry of batch) {
      // Optional enrichment
      let enrichment: Awaited<ReturnType<typeof enrichEntry>> = null
      if (ENRICH && entry.item_type === 'word') {
        enrichment = await enrichEntry(entry.source_text)
        if (enrichment) {
          await new Promise((r) => setTimeout(r, 200)) // rate limit
        }
      }

      const normalized = normalizeText(entry.source_text)
      const row = {
        user_id: TARGET_USER_ID,
        source_text: entry.source_text,
        normalized_text: normalized,
        source_language: entry.source_language,
        native_language: entry.native_language,
        item_type: entry.item_type,
        part_of_speech: entry.part_of_speech,
        ipa: enrichment?.ipa ?? null,
        audio_url: enrichment?.audio_url ?? null,
        image_url: null,
        note: entry.note,
        meanings: enrichment?.meanings?.length ? enrichment.meanings : [],
        examples: enrichment?.examples?.length ? enrichment.examples : entry.examples,
        translation: entry.translation,
        tags: [],
        status: 'new' as const,
      }

      const { data, error } = await supabase!.from('user_terms').insert(row).select('id').single()
      if (error) {
        console.error(`  Error inserting "${entry.source_text}":`, error.message)
        continue
      }
      insertedMap.set(normalized, data.id)
    }
  }

  console.log(`Inserted ${insertedMap.size} entries`)

  // Insert relationships
  let relCount = 0
  const bidirectionalTypes = new Set(['synonym', 'antonym', 'related'])

  for (let i = 0; i < dedupedRels.length; i += BATCH_SIZE) {
    const batch = dedupedRels.slice(i, i + BATCH_SIZE)
    console.log(`Inserting relationships ${i + 1}-${Math.min(i + BATCH_SIZE, dedupedRels.length)}...`)

    const rows: { source_id: string; target_id: string; relation_type: string }[] = []

    for (const rel of batch) {
      const sourceId = insertedMap.get(normalizeText(rel.source_text))
      const targetId = insertedMap.get(normalizeText(rel.target_text))
      if (!sourceId || !targetId) continue
      if (sourceId === targetId) continue

      rows.push({ source_id: sourceId, target_id: targetId, relation_type: rel.relation_type })

      if (bidirectionalTypes.has(rel.relation_type)) {
        rows.push({ source_id: targetId, target_id: sourceId, relation_type: rel.relation_type })
      }
    }

    if (rows.length > 0) {
      // Deduplicate rows
      const uniqueRows = new Map<string, typeof rows[0]>()
      for (const r of rows) {
        const key = `${r.source_id}|${r.relation_type}|${r.target_id}`
        if (!uniqueRows.has(key)) uniqueRows.set(key, r)
      }
      const { error } = await supabase!.from('term_relationships').insert([...uniqueRows.values()])
      if (error) {
        console.error('  Error inserting relationships:', error.message)
      } else {
        relCount += uniqueRows.size
      }
    }
  }

  console.log(`Inserted ${relCount} relationships`)
  return { entries: insertedMap.size, relationships: relCount }
}

// --- SQL Generation ---
function escapeSQL(value: string): string {
  return value.replace(/'/g, "''")
}

function generateSQL(result: ParseResult, userId: string): string {
  const { entries, relationships } = result
  const lines: string[] = []

  // Deduplicate entries
  const uniqueEntries = new Map<string, ParsedEntry>()
  for (const e of entries) {
    const key = normalizeText(e.source_text)
    if (!uniqueEntries.has(key)) uniqueEntries.set(key, e)
  }
  const deduped = [...uniqueEntries.values()]

  // Deduplicate relationships
  const uniqueRels = new Map<string, ParsedRelationship>()
  for (const r of relationships) {
    const key = `${normalizeText(r.source_text)}|${r.relation_type}|${normalizeText(r.target_text)}`
    if (!uniqueRels.has(key)) uniqueRels.set(key, r)
  }
  const dedupedRels = [...uniqueRels.values()]

  lines.push(`-- MemoryLang vocabulary import`)
  lines.push(`-- User: ${userId}`)
  lines.push(`-- Entries: ${deduped.length}, Relationships: ${dedupedRels.length}`)
  lines.push('')
  lines.push('BEGIN;')
  lines.push('')

  // Insert entries
  lines.push('-- ===== ENTRIES =====')
  for (const entry of deduped) {
    const normalized = normalizeText(entry.source_text)
    const note = entry.note ? `'${escapeSQL(entry.note)}'` : 'NULL'
    const pos = entry.part_of_speech ? `'${escapeSQL(entry.part_of_speech)}'` : 'NULL'
    const translation = entry.translation ? `'${escapeSQL(entry.translation)}'` : 'NULL'
    const examples = entry.examples.length > 0 ? `'${JSON.stringify(entry.examples).replace(/'/g, "''")}'` : "'[]'"
    const meanings = entry.meanings.length > 0 ? `'${JSON.stringify(entry.meanings).replace(/'/g, "''")}'` : "'[]'"

    lines.push(
      `INSERT INTO public.user_terms (user_id, source_text, normalized_text, source_language, native_language, item_type, part_of_speech, note, translation, meanings, examples, tags, status) VALUES ('${userId}', '${escapeSQL(entry.source_text)}', '${escapeSQL(normalized)}', '${entry.source_language}', '${entry.native_language}', '${entry.item_type}', ${pos}, ${note}, ${translation}, ${meanings}, ${examples}, '{}', 'new') ON CONFLICT DO NOTHING;`
    )
  }

  lines.push('')
  lines.push('-- ===== RELATIONSHIPS =====')
  lines.push('-- Use a CTE to resolve source_text -> id mapping')
  lines.push('')

  // Build relationship inserts using subqueries
  const bidirectionalTypes = new Set(['synonym', 'antonym', 'related'])

  for (const rel of dedupedRels) {
    const srcNorm = normalizeText(rel.source_text)
    const tgtNorm = normalizeText(rel.target_text)

    lines.push(
      `INSERT INTO public.term_relationships (source_id, target_id, relation_type) SELECT s.id, t.id, '${rel.relation_type}' FROM public.user_terms s, public.user_terms t WHERE s.user_id = '${userId}' AND s.normalized_text = '${escapeSQL(srcNorm)}' AND t.user_id = '${userId}' AND t.normalized_text = '${escapeSQL(tgtNorm)}' AND s.id <> t.id ON CONFLICT DO NOTHING;`
    )

    if (bidirectionalTypes.has(rel.relation_type)) {
      lines.push(
        `INSERT INTO public.term_relationships (source_id, target_id, relation_type) SELECT t.id, s.id, '${rel.relation_type}' FROM public.user_terms s, public.user_terms t WHERE s.user_id = '${userId}' AND s.normalized_text = '${escapeSQL(srcNorm)}' AND t.user_id = '${userId}' AND t.normalized_text = '${escapeSQL(tgtNorm)}' AND s.id <> t.id ON CONFLICT DO NOTHING;`
      )
    }
  }

  lines.push('')
  lines.push('COMMIT;')
  lines.push('')
  lines.push(`-- Done! ${deduped.length} entries, ${dedupedRels.length * 2} relationship rows (with bidirectional)`)

  return lines.join('\n')
}

// --- Main ---
async function main() {
  console.log(`Reading ${DATA_FILE}...`)
  const content = readFileSync(DATA_FILE, 'utf-8')

  console.log('Parsing...')
  const result = parseDataFile(content)

  // Debug: show first 5 entries
  console.log('\n--- First 5 entries ---')
  for (const e of result.entries.slice(0, 5)) {
    console.log(`  ${e.source_text} (${e.part_of_speech ?? '-'}) → ${e.translation}`)
    if (e.note) console.log(`    note: ${e.note.slice(0, 80)}`)
    if (e.examples.length) console.log(`    examples: ${e.examples.length}`)
  }
  console.log(`\n--- First 5 relationships ---`)
  for (const r of result.relationships.slice(0, 5)) {
    console.log(`  ${r.source_text} --[${r.relation_type}]--> ${r.target_text}`)
  }

  // Show stats
  const types = new Map<string, number>()
  for (const e of result.entries) {
    types.set(e.item_type, (types.get(e.item_type) ?? 0) + 1)
  }
  console.log('\n--- Stats ---')
  for (const [t, c] of types) console.log(`  ${t}: ${c}`)

  const relTypes = new Map<string, number>()
  for (const r of result.relationships) {
    relTypes.set(r.relation_type, (relTypes.get(r.relation_type) ?? 0) + 1)
  }
  for (const [t, c] of relTypes) console.log(`  relationship ${t}: ${c}`)

  // Dedup stats
  const uniqueEntries = new Map<string, ParsedEntry>()
  for (const e of result.entries) {
    const key = normalizeText(e.source_text)
    if (!uniqueEntries.has(key)) uniqueEntries.set(key, e)
  }
  const uniqueRels = new Map<string, ParsedRelationship>()
  for (const r of result.relationships) {
    const key = `${normalizeText(r.source_text)}|${r.relation_type}|${normalizeText(r.target_text)}`
    if (!uniqueRels.has(key)) uniqueRels.set(key, r)
  }
  console.log(`\nAfter dedup: ${uniqueEntries.size} entries, ${uniqueRels.size} relationships`)

  if (SQL_MODE) {
    const userId = TARGET_USER_ID || 'REPLACE_WITH_USER_ID'
    const sql = generateSQL(result, userId)
    const outFile = resolve(import.meta.dirname ?? '.', 'import-vocabulary.sql')
    const { writeFileSync } = await import('node:fs')
    writeFileSync(outFile, sql, 'utf-8')
    console.log(`\n[SQL MODE] Written to ${outFile}`)
    console.log(`Copy and paste the SQL into Supabase SQL Editor to execute.`)
    return
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Skipping database insertion.')
    // Show sample entries with notes/examples
    console.log('\n--- Sample entries with notes ---')
    for (const e of uniqueEntries.values()) {
      if (e.note) {
        console.log(`  ${e.source_text}: note=${e.note.slice(0, 100)}`)
      }
    }
    console.log('\n--- Sample entries with examples ---')
    for (const e of uniqueEntries.values()) {
      if (e.examples.length > 0) {
        console.log(`  ${e.source_text}: ${e.examples.length} example(s)`)
        for (const ex of e.examples.slice(0, 2)) {
          console.log(`    "${ex.sentence}" → ${ex.translation}`)
        }
      }
    }
    return
  }

  // Insert
  console.log(`\nTarget user: ${TARGET_USER_ID}`)
  console.log(`Enrichment: ${ENRICH ? 'ON' : 'OFF'}`)
  console.log('Inserting into database...')

  const stats = await insertData(result)
  console.log(`\nDone! Inserted ${stats.entries} entries, ${stats.relationships} relationships`)
}

main().catch(console.error)
