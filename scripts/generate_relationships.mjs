import fs from 'node:fs'

const formsData = JSON.parse(fs.readFileSync('scripts/toeic_forms.json', 'utf-8'))
const userTerms = JSON.parse(fs.readFileSync('scripts/toeic_rows.json', 'utf-8'))

const USER_ID = '7112930d-527c-47dc-85f6-1f03a49d603c'

// Build lookup: normalized_text → { id would come from DB, source_text }
// Since we're generating SQL, we need actual DB IDs. We'll use a subquery approach.
// Better: build a mapping of source_text/normalized_text to use in WHERE clauses

// First, get all unique target terms from forms + synonyms
const targetTerms = new Set()
for (const entry of formsData) {
  for (const form of (entry.forms || [])) {
    targetTerms.add(form.text.toLowerCase().trim())
  }
  for (const syn of (entry.synonyms || [])) {
    targetTerms.add(syn.toLowerCase().trim())
  }
}

console.log(`Unique target terms to resolve: ${targetTerms.size}`)
console.log(`Sample targets: ${[...targetTerms].slice(0, 20).join(', ')}`)

// Generate SQL that uses subqueries to resolve IDs
// This avoids needing to know DB IDs upfront

const relationships = []

for (const entry of formsData) {
  // Forms → word-form relationships (noun/verb/adj/adv based on POS)
  for (const form of (entry.forms || [])) {
    const relType = form.relation
    // Map relation types to DB types
    let dbType = null
    if (['noun', 'verb', 'adjective', 'adverb'].includes(relType)) {
      dbType = relType
    } else if (relType === 'related') {
      // "related" is ambiguous - try to infer from context
      // If the source is a noun and related is a noun, skip
      // Otherwise map to noun/verb/adj based on the form name pattern
      const formLower = form.text.toLowerCase()
      if (formLower.endsWith('tion') || formLower.endsWith('sion') || formLower.endsWith('ment') || 
          formLower.endsWith('ness') || formLower.endsWith('ity') || formLower.endsWith('ence') ||
          formLower.endsWith('ance') || formLower.endsWith('er') || formLower.endsWith('or') ||
          formLower.endsWith('ist')) {
        dbType = 'noun'
      } else if (formLower.endsWith('ly')) {
        dbType = 'adverb'
      } else if (formLower.endsWith('ive') || formLower.endsWith('able') || formLower.endsWith('ible') ||
                 formLower.endsWith('al') || formLower.endsWith('ous') || formLower.endsWith('ful') ||
                 formLower.endsWith('less') || formLower.endsWith('ed') || formLower.endsWith('ing')) {
        dbType = 'adjective'
      } else {
        // Default to noun for related forms
        dbType = 'noun'
      }
    }
    
    if (!dbType) continue
    
    relationships.push({
      source_text: entry.normalized_text || entry.source_text,
      target_text: form.text,
      type: dbType
    })
  }

  // Synonyms
  for (const syn of (entry.synonyms || [])) {
    relationships.push({
      source_text: entry.normalized_text || entry.source_text,
      target_text: syn,
      type: 'synonym'
    })
  }
}

console.log(`Total relationships to create: ${relationships.length}`)

// Deduplicate AND filter self-references
const seen = new Set()
const unique = relationships.filter(r => {
  if (r.source_text === r.target_text) return false
  const key = `${r.source_text}|${r.target_text}|${r.type}`
  if (seen.has(key)) return false
  seen.add(key)
  return true
})
console.log(`After dedup + self-ref filter: ${unique.length}`)

// Generate SQL with CTE approach
const sqlHeader = `-- Auto-generated TOEIC relationships

`

const BATCH = 80
const batches = []
for (let i = 0; i < unique.length; i += BATCH) {
  const batch = unique.slice(i, i + BATCH)
  
  // Collect all texts to preload
  const allTexts = new Set()
  for (const r of batch) {
    allTexts.add(r.source_text)
    allTexts.add(r.target_text)
  }
  
  const esc = (s) => `'${(s || '').replace(/'/g, "''")}'`
  const textList = [...allTexts].map(esc).join(', ')
  
  const values = batch.map(r => 
    `(${esc(r.source_text)}, ${esc(r.target_text)}, ${esc(r.type)})`
  ).join(',\n')

  batches.push(`WITH terms AS (
  SELECT id, normalized_text FROM public.user_terms
  WHERE user_id = '${USER_ID}' AND normalized_text IN (${textList})
)
INSERT INTO public.term_relationships (source_id, target_id, relation_type)
SELECT s.id, t.id, rel.rel_type
FROM (VALUES
${values}
) AS rel(source_text, target_text, rel_type)
JOIN terms s ON s.normalized_text = rel.source_text
JOIN terms t ON t.normalized_text = rel.target_text
ON CONFLICT (source_id, target_id, relation_type) DO NOTHING;`)
}

const sql = sqlHeader + batches.join('\n\n')
fs.writeFileSync('scripts/toeic_relationships.sql', sql, 'utf-8')
console.log(`Generated ${batches.length} SQL batches → scripts/toeic_relationships.sql`)
