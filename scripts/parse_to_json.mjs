import fs from 'node:fs'

const md = fs.readFileSync('toeic_vocab_db.md', 'utf-8')
const blocks = md.split(/^## ENTRY \d+/gm).slice(1)
const entries = []

for (const block of blocks) {
  const lines = block.trim().split('\n')
  const e = {}

  for (const line of lines) {
    const m = line.trim().match(/^-\s*\*\*(\w+)\*\*:\s*(.+)$/)
    if (!m) continue
    const key = m[1], val = m[2].trim()
    if (key === 'tags') {
      e.tags = val.replace(/^\[|\]$/g, '').split(',').map(t => t.trim()).filter(Boolean)
    } else if (key === 'note') {
      e.note = val.replace(/^"/, '').replace(/"$/, '')
    } else {
      e[key] = val
    }
  }

  // Parse meanings
  const ms = block.indexOf('**meanings**:')
  if (ms !== -1) {
    const sec = block.substring(ms).split('\n- **')[0]
    e.meanings = sec.split('\n').filter(l => l.trim().startsWith('- '))
      .map(l => ({ text: l.replace(/^\s*-\s*/, '').trim(), language: 'vi' }))
  }

  // Parse examples
  const ex = block.indexOf('**examples**:')
  if (ex !== -1) {
    const sec = block.substring(ex).split('\n- **')[0]
    e.examples = sec.split('\n').filter(l => l.trim().startsWith('- ')).map(l => {
      let c = l.replace(/^\s*-\s*/, '').trim()
      if (c.startsWith('"')) c = c.substring(1)
      let ai = c.indexOf('" → ')
      if (ai === -1) ai = c.indexOf(' → ')
      if (ai !== -1) {
        let s = c.substring(0, ai).trim()
        if (s.endsWith('"')) s = s.substring(0, s.length - 1)
        return { sentence: s, translation: c.substring(ai + 3).trim() }
      }
      return { sentence: c, translation: '' }
    })
  }

  // Parse note if not caught
  if (!e.note) {
    const nm = block.match(/\*\*note\*\*:\s*(.+)/i)
    if (nm) e.note = nm[1].trim().replace(/^"/, '').replace(/"$/, '')
  }

  entries.push(e)
}

// Build user_terms payloads
const USER_ID = '7112930d-527c-47dc-85f6-1f03a49d603c'
const rows = entries.map(e => ({
  user_id: USER_ID,
  source_text: e.source_text || '',
  normalized_text: e.normalized_text || '',
  source_language: 'en',
  native_language: 'vi',
  item_type: e.item_type || 'word',
  part_of_speech: e.part_of_speech || null,
  ipa: e.ipa || null,
  pronunciation_text: e.pronunciation_text || null,
  meanings: e.meanings || [],
  examples: e.examples || [],
  tags: e.tags || [],
  note: e.note || null,
  translation: e.translation || null,
  status: 'new'
}))

fs.writeFileSync('scripts/toeic_rows.json', JSON.stringify(rows, null, 2), 'utf-8')
console.log(`Parsed ${rows.length} rows. Wrote to scripts/toeic_rows.json`)
