import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { execSync } from 'child_process'

// Read .env
const envPath = resolve(process.cwd(), '.env')
const envContent = readFileSync(envPath, 'utf-8')
const env: Record<string, string> = {}
for (const line of envContent.split('\n')) {
  const [key, ...rest] = line.split('=')
  if (key && rest.length) env[key.trim()] = rest.join('=').trim()
}

const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseKey = env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

const sb = createClient(supabaseUrl, supabaseKey)

async function main() {
  // Fetch in batches
  const batchSize = 250
  const allRows: Array<{ source_text: string; translation: string }> = []
  
  for (let offset = 0; offset < 1000; offset += batchSize) {
    const { data, error } = await sb
      .from('user_terms')
      .select('source_text, translation')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + batchSize - 1)
    
    if (error) {
      console.error(`Error at offset ${offset}:`, error.message)
      break
    }
    if (!data || data.length === 0) break
    allRows.push(...data)
    console.log(`Fetched ${offset + data.length}/${offset + batchSize}...`)
  }

  console.log(`Total: ${allRows.length} rows`)

  // Save as JSON for Python
  const jsonPath = resolve(process.cwd(), 'scripts', 'vocab_export.json')
  const fs = require('fs')
  fs.writeFileSync(jsonPath, JSON.stringify(allRows, null, 2), 'utf-8')
  console.log(`Saved to ${jsonPath}`)

  // Call Python to generate docx
  console.log('Generating docx...')
  execSync(`python "${resolve(process.cwd(), 'scripts', 'gen_vocab_docx.py')}"`, { stdio: 'inherit' })
}

main().catch(console.error)
