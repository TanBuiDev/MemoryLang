import fs from 'node:fs'

const rows = JSON.parse(fs.readFileSync('scripts/toeic_rows.json', 'utf-8'))
const USER_ID = '7112930d-527c-47dc-85f6-1f03a49d603c'

function esc(s) {
  if (!s) return 'NULL'
  return "'" + String(s).replace(/'/g, "''") + "'"
}

const updates = []
for (const r of rows) {
  if ((r.item_type !== 'phrase' && r.item_type !== 'idiom') || !r.ipa) continue
  updates.push(
    `UPDATE public.user_terms SET ipa = ${esc(r.ipa)} ` +
    `WHERE user_id = '${USER_ID}' AND normalized_text = ${esc(r.normalized_text)};`
  )
}

fs.writeFileSync('scripts/restore_ipa.sql', updates.join('\n'), 'utf-8')
console.log(`Generated ${updates.length} IPA restore statements`)

// Batch them into one UPDATE
const cases = updates.map(u => {
  const m = u.match(/SET ipa = '(.+)' WHERE .+normalized_text = '(.+)'/)
  if (!m) return null
  return `WHEN normalized_text = '${m[2].replace(/'/g, "''")}' THEN '${m[1].replace(/'/g, "''")}'`
}).filter(Boolean)

const batchSql = `UPDATE public.user_terms SET ipa = CASE ${cases.join(' ')} END
WHERE user_id = '${USER_ID}' AND normalized_text IN (${[...new Set(rows.filter(r => (r.item_type === 'phrase' || r.item_type === 'idiom') && r.ipa).map(r => esc(r.normalized_text)))].join(', ')})`

fs.writeFileSync('scripts/restore_ipa_batch.sql', batchSql, 'utf-8')
console.log(`Batch SQL: ${batchSql.length} chars`)
