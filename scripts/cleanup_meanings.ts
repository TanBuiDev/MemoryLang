import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (match && match[2]) {
        process.env[match[1]] = match[2].trim();
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchEnglishDefinition(word: string): Promise<Record<string, string> | null> {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (res.status === 404) return null;
    if (!res.ok) {
      console.warn(`[API WARN] Failed to fetch definition for "${word}": ${res.status}`);
      return null;
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const definitionsMap: Record<string, string> = {};
    for (const entry of data) {
      if (!entry.meanings) continue;
      for (const m of entry.meanings) {
        const pos = (m.partOfSpeech || '').toLowerCase();
        if (m.definitions && m.definitions.length > 0) {
          const def = m.definitions[0].definition;
          if (def && !definitionsMap[pos]) {
            definitionsMap[pos] = def;
          }
        }
      }
    }
    return definitionsMap;
  } catch (err: any) {
    console.error(`[API ERROR] Error fetching "${word}":`, err.message);
    return null;
  }
}

function normalizePosForDict(pos: string): string {
  const p = (pos || '').toLowerCase().trim();
  if (p === 'n' || p === 'noun' || p.includes('noun')) return 'noun';
  if (p === 'v' || p === 'verb' || p.includes('verb')) return 'verb';
  if (p === 'adj' || p === 'adjective' || p.includes('adj')) return 'adjective';
  if (p === 'adv' || p === 'adverb' || p.includes('adv')) return 'adverb';
  return p;
}

async function run() {
  console.log("Starting meanings cleanup and English definition enrichment with pagination...");

  let allTerms: any[] = [];
  let page = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('global_terms')
      .select('id, source_text, normalized_text, meanings')
      .eq('source_language', 'en')
      .eq('native_language', 'vi')
      .eq('item_type', 'word')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      console.error("Error fetching global terms:", error.message);
      return;
    }

    if (!data || data.length === 0) break;
    allTerms = allTerms.concat(data);
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  console.log(`Retrieved ${allTerms.length} English terms from database.`);

  let processedCount = 0;
  let updatedCount = 0;

  for (const term of allTerms) {
    const meanings = term.meanings || [];
    let hasDuplicate = false;

    for (const m of meanings) {
      if (m.language === 'vi' && m.text && m.translation && m.text.trim() === m.translation.trim()) {
        hasDuplicate = true;
        break;
      }
    }

    if (!hasDuplicate) continue;

    processedCount++;
    console.log(`[${processedCount}] Processing "${term.source_text}" (ID: ${term.id})...`);

    const definitionsMap = await fetchEnglishDefinition(term.normalized_text);
    await delay(300);

    let meaningsChanged = false;
    const updatedMeanings = meanings.map((m: any) => {
      if (m.language === 'vi' && m.text && m.translation && m.text.trim() === m.translation.trim()) {
        const dictPos = normalizePosForDict(m.part_of_speech || '');
        const englishDef = definitionsMap ? (definitionsMap[dictPos] || Object.values(definitionsMap)[0]) : null;

        if (englishDef) {
          meaningsChanged = true;
          return {
            ...m,
            text: englishDef,
            language: 'en'
          };
        } else {
          meaningsChanged = true;
          return {
            ...m,
            text: ''
          };
        }
      }
      return m;
    });

    if (meaningsChanged) {
      const { error: updateErr } = await supabase
        .from('global_terms')
        .update({ meanings: updatedMeanings })
        .eq('id', term.id);

      if (updateErr) {
        console.error(`Failed to update "${term.source_text}":`, updateErr.message);
      } else {
        updatedCount++;
        console.log(`[UPDATED] "${term.source_text}" successfully cleaned/enriched.`);
      }
    }
  }

  console.log("\n========================================");
  console.log("Cleanup and enrichment complete!");
  console.log(`Total duplicate meanings processed: ${processedCount}`);
  console.log(`Total global_terms updated in DB: ${updatedCount}`);
}

run().catch(console.error);
