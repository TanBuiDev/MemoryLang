import fs from 'node:fs'

const rows = JSON.parse(fs.readFileSync('scripts/toeic_rows.json', 'utf-8'))
const USER_ID = '7112930d-527c-47dc-85f6-1f03a49d603c'
const BATCH_SIZE = 40

function esc(s) {
  if (s === null || s === undefined) return 'NULL'
  return "'" + String(s).replace(/'/g, "''") + "'"
}

for (let i = 20; i < rows.length; i += BATCH_SIZE) {
  const batch = rows.slice(i, i + BATCH_SIZE)
  const batchNum = Math.floor(i / BATCH_SIZE) + 1

  const tuples = batch.map(r =>
    '(' + esc(USER_ID) + ', ' + esc(r.source_text) + ', ' + esc(r.normalized_text) + ", 'en', 'vi', " +
    esc(r.item_type) + ', ' + esc(r.part_of_speech) + ', ' + esc(r.ipa) + ', ' + esc(r.pronunciation_text) + ', ' +
    "'" + JSON.stringify(r.meanings || []).replace(/'/g, "''") + "'::jsonb, " +
    "'" + JSON.stringify(r.examples || []).replace(/'/g, "''") + "'::jsonb, " +
    'ARRAY[' + (r.tags || []).map(t => "'" + t.replace(/'/g, "''") + "'").join(', ') + '], ' +
    esc(r.note) + ', ' + esc(r.translation) + ", 'new')"
  ).join(',\n')

  const sql = `INSERT INTO public.user_terms (
  user_id, source_text, normalized_text, source_language, native_language,
  item_type, part_of_speech, ipa, pronunciation_text,
  meanings, examples, tags, note, translation, status
) VALUES
${tuples}
ON CONFLICT (user_id, normalized_text) DO NOTHING;`

  const fn = `scripts/batch_${String(batchNum).padStart(2, '0')}.sql`
  fs.writeFileSync(fn, sql, 'utf-8')
  console.log(`Batch ${batchNum}: ${batch.length} entries → ${fn} (${sql.length} chars)`)
}
