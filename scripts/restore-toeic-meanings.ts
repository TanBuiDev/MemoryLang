import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { normalizeText } from '../src/utils/normalizeText';

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
// Sử dụng service_role key trực tiếp để bypass RLS
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials (URL or Service Role Key) in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

async function run() {
  const files = [
    'docs/ETS_TOEIC_LISTENING_2026.json',
    'docs/ETS_TOEIC_READING_2026.json'
  ];

  const jsonWordsMap = new Map<string, any[]>();

  for (const filePath of files) {
    if (!fs.existsSync(filePath)) {
      console.warn(`File ${filePath} not found, skipping.`);
      continue;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`Loaded ${filePath}. Mapping vocabulary...`);

    if (Array.isArray(data)) {
      // Listening
      for (const item of data) {
        if (!item.source_text) continue;
        const norm = normalizeText(item.source_text);
        if (!jsonWordsMap.has(norm)) {
          jsonWordsMap.set(norm, []);
        }
        if (item.meanings && Array.isArray(item.meanings)) {
          const formatted = item.meanings.map((m: any) => ({
            text: m.text || '',
            translation: m.translation || null,
            part_of_speech: m.part_of_speech || null,
            language: m.language || 'vi',
            examples: m.examples || []
          }));
          jsonWordsMap.get(norm)!.push(...formatted);
        }
      }
    } else {
      // Reading
      for (const [testName, words] of Object.entries(data)) {
        if (!Array.isArray(words)) continue;
        for (const item of words) {
          if (!item.word) continue;
          const norm = normalizeText(item.word);
          if (!jsonWordsMap.has(norm)) {
            jsonWordsMap.set(norm, []);
          }
          if (item.meanings && Array.isArray(item.meanings)) {
            const formatted = item.meanings.map((m: any) => ({
              text: m.definition_vi || '',
              translation: m.definition_vi || null,
              part_of_speech: m.part_of_speech || null,
              language: 'vi',
              examples: m.example ? [{
                sentence: m.example,
                translation: m.example_vi || null
              }] : []
            }));
            jsonWordsMap.get(norm)!.push(...formatted);
          }
        }
      }
    }
  }

  console.log(`Mapped ${jsonWordsMap.size} unique words from JSON files.`);

  const allNormalizedTexts = Array.from(jsonWordsMap.keys());
  const BATCH_SIZE = 50; // Giảm xuống 50 để an toàn hơn
  let restoredCount = 0;

  for (let i = 0; i < allNormalizedTexts.length; i += BATCH_SIZE) {
    const batchTexts = allNormalizedTexts.slice(i, i + BATCH_SIZE);
    
    // Tìm các global_terms trong DB tương ứng
    const { data: terms, error } = await supabase
      .from('global_terms')
      .select('id, source_text, normalized_text')
      .in('normalized_text', batchTexts)
      .eq('source_language', 'en')
      .eq('native_language', 'vi')
      .is('deleted_at', null);

    if (error) {
      console.error("Error fetching global terms:", error);
      continue;
    }

    if (!terms || terms.length === 0) continue;

    for (const term of terms) {
      const sourceNorm = term.normalized_text;
      const jsonMeanings = jsonWordsMap.get(sourceNorm);

      if (jsonMeanings && jsonMeanings.length > 0) {
        const primaryTranslation = jsonMeanings.map(m => m.translation).filter(Boolean).join('; ');
        const allExamples = jsonMeanings.flatMap(m => m.examples || []);

        // Thực hiện CẬP NHẬT CƯỠNG BỨC (FORCE UPDATE) meanings từ file JSON gốc
        const { data: updatedData, error: updateErr } = await supabase
          .from('global_terms')
          .update({
            meanings: jsonMeanings,
            translation: primaryTranslation || null,
            examples: allExamples
          })
          .eq('id', term.id)
          .select('id, source_text');

        if (updateErr) {
          console.error(`Failed to restore meanings for word "${term.source_text}":`, updateErr.message);
        } else if (updatedData && updatedData.length > 0) {
          restoredCount++;
          if (term.source_text === 'a majority of' || term.source_text === 'abrasive') {
            console.log(`[CONFIRMED RESTORED] Word: "${term.source_text}" successfully synced:`, JSON.stringify(jsonMeanings, null, 2));
          }
        }
      }
    }
  }

  console.log("\n========================================");
  console.log(`Force sync completed successfully!`);
  console.log(`Total words synced: ${restoredCount}`);
}

run().catch(console.error);
