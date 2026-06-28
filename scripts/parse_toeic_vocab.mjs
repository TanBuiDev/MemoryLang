import fs from 'node:fs'

const md = fs.readFileSync('toeic_vocab_db.md', 'utf-8')

// Split by ENTRY headers
const entryBlocks = md.split(/^## ENTRY \d+/gm).slice(1)

const entries = []

for (const block of entryBlocks) {
  const lines = block.trim().split('\n')
  const entry = {}

  for (const line of lines) {
    const trimmed = line.trim()

    // Parse basic fields
    const fieldMatch = trimmed.match(/^-\s*\*\*(\w+)\*\*:\s*(.+)$/)
    if (fieldMatch) {
      const key = fieldMatch[1]
      const rawVal = fieldMatch[2].trim()

      switch (key) {
        case 'id':
        case 'source_text':
        case 'normalized_text':
        case 'item_type':
        case 'part_of_speech':
        case 'ipa':
        case 'pronunciation_text':
        case 'translation':
          entry[key] = rawVal
          break
        case 'tags':
          // Parse [tag1, tag2, ...]
          const tagStr = rawVal.replace(/^\[|\]$/g, '')
          entry.tags = tagStr.split(',').map(t => t.trim()).filter(Boolean)
          break
        case 'note':
          entry.note = rawVal.replace(/^"|"$/g, '')
          break
      }
      continue
    }

    // Parse multi-line fields
    if (trimmed.startsWith('- ') && trimmed.includes(':')) {
      // meanings, forms, examples sub-items
      continue // handled below
    }
  }

  // Parse meanings section
  const meanStart = block.indexOf('**meanings**:')
  if (meanStart !== -1) {
    const meanSection = block.substring(meanStart)
    const meanEnd = meanSection.indexOf('\n- **')
    const meanContent = meanEnd !== -1 ? meanSection.substring(0, meanEnd) : meanSection
    const meaningLines = meanContent.split('\n').filter(l => l.trim().startsWith('- '))
    entry.meanings = meaningLines.map(l => {
      const text = l.replace(/^\s*-\s*/, '').trim()
      return { text, language: 'vi' }
    })
  }

  // Parse examples section
  const exStart = block.indexOf('**examples**:')
  if (exStart !== -1) {
    const exSection = block.substring(exStart)
    const exEnd = exSection.indexOf('\n- **')
    const exContent = exEnd !== -1 ? exSection.substring(0, exEnd) : exSection
    const exampleLines = exContent.split('\n').filter(l => l.trim().startsWith('- '))

    entry.examples = []
    for (const el of exampleLines) {
      let clean = el.replace(/^\s*-\s*/, '').trim()
      // Remove leading quote
      if (clean.startsWith('"')) clean = clean.substring(1)
      // Remove trailing quote if it's the last char
      if (clean.endsWith('"')) clean = clean.substring(0, clean.length - 1)

      // Split on " → " (with preceding quote) or just " → "
      let arrowIdx = clean.indexOf('" → ')
      if (arrowIdx === -1) arrowIdx = clean.indexOf(' → ')
      if (arrowIdx !== -1) {
        let sentence = clean.substring(0, arrowIdx).trim()
        // Remove trailing quote from sentence if present
        if (sentence.endsWith('"')) sentence = sentence.substring(0, sentence.length - 1)
        const translation = clean.substring(arrowIdx + 3).trim()
        entry.examples.push({ sentence, translation })
      } else {
        entry.examples.push({ sentence: clean, translation: '' })
      }
    }
  }

  // Parse note if it wasn't caught
  if (!entry.note) {
    const noteMatch = block.match(/\*\*note\*\*:\s*(.+)/i)
    if (noteMatch) {
      entry.note = noteMatch[1].trim().replace(/^"|"$/g, '')
    }
  }

  entries.push(entry)
}

// Generate SQL
const USER_ID = '7112930d-527c-47dc-85f6-1f03a49d603c'

let sql = `-- TOEIC Vocabulary Import — ${entries.length} entries
-- Generated from toeic_vocab_db.md

`

// Single INSERT with all values
sql += `INSERT INTO public.user_terms (
  user_id, source_text, normalized_text, source_language, native_language,
  item_type, part_of_speech, ipa, pronunciation_text,
  meanings, examples, tags, note, translation, status
) VALUES\n`

const esc = (s) => s ? `'${s.replace(/'/g, "''")}'` : 'NULL'
const values = entries.map(e => {
  const meaningsJson = e.meanings?.length
    ? `'${JSON.stringify(e.meanings).replace(/'/g, "''")}'::jsonb`
    : "'[]'::jsonb"
  const examplesJson = e.examples?.length
    ? `'${JSON.stringify(e.examples).replace(/'/g, "''")}'::jsonb`
    : "'[]'::jsonb"
  const tagsArr = e.tags?.length
    ? `ARRAY[${e.tags.map(t => `'${t.replace(/'/g, "''")}'`).join(', ')}]`
    : "'{}'::text[]"

  return `(${esc(USER_ID)}, ${esc(e.source_text)}, ${esc(e.normalized_text)}, 'en', 'vi', ${esc(e.item_type)}, ${esc(e.part_of_speech)}, ${esc(e.ipa)}, ${esc(e.pronunciation_text)}, ${meaningsJson}, ${examplesJson}, ${tagsArr}, ${esc(e.note)}, ${esc(e.translation)}, 'new')`
})

sql += values.join(',\n') + ';\n'

// Write SQL file
fs.writeFileSync('scripts/toeic_vocab_import.sql', sql, 'utf-8')
console.log(`Generated SQL for ${entries.length} entries → scripts/toeic_vocab_import.sql`)

// Also log summary
const types = {}
for (const e of entries) {
  types[e.item_type] = (types[e.item_type] || 0) + 1
}
console.log('Item types:', types)
console.log('Entries with IPA:', entries.filter(e => e.ipa).length)
console.log('Entries with examples:', entries.filter(e => e.examples?.length).length)
console.log('Entries with meanings:', entries.filter(e => e.meanings?.length).length)
console.log('Entries with note:', entries.filter(e => e.note).length)
console.log('Entries with tags:', entries.filter(e => e.tags?.length).length)
